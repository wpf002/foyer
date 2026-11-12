import { call, type ModelUsage } from '@foyer/ai';
import { fitBudget, type LowCentsOf } from './budget';
import { CATEGORIES, EFFORT, type Category, type Effort } from './rubric';
import type { BriefEntry } from './intake';
import { briefBlock, critiqueSystemPrompt, roomMessage } from './prompts';
import { enforceDrilling, enforceSafety, enforceTrades, syncSupporting } from './checks';

/** Text-only room description. Phase 2 replaces `description` with the vision read. */
export interface RoomInput {
  name: string;
  type: string;
  widthIn?: number;
  lengthIn?: number;
  ceilingIn?: number;
  fixed: string[];
  movable: string[];
  description: string;
}

export interface CritiqueRec {
  category: Category;
  title: string;
  rationale: string;
  /** questionId of the brief answer that justifies this item. */
  citation: string;
  /** Other answers that also support it, most relevant first. Never repeats `citation`. */
  supporting?: string[];
  preserve?: string;
  effort: Effort;
  needsProReview: boolean;
  proReviewReason?: string;
}

export interface Critique {
  roomRead: string;
  problems: { term: string; category: Category; evidence: string }[];
  recommendations: CritiqueRec[];
  palette: {
    colors: { name: string; role: 'field' | 'trim' | 'accent'; undertone: string }[];
    reasoning: string;
    citations: string[];
  };
  leaveAlone: { element: string; reason: string; citation: string }[];
}

export const CRITIQUE_SCHEMA = {
  type: 'object',
  required: ['roomRead', 'problems', 'recommendations', 'palette', 'leaveAlone'],
  properties: {
    roomRead: { type: 'string' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        required: ['term', 'category', 'evidence'],
        properties: { term: { type: 'string' }, category: { enum: CATEGORIES }, evidence: { type: 'string' } },
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'title', 'rationale', 'citation', 'effort', 'needsProReview'],
        properties: {
          category: { enum: CATEGORIES },
          title: { type: 'string' },
          rationale: { type: 'string' },
          citation: { type: 'string' },
          supporting: { type: 'array', items: { type: 'string' } },
          preserve: { type: 'string' },
          effort: { enum: EFFORT },
          needsProReview: { type: 'boolean' },
          proReviewReason: { type: 'string' },
        },
      },
    },
    palette: {
      type: 'object',
      required: ['colors', 'reasoning', 'citations'],
      properties: {
        colors: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'role', 'undertone'],
            properties: {
              name: { type: 'string' },
              role: { enum: ['field', 'trim', 'accent'] },
              undertone: { type: 'string' },
            },
          },
        },
        reasoning: { type: 'string' },
        citations: { type: 'array', items: { type: 'string' } },
      },
    },
    leaveAlone: {
      type: 'array',
      items: {
        type: 'object',
        required: ['element', 'reason', 'citation'],
        properties: { element: { type: 'string' }, reason: { type: 'string' }, citation: { type: 'string' } },
      },
    },
  },
} as const;

/** Shape errors in a model reply. Empty means the critique is structurally usable. */
export function shapeErrors(v: unknown): string[] {
  const e: string[] = [];
  const o = v as Partial<Critique> | null;
  if (!o || typeof o !== 'object') return ['Critique is not an object'];
  if (typeof o.roomRead !== 'string') e.push('roomRead missing');
  if (!Array.isArray(o.problems)) e.push('problems missing');
  if (!Array.isArray(o.recommendations)) e.push('recommendations missing');
  else
    o.recommendations.forEach((r, i) => {
      if (!CATEGORIES.includes(r?.category)) e.push(`recommendations[${i}].category invalid`);
      if (!EFFORT.includes(r?.effort)) e.push(`recommendations[${i}].effort invalid`);
      if (typeof r?.title !== 'string' || typeof r?.rationale !== 'string') e.push(`recommendations[${i}] missing text`);
      if (typeof r?.needsProReview !== 'boolean') e.push(`recommendations[${i}].needsProReview missing`);
      if (r?.supporting !== undefined && !(Array.isArray(r.supporting) && r.supporting.every((s) => typeof s === 'string')))
        e.push(`recommendations[${i}].supporting invalid`);
    });
  if (!o.palette || !Array.isArray(o.palette.colors)) e.push('palette missing');
  if (!Array.isArray(o.leaveAlone)) e.push('leaveAlone missing');
  return e;
}

export interface CritiqueResult {
  critique: Critique;
  model: string;
  usage: ModelUsage;
}

/**
 * One reasoning-tier call per room. The rubric and the brief are the two
 * cached system blocks; only the room changes between calls on one project.
 */
export async function critiqueRoom(
  brief: BriefEntry[],
  room: RoomInput,
  userId: string,
  /** Prices items so the plan can be cut to the Q13 budget. Omit to skip the cut. */
  lowCentsOf?: LowCentsOf,
): Promise<CritiqueResult> {
  const res = await call<Critique>({
    task: 'design_critique',
    userId,
    system: [
      { text: critiqueSystemPrompt(), cache: true },
      { text: briefBlock(brief), cache: true },
    ],
    messages: [{ role: 'user', content: roomMessage(room) }],
    // Adaptive thinking shares this budget; 16k ran out on photo-merged rooms.
    maxTokens: 32000,
    json: true,
  });
  const errs = shapeErrors(res.parsed);
  if (errs.length) throw new Error(`Critique failed shape check: ${errs.join('; ')}`);
  const enforced = syncSupporting(enforceDrilling(enforceTrades(enforceSafety(res.parsed as Critique)), brief), brief);
  return { critique: lowCentsOf ? fitBudget(enforced, brief, lowCentsOf) : enforced, model: res.model, usage: res.usage };
}
