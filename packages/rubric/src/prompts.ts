import {
  CATEGORY_DEFINITIONS,
  CATEGORY_ORDER,
  CLEARANCES,
  EFFORT_DEFINITIONS,
  PALETTE_RULES,
  PROBLEMS,
  RESTRAINT_RULES,
  RUBRIC_VERSION,
  SAFETY_RULES,
  SCORING_DIMENSIONS,
} from './rubric';
import type { BriefEntry } from './intake';
import type { RoomInput } from './critique';

/**
 * Stable, large, re-sent on every call: mark these cacheable at the model
 * seam. Volatile per-room content goes in the user message, never here.
 */
const list = (xs: readonly string[]) => xs.map((x) => `- ${x}`).join('\n');

export function critiqueSystemPrompt(): string {
  return [
    `You are reading a home the way a working interior designer reads one on a site visit. Rubric ${RUBRIC_VERSION}.`,
    'You get the client brief and one room. You return the critique for that room as JSON.',
    '',
    '## Categories, in output order',
    CATEGORY_ORDER.map((c) => `- ${c}: ${CATEGORY_DEFINITIONS[c]}`).join('\n'),
    '',
    '## Problem vocabulary',
    'Name problems with these terms where they fit. Use your own term only when none fits.',
    PROBLEMS.map((p) => `- ${p.term} (${p.category})`).join('\n'),
    '',
    '## Working clearances (inches)',
    CLEARANCES.map((c) => `- ${c.what}: ${c.minIn}`).join('\n'),
    '',
    '## Effort',
    Object.entries(EFFORT_DEFINITIONS)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    '',
    '## Traceability',
    '- Every recommendation cites exactly one brief questionId (e.g. "Q07") in `citation`. Pick the answer that most directly justifies it.',
    '- The rationale quotes or paraphrases that answer. No citation, no recommendation.',
    '- A leaveAlone citation is the answer that names that element or asks to keep it. Never cite budget or timing for a leave-alone.',
    '',
    '## Palette',
    list(PALETTE_RULES),
    '',
    '## Restraint',
    list(RESTRAINT_RULES),
    '',
    '## Safety',
    list(SAFETY_RULES),
    '',
    '## Writing',
    '- Specific: dimensions, color temperatures in kelvin, mounting heights, named finishes.',
    '- Plain sentences. No marketing language. No render descriptions; this pass is text.',
    '- Titles are short imperatives in Title Case.',
    '',
    '## Output',
    'JSON only, matching:',
    '{ "roomRead": string, "problems": [{ "term", "category", "evidence" }],',
    '  "recommendations": [{ "category", "title", "rationale", "citation", "preserve"?, "effort", "needsProReview", "proReviewReason"? }],',
    '  "palette": { "colors": [{ "name", "role": "field"|"trim"|"accent", "undertone" }], "reasoning", "citations": string[] },',
    '  "leaveAlone": [{ "element", "reason", "citation" }] }',
    'Sort recommendations by category order above, then by impact.',
  ].join('\n');
}

/** The brief as a cacheable block. Stable for every room on a project. */
export function briefBlock(brief: BriefEntry[]): string {
  return [
    '## Client brief',
    ...brief.map((b) => {
      const tags = b.parsed.tags.length ? ` [${b.parsed.tags.join('; ')}]` : '';
      const flags = b.parsed.flags.length ? ` {flags: ${b.parsed.flags.join(', ')}}` : '';
      return `${b.questionId} (${b.section}) ${b.prompt}\n  "${b.raw}"${tags}${flags}`;
    }),
  ].join('\n');
}

const ftin = (n?: number) => (n === undefined ? 'unknown' : `${Math.floor(n / 12)}'${n % 12}"`);

export function roomMessage(room: RoomInput): string {
  return [
    `Room: ${room.name} (${room.type})`,
    `Dimensions: ${ftin(room.widthIn)} x ${ftin(room.lengthIn)}, ceiling ${ftin(room.ceilingIn)}`,
    `Fixed: ${room.fixed.join('; ') || 'none listed'}`,
    `Movable: ${room.movable.join('; ') || 'none listed'}`,
    `Description: ${room.description}`,
    '',
    'Return the critique JSON for this room.',
  ].join('\n');
}

export function judgeSystemPrompt(): string {
  return [
    `You score an interior design critique against rubric ${RUBRIC_VERSION}. Score each dimension 1-5, integers only.`,
    '',
    ...SCORING_DIMENSIONS.map(
      (d) =>
        `${d.key} (${d.label}): ${d.question}\n  1 = ${d.anchors[1]}\n  3 = ${d.anchors[3]}\n  5 = ${d.anchors[5]}`,
    ),
    '',
    'You also get automated check results. They are facts; do not score above what they allow.',
    'A recommendation with no valid brief citation caps traceability at 1.',
    'A definitive structural or permit claim caps safety at 1.',
    '',
    'failures: one line per concrete defect, naming the recommendation title it applies to.',
    'Be a hard marker. A 5 means a designer would send it to a client unedited.',
    '',
    'Return JSON only: { "scores": { "<key>": { "score": number, "reason": string } }, "failures": string[] }.',
  ].join('\n');
}
