import { call } from '@foyer/ai';

/**
 * The 15-question intake. Choice answers are mapped in code and never reach a
 * model. Free-text answers go to the cheap tier in one batched call.
 */

export type Section = 'SPACE' | 'LIFE' | 'AESTHETIC' | 'CONSTRAINTS';

export interface Question {
  id: string;
  section: Section;
  prompt: string;
  choices?: Record<string, ParsedAnswer>;
}

/** Flags the critique and roadmap act on. Closed set so the cheap model can't invent one. */
export const FLAGS = [
  'possible_structural_change',
  'historic_district_unknown',
  'hoa_review',
  'renter',
  'hard_deadline',
  'large_pet',
  'young_children',
  'multigenerational',
  'accessibility_need',
  'hand_measured',
  'no_measurements',
] as const;
export type Flag = (typeof FLAGS)[number];

export interface ParsedAnswer {
  /** 1-5 short noun phrases a designer would write in the margin. */
  tags: string[];
  flags: Flag[];
  budgetLowUsd?: number;
  budgetHighUsd?: number;
  stayYears?: number;
}

export interface RawAnswer {
  questionId: string;
  raw: string;
}

export interface BriefEntry {
  questionId: string;
  section: Section;
  prompt: string;
  raw: string;
  parsed: ParsedAnswer;
}

const p = (tags: string[], flags: Flag[] = [], extra: Partial<ParsedAnswer> = {}): ParsedAnswer => ({
  tags,
  flags,
  ...extra,
});

export const QUESTIONS: Question[] = [
  { id: 'Q01', section: 'SPACE', prompt: 'Which rooms are in scope?' },
  {
    id: 'Q02',
    section: 'SPACE',
    prompt: 'How long do you expect to stay?',
    choices: {
      'Under 3 Years': p(['Under 3 years'], [], { stayYears: 2 }),
      '3 To 7 Years': p(['3-7 years'], [], { stayYears: 5 }),
      '7 To 15 Years': p(['7-15 years'], [], { stayYears: 10 }),
      Longer: p(['15+ years'], [], { stayYears: 15 }),
    },
  },
  { id: 'Q03', section: 'SPACE', prompt: 'What does the house get wrong today?' },
  {
    id: 'Q04',
    section: 'SPACE',
    prompt: 'Do you have dimensions or drawings?',
    choices: {
      'Hand-Measured': p(['Hand-measured'], ['hand_measured']),
      'Architect Drawings': p(['Architect drawings']),
      'Phone Scan': p(['Phone scan']),
      'Nothing Yet': p(['No measurements'], ['no_measurements']),
    },
  },
  { id: 'Q05', section: 'LIFE', prompt: 'Who lives here, and who visits?' },
  { id: 'Q06', section: 'LIFE', prompt: 'Walk me through a weekday evening.' },
  { id: 'Q07', section: 'LIFE', prompt: 'What mood should the space hold?' },
  { id: 'Q08', section: 'LIFE', prompt: 'What do you do here that the room fights?' },
  { id: 'Q09', section: 'AESTHETIC', prompt: "Three rooms you've saved. What do they share?" },
  { id: 'Q10', section: 'AESTHETIC', prompt: 'What stays exactly as it is?' },
  { id: 'Q11', section: 'AESTHETIC', prompt: "Colors or materials you can't live with?" },
  {
    id: 'Q12',
    section: 'AESTHETIC',
    prompt: 'How much visual quiet do you need?',
    choices: {
      'As Little As Possible': p(['Low quiet', 'Display welcome']),
      'Some Display Is Fine': p(['Medium quiet']),
      'A Lot Of Quiet': p(['High quiet', 'Closed storage']),
    },
  },
  { id: 'Q13', section: 'CONSTRAINTS', prompt: 'Budget band, and what is flexible?' },
  { id: 'Q14', section: 'CONSTRAINTS', prompt: 'Timeline and hard dates?' },
  {
    id: 'Q15',
    section: 'CONSTRAINTS',
    prompt: 'Own or rent? HOA or landmark district?',
    choices: {
      'Own, No HOA': p(['Owner', 'No HOA']),
      'Own, With HOA': p(['Owner', 'HOA'], ['hoa_review']),
      'Own, Landmark District': p(['Owner', 'Landmark district'], ['historic_district_unknown']),
      Rent: p(['Renter'], ['renter']),
    },
  },
];

export const MOOD_QUESTION = 'Q07';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

export function question(id: string): Question {
  const q = byId.get(id);
  if (!q) throw new Error(`Unknown intake question ${id}`);
  return q;
}

/** A choice answer that matches an option exactly. Anything else is free text. */
export function choiceParse(questionId: string, raw: string): ParsedAnswer | undefined {
  return question(questionId).choices?.[raw.trim()];
}

export function intakeParseSystemPrompt(): string {
  return [
    'You read a homeowner intake answer and write the margin note an interior designer would.',
    'For each answer return: tags (1-5 noun phrases, under 5 words each, the client\'s substance, no advice),',
    `flags (only from: ${FLAGS.join(', ')}; empty if none apply),`,
    'and budgetLowUsd / budgetHighUsd / stayYears as integers only when the answer states them.',
    'Flag possible_structural_change when the answer implies moving or opening a wall, widening a doorway, or raising a ceiling.',
    'Flag historic_district_unknown when the client is unsure about landmark status.',
    'Never add facts the client did not say.',
    'Return JSON only: { "answers": [ { "questionId": string, "tags": string[], "flags": string[], ... } ] }.',
  ].join('\n');
}

const flagSet = new Set<string>(FLAGS);
const posInt = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);

/** Defensive read of the cheap model's output. Drops anything off-schema. */
export function sanitizeParsed(v: unknown): ParsedAnswer {
  const o = (v ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string').slice(0, 5) : [];
  const flags = Array.isArray(o.flags) ? (o.flags.filter((f) => typeof f === 'string' && flagSet.has(f)) as Flag[]) : [];
  const out: ParsedAnswer = { tags, flags };
  const lo = posInt(o.budgetLowUsd);
  const hi = posInt(o.budgetHighUsd);
  const yrs = posInt(o.stayYears);
  if (lo !== undefined) out.budgetLowUsd = lo;
  if (hi !== undefined) out.budgetHighUsd = hi;
  if (yrs !== undefined) out.stayYears = yrs;
  return out;
}

/**
 * Parse a full intake. Choice answers resolve locally; the rest go to the
 * cheap tier in a single call. Returns entries in question order.
 */
export async function parseIntake(answers: RawAnswer[], userId: string): Promise<BriefEntry[]> {
  const parsed = new Map<string, ParsedAnswer>();
  const free: RawAnswer[] = [];

  for (const a of answers) {
    question(a.questionId);
    if (!a.raw.trim()) continue;
    const c = choiceParse(a.questionId, a.raw);
    if (c) parsed.set(a.questionId, c);
    else free.push(a);
  }

  if (free.length) {
    const res = await call<{ answers: (Record<string, unknown> & { questionId: string })[] }>({
      task: 'parse_intake_answer',
      userId,
      system: [{ text: intakeParseSystemPrompt(), cache: true }],
      messages: [
        {
          role: 'user',
          content: JSON.stringify(
            free.map((a) => ({ questionId: a.questionId, prompt: question(a.questionId).prompt, raw: a.raw })),
          ),
        },
      ],
      maxTokens: 8000,
      json: true,
    });
    for (const r of res.parsed?.answers ?? []) {
      if (free.some((a) => a.questionId === r.questionId)) parsed.set(r.questionId, sanitizeParsed(r));
    }
  }

  return answers
    .filter((a) => a.raw.trim())
    .map((a) => {
      const q = question(a.questionId);
      return {
        questionId: q.id,
        section: q.section,
        prompt: q.prompt,
        raw: a.raw,
        parsed: parsed.get(q.id) ?? { tags: [], flags: [] },
      };
    })
    .sort((a, b) => a.questionId.localeCompare(b.questionId));
}
