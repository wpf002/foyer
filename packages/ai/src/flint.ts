import { modelFor, type Task } from './tiers';
import { ledger } from './spend';

/**
 * Flint client. The only path from this repo to a model provider. No provider
 * key is read here and none is ever sent to a browser: apps/web calls apps/api,
 * apps/api calls Flint, Flint holds the keys.
 */

export interface CacheableBlock {
  text: string;
  /** Mark the rubric and brief: large, stable, and re-sent on every call. */
  cache?: boolean;
}

export interface FlintRequest {
  task: Task;
  userId: string;
  /** System blocks in cache order: stable first, volatile last. */
  system: CacheableBlock[];
  messages: { role: 'user' | 'assistant'; content: string }[];
  images?: { mediaType: string; base64: string }[];
  maxTokens?: number;
  /** JSON Schema the response must satisfy. */
  responseSchema?: unknown;
}

export interface FlintResponse<T = unknown> {
  model: string;
  text: string;
  parsed?: T;
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number; costUsd: number };
}

export class FlintError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'FlintError';
  }
}

const cacheEnabled = () => process.env.FOYER_PROMPT_CACHE !== '0';

export async function call<T = unknown>(req: FlintRequest): Promise<FlintResponse<T>> {
  const baseUrl = process.env.FLINT_BASE_URL;
  const apiKey = process.env.FLINT_API_KEY;
  if (!baseUrl) throw new FlintError('FLINT_BASE_URL is not set', 500);

  const model = modelFor(req.task);

  // Rough pre-flight estimate so the cap can refuse before spending.
  const chars = req.system.reduce((n, b) => n + b.text.length, 0) + JSON.stringify(req.messages).length;
  ledger.assertHeadroom(req.userId, (chars / 4 / 1_000_000) * 15);

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 4096,
      system: req.system.map((b) => ({
        type: 'text',
        text: b.text,
        ...(b.cache && cacheEnabled() ? { cache_control: { type: 'ephemeral' } } : {}),
      })),
      messages: req.messages,
      ...(req.images?.length ? { images: req.images } : {}),
      ...(req.responseSchema ? { response_schema: req.responseSchema } : {}),
      metadata: { user_id: req.userId, task: req.task },
    }),
  });

  if (!res.ok) throw new FlintError(`Flint ${res.status}: ${await res.text()}`, res.status);

  const body = (await res.json()) as FlintResponse<T>;
  ledger.record(req.userId, body.usage?.costUsd ?? 0);
  return body;
}
