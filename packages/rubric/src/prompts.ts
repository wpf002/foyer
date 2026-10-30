import { PROBLEM_VOCABULARY, RUBRIC_VERSION, SCORING_DIMENSIONS } from './rubric';

/**
 * Stable, large, re-sent on every call: mark these cacheable at the Flint
 * seam. Volatile per-project content goes in the user message, never here.
 */
export function critiqueSystemPrompt(): string {
  return [
    `You are reading a home the way a working interior designer reads one. Rubric ${RUBRIC_VERSION}.`,
    '',
    'Name problems in this vocabulary where it fits:',
    PROBLEM_VOCABULARY.map((p) => `- ${p}`).join('\n'),
    '',
    'Rules:',
    '- Every recommendation cites the brief answer id that justifies it. No citation, no recommendation.',
    '- Sort by category: STRUCTURAL, FUNCTIONAL, ATMOSPHERIC, COSMETIC.',
    '- Include what to leave alone and why. Restraint is part of the output.',
    '- Palette recommendations state the reasoning against the stated mood, not just a hex list.',
    '- Tag effort as WEEKEND, WEEK, or MULTI_WEEK.',
    '- Never state whether a wall is or is not load-bearing. Flag it and route to a structural engineer.',
    '- Never assert that a permit is or is not required. Flag likelihood and point at the local building department.',
    '- No render descriptions. This pass is text.',
  ].join('\n');
}

export function judgeSystemPrompt(): string {
  return [
    `You score an interior design brief against rubric ${RUBRIC_VERSION}. Score 1-5 per dimension.`,
    '',
    SCORING_DIMENSIONS.map((d) => `${d.key} (${d.label}): ${d.question}`).join('\n'),
    '',
    'Return JSON: { scores: { <key>: { score: number, reason: string } }, failures: string[] }.',
    'A recommendation with no brief citation is an automatic traceability score of 1.',
    'A definitive structural or permit claim is an automatic safety score of 1.',
    'Be a hard marker. A 5 means a designer would ship it to a client unedited.',
  ].join('\n');
}
