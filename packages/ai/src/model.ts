import Anthropic from '@anthropic-ai/sdk';
import { modelFor, tierFor, type Task, type Tier } from './tiers';
import { ledger } from './spend';

/**
 * Claude client. The only path from this repo to a model. Runs server-side
 * only (apps/api, eval); ANTHROPIC_API_KEY is never read by apps/web and never
 * reaches a browser.
 */

export interface CacheableBlock {
  text: string;
  /** Mark the rubric and brief: large, stable, and re-sent on every call. */
  cache?: boolean;
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelRequest {
  task: Task;
  userId: string;
  /** System blocks in cache order: stable first, volatile last. */
  system: CacheableBlock[];
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  effort?: Effort;
  /** Reply must be JSON; parsed into `parsed`. */
  json?: boolean;
}

export interface ModelUsage {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ModelResponse<T = unknown> {
  model: string;
  text: string;
  parsed?: T;
  usage: ModelUsage;
}

export class ModelError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ModelError';
  }
}

/** Sends a built request body. Swapped in tests so nothing leaves the process. */
export type Transport = (body: Record<string, unknown>, tier: Tier) => Promise<ModelResponse>;

const cacheEnabled = () => process.env.FOYER_PROMPT_CACHE !== '0';

/** USD per million tokens, from Anthropic's list prices. Override with FOYER_PRICE_<TIER>_IN / _OUT. */
const DEFAULT_PRICE: Record<Tier, { in: number; out: number }> = {
  cheap: { in: 0.1, out: 0.5 }, // claude-haiku-5-5
  judge: { in: 2, out: 10 }, // claude-sonnet-5-5
  reasoning: { in: 4, out: 20 }, // claude-opus-5-5
  vision: { in: 4, out: 20 },
};

export function priceFor(tier: Tier): { in: number; out: number } {
  const env = (k: string) => Number(process.env[`FOYER_PRICE_${tier.toUpperCase()}_${k}`]);
  const d = DEFAULT_PRICE[tier];
  const i = env('IN');
  const o = env('OUT');
  return { in: Number.isFinite(i) && i > 0 ? i : d.in, out: Number.isFinite(o) && o > 0 ? o : d.out };
}

export function estimateCostUsd(task: Task, inputChars: number, outputTokens: number): number {
  const p = priceFor(tierFor(task));
  return ((inputChars / 4) * p.in + outputTokens * p.out) / 1_000_000;
}

/** Cache writes bill at 1.25x input, cache reads at 0.1x. */
export function costFromUsage(tier: Tier, u: Omit<ModelUsage, 'costUsd'>): number {
  const p = priceFor(tier);
  const input = u.inputTokens + u.cacheWriteTokens * 1.25 + u.cachedInputTokens * 0.1;
  return (input * p.in + u.outputTokens * p.out) / 1_000_000;
}

export function buildBody(req: ModelRequest): Record<string, unknown> {
  const tier = tierFor(req.task);
  const model = modelFor(req.task);
  return {
    model,
    max_tokens: req.maxTokens ?? 16_000,
    system: req.system.map((b) => ({
      type: 'text',
      text: b.text,
      ...(b.cache && cacheEnabled() ? { cache_control: { type: 'ephemeral' } } : {}),
    })),
    messages: req.messages,
    // Haiku parses short answers: thinking off. Other tiers think adaptively.
    ...(tier === 'cheap' ? { thinking: { type: 'disabled' } } : {}),
    ...(req.effort ? { output_config: { effort: req.effort } } : {}),
    // Server-side refusal fallback; not offered for Haiku.
    ...(model.includes('haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
    metadata: { user_id: req.userId },
  };
}

let client: Anthropic | undefined;

const claudeTransport: Transport = async (body, tier) => {
  client ??= new Anthropic();
  let msg: Anthropic.Beta.BetaMessage;
  try {
    msg = await client.beta.messages.create(body as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new ModelError(`Claude ${e.status}: ${e.message}`, e.status ?? 500);
    throw e;
  }

  if (msg.stop_reason === 'refusal') throw new ModelError(`Claude refused (${msg.stop_details?.category ?? 'unknown'})`, 422);
  if (msg.stop_reason === 'max_tokens') throw new ModelError(`Reply hit max_tokens (${String(body.max_tokens)})`, 502);

  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const usage = {
    inputTokens: msg.usage.input_tokens,
    cachedInputTokens: msg.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
    outputTokens: msg.usage.output_tokens,
  };
  return { model: msg.model, text, usage: { ...usage, costUsd: costFromUsage(tier, usage) } };
};

let transport: Transport = claudeTransport;

/** Test seam. Pass undefined to restore the Claude transport. */
export function setTransport(t: Transport | undefined): void {
  transport = t ?? claudeTransport;
}

/** Pulls the first JSON object or array out of a model reply, fenced or bare. */
export function extractJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1];
  const src = (fenced ?? text).trim();
  const start = src.search(/[[{]/);
  if (start < 0) throw new ModelError('Model reply has no JSON', 502);
  const open = src[start];
  const close = open === '{' ? '}' : ']';
  const end = src.lastIndexOf(close);
  try {
    return JSON.parse(src.slice(start, end + 1)) as T;
  } catch {
    throw new ModelError('Model reply is not valid JSON', 502);
  }
}

export async function call<T = unknown>(req: ModelRequest): Promise<ModelResponse<T>> {
  const body = buildBody(req);

  // Worst-case pre-flight estimate so the cap refuses before spending.
  const chars = req.system.reduce((n, b) => n + b.text.length, 0) + JSON.stringify(req.messages).length;
  ledger.assertHeadroom(req.userId, estimateCostUsd(req.task, chars, body.max_tokens as number));

  const res = (await transport(body, tierFor(req.task))) as ModelResponse<T>;
  ledger.record(req.userId, res.usage?.costUsd ?? 0);
  if (res.parsed === undefined && req.json) res.parsed = extractJson<T>(res.text);
  return res;
}
