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
    '- Every recommendation cites one brief questionId (e.g. "Q07") in `citation`: the answer that most directly justifies it.',
    '- List every other answer that also supports the item in `supporting`, most relevant first. Budget, renter, timing, and household answers that shape the item belong there. Leave it empty rather than pad it.',
    '- The rationale quotes or paraphrases that answer. No citation, no recommendation.',
    '- A leaveAlone citation is the answer that names that element or asks to keep it. Never cite budget or timing for a leave-alone.',
    '- Cite the answer a designer would point to if the client asked "why?". A general answer (household, rooms, goals) is a last resort, not a catch-all.',
    '- The cited answer names the element, the complaint, or the constraint the item fixes. Check its text before citing it.',
    '- A mood or style answer ("cozy", "lodge", "restful") supports palette, finish, and light color only. It never justifies a rug, a repaint of a sound wall, furniture, or a layout change on its own.',
    '- No answer is the citation for more than three recommendations. Past that, find the specific answer for each or drop items.',
    '- The rationale says how each supporting answer bears on the item, by id (e.g. "renter, per Q15").',
    '- Every problem in roomRead traces to a brief answer id or to something visible in the photos. Say which.',
    '- If no answer directly supports an item, drop the item.',
    '- Before finishing each item, walk Q01 to Q15 and put every answer the item uses into `supporting`, named by id in the rationale: kept or protected elements (Q10), stated cost or budget (Q13), a deadline it meets (Q14), renter, landlord or HOA limits (Q15), measurements it relies on (Q04), household members it serves (Q05), mood or saved rooms its finish follows (Q07, Q09). An answer the rationale does not use stays out.',
    '- Mention an HOA, landlord or historic district only when Q15 says one exists.',
    '',
    '## Palette',
    list(PALETTE_RULES),
    '',
    '## Restraint',
    list(RESTRAINT_RULES),
    '',
    '## Safety',
    list([
      ...SAFETY_RULES,
      'Never presume what the engineer will specify. Say "whatever support the engineer specifies", never "a beam" or a header size.',
      'Every fixed element marked unconfirmed (load path, material, wiring) gets a sentence in roomRead naming who confirms it, even when no item touches it.',
      'Before any ceiling hook or overhead fastening, say to check for smoke detectors, wiring and fixtures nearby.',
    ]),
    '',
    '## Writing',
    '- Specific: dimensions, color temperatures in kelvin, mounting heights, named finishes.',
    '- Plain sentences. No marketing language. No render descriptions; this pass is text.',
    '- Titles are short imperatives in Title Case.',
    '',
    '## Output',
    'JSON only, matching:',
    '{ "roomRead": string, "problems": [{ "term", "category", "evidence" }],',
    '  "recommendations": [{ "category", "title", "rationale", "citation", "supporting"?: string[], "preserve"?, "effort", "needsProReview", "proReviewReason"? }],',
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
    'traceability and safety are set by the automated checks. Score them anyway; your score is kept as advisory and your failures still count.',
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
