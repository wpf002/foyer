import { call, type ModelUsage } from '@foyer/ai';
import {
  CATEGORIES,
  CATEGORY_DEFINITIONS,
  CATEGORY_ORDER,
  EFFORT,
  EFFORT_DEFINITIONS,
  RESTRAINT_RULES,
  SAFETY_RULES,
  type Category,
  type Effort,
} from './rubric';
import type { BriefEntry } from './intake';
import type { RoomInput } from './critique';
import { briefBlock } from './prompts';

/**
 * Project chat. The homeowner talks to a designer who has read the brief,
 * every room, and the current plan. The designer answers in prose and can
 * edit the plan; the API applies only the edits that pass `sanitizeChanges`.
 */

export const CHAT_HISTORY_TURNS = 20;
export const CHAT_MESSAGE_MAX_CHARS = 4000;
const TITLE_MAX_CHARS = 120;
const RATIONALE_MAX_CHARS = 2000;
const MAX_CHANGES_PER_TURN = 12;

export interface ChatRec {
  id: string;
  roomId: string | null;
  category: Category;
  title: string;
  rationale: string;
  citation: string;
  effort: Effort;
  needsProReview: boolean;
  /** Cost range in whole dollars, when priced. */
  costUsd?: { low: number; high: number };
}

export interface ChatRoom extends RoomInput {
  id: string;
  roomRead?: string;
}

export interface ChatContext {
  brief: BriefEntry[];
  rooms: ChatRoom[];
  recommendations: ChatRec[];
}

export type ChatChange =
  | {
      op: 'add';
      roomId: string;
      category: Category;
      title: string;
      rationale: string;
      citation: string;
      effort: Effort;
      needsProReview: boolean;
    }
  | { op: 'remove'; recId: string }
  | { op: 'update'; recId: string; title?: string; rationale?: string; effort?: Effort; category?: Category };

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredChatMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: Date;
}

/**
 * A user message and its reply are saved in one transaction and share a
 * timestamp, so ties break with the user's turn first.
 */
export function chatHistory(stored: StoredChatMessage[], message: string): ChatTurn[] {
  const ordered = [...stored].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.role === b.role ? 0 : a.role === 'USER' ? -1 : 1),
  );
  const turns: ChatTurn[] = [
    ...ordered.slice(-(CHAT_HISTORY_TURNS - 1)).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    })),
    { role: 'user', content: message },
  ];
  // The API requires the first turn to be the user's.
  while (turns[0]?.role === 'assistant') turns.shift();
  return turns;
}

export function chatSystemPrompt(): string {
  return [
    'You are the interior designer on this project, talking with the homeowner. You have read their brief, every room, and the current plan.',
    'Answer the way a working designer would in conversation: direct, specific, practical. Give dimensions, kelvin, mounting heights, finishes and rough costs when they help.',
    'Answer general renovation questions too. Ground them in this house and this brief when you can.',
    'Keep replies short unless the homeowner asks for detail. Plain text, no markdown headings.',
    '',
    '## Editing the plan',
    'When the homeowner asks to add, drop or change something, or agrees to a suggestion you made, put the edit in `changes`. Otherwise `changes` is empty.',
    'Never edit the plan on your own initiative. Suggest first; edit when they say yes.',
    'Every added item cites one brief questionId (e.g. "Q03") that justifies it. If none fits, say so and do not add it.',
    'Use recommendation ids and room ids exactly as listed in the project state.',
    '',
    '## Categories',
    CATEGORY_ORDER.map((c) => `- ${c}: ${CATEGORY_DEFINITIONS[c]}`).join('\n'),
    '',
    '## Effort',
    Object.entries(EFFORT_DEFINITIONS)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    '',
    '## Restraint',
    ...RESTRAINT_RULES.map((r) => `- ${r}`),
    '- If the brief says nothing bugs them, do not invent problems. Answer what they ask.',
    '- Respect what the brief says stays.',
    '',
    '## Safety',
    ...SAFETY_RULES.map((r) => `- ${r}`),
    '- needsProReview is true only for structure, wiring, plumbing, gas, or load. Plug-in and hand-hung items do not need a pro.',
    '- Mention an HOA, landlord or historic district only when the brief says one exists.',
    '- Never quote a price as firm. Costs are ranges.',
    '',
    '## Output',
    'JSON only:',
    '{ "reply": string, "changes": [',
    '  { "op": "add", "roomId", "category", "title", "rationale", "citation", "effort", "needsProReview" }',
    '  | { "op": "remove", "recId" }',
    '  | { "op": "update", "recId", "title"?, "rationale"?, "effort"?, "category"? } ] }',
    'Titles are short imperatives in Title Case.',
  ].join('\n');
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Rooms and the current plan. Changes only when the plan does. */
export function projectStateBlock(ctx: Pick<ChatContext, 'rooms' | 'recommendations'>): string {
  const rooms = ctx.rooms.map((r) => {
    const recs = ctx.recommendations.filter((x) => x.roomId === r.id);
    return [
      `### Room ${r.id}: ${r.name} (${r.type})`,
      `Fixed: ${r.fixed.join('; ') || 'none listed'}`,
      `Movable: ${r.movable.join('; ') || 'none listed'}`,
      `Description: ${r.description || 'none'}`,
      r.roomRead ? `Designer read: ${r.roomRead}` : '',
      'Plan:',
      recs.length
        ? recs
            .map(
              (x) =>
                `- [${x.id}] ${x.category} · ${x.title} (cites ${x.citation}, ${x.effort}${x.needsProReview ? ', pro review' : ''}${
                  x.costUsd ? `, ${usd(x.costUsd.low)}-${usd(x.costUsd.high)}` : ''
                })\n  ${x.rationale.replace(/\s+/g, ' ')}`,
            )
            .join('\n')
        : '- nothing yet',
    ]
      .filter(Boolean)
      .join('\n');
  });
  return ['## Project state', ...rooms].join('\n\n');
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
const oneOf = <T extends string>(v: unknown, xs: readonly T[]): T | undefined =>
  typeof v === 'string' && (xs as readonly string[]).includes(v.trim().toUpperCase()) ? (v.trim().toUpperCase() as T) : undefined;

export interface ChangeScope {
  roomIds: ReadonlySet<string>;
  recIds: ReadonlySet<string>;
  questionIds: ReadonlySet<string>;
}

/**
 * Defensive read of the model's edits. Drops anything that names an unknown
 * room, recommendation or brief answer, or that is missing a required field.
 */
export function sanitizeChanges(v: unknown, scope: ChangeScope): ChatChange[] {
  if (!Array.isArray(v)) return [];
  const out: ChatChange[] = [];
  const touched = new Set<string>();
  for (const raw of v.slice(0, MAX_CHANGES_PER_TURN)) {
    const o = (raw ?? {}) as Record<string, unknown>;
    if (o.op === 'add') {
      const roomId = str(o.roomId, 64);
      const category = oneOf(o.category, CATEGORIES);
      const effort = oneOf(o.effort, EFFORT);
      const citation = str(o.citation, 8)?.toUpperCase();
      const title = str(o.title, TITLE_MAX_CHARS);
      const rationale = str(o.rationale, RATIONALE_MAX_CHARS);
      if (!roomId || !scope.roomIds.has(roomId) || !category || !effort || !title || !rationale) continue;
      if (!citation || !scope.questionIds.has(citation)) continue;
      out.push({ op: 'add', roomId, category, title, rationale, citation, effort, needsProReview: o.needsProReview === true });
    } else if (o.op === 'remove' || o.op === 'update') {
      const recId = str(o.recId, 64);
      if (!recId || !scope.recIds.has(recId) || touched.has(recId)) continue;
      touched.add(recId);
      if (o.op === 'remove') {
        out.push({ op: 'remove', recId });
        continue;
      }
      const update: Extract<ChatChange, { op: 'update' }> = { op: 'update', recId };
      const title = str(o.title, TITLE_MAX_CHARS);
      const rationale = str(o.rationale, RATIONALE_MAX_CHARS);
      const effort = oneOf(o.effort, EFFORT);
      const category = oneOf(o.category, CATEGORIES);
      if (title) update.title = title;
      if (rationale) update.rationale = rationale;
      if (effort) update.effort = effort;
      if (category) update.category = category;
      if (Object.keys(update).length > 2) out.push(update);
    }
  }
  return out;
}

export interface ChatResult {
  reply: string;
  changes: ChatChange[];
  model: string;
  usage: ModelUsage;
}

export async function chatReply(ctx: ChatContext, history: ChatTurn[], userId: string): Promise<ChatResult> {
  const res = await call<{ reply?: unknown; changes?: unknown }>({
    task: 'design_chat',
    userId,
    system: [
      { text: chatSystemPrompt(), cache: true },
      { text: briefBlock(ctx.brief), cache: true },
      { text: projectStateBlock(ctx), cache: true },
    ],
    messages: history.slice(-CHAT_HISTORY_TURNS),
    maxTokens: 16000,
    effort: 'medium',
    json: true,
  });
  const reply = typeof res.parsed?.reply === 'string' ? res.parsed.reply.trim() : '';
  if (!reply) throw new Error('Chat reply was empty');
  const changes = sanitizeChanges(res.parsed?.changes, {
    roomIds: new Set(ctx.rooms.map((r) => r.id)),
    recIds: new Set(ctx.recommendations.map((r) => r.id)),
    questionIds: new Set(ctx.brief.map((b) => b.questionId)),
  });
  return { reply, changes, model: res.model, usage: res.usage };
}
