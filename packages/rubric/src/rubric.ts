/**
 * The design-critique rubric. This file is the product's credibility, so it
 * is versioned content, not prose inside a prompt string literal. Changing it
 * changes the eval baseline — bump VERSION and rerun the golden set.
 */
export const RUBRIC_VERSION = '0.1.0';

export const CATEGORIES = ['STRUCTURAL', 'COSMETIC', 'FUNCTIONAL', 'ATMOSPHERIC'] as const;
export type Category = (typeof CATEGORIES)[number];

/** The problems a working designer actually names when reading a room. */
export const PROBLEM_VOCABULARY = [
  'reads dark',
  'reads cramped',
  'circulation is blocked',
  'no focal point',
  'single light source',
  'scale mismatch',
  'furniture pushed to walls',
  'finish palette is dated',
  'competing wood tones',
  'ceiling reads low',
  'sightline terminates on clutter',
  'no transition between zones',
  'storage is adjacent to the wrong activity',
  'window treatment cuts the glass',
] as const;

export const SCORING_DIMENSIONS = [
  {
    key: 'relevance',
    label: 'Relevance',
    question: 'Does every recommendation answer something the brief actually said?',
  },
  {
    key: 'specificity',
    label: 'Specificity',
    question: 'Named materials, dimensions, and placements, or generic advice?',
  },
  {
    key: 'traceability',
    label: 'Traceability',
    question: 'Can each recommendation be followed back to a cited brief answer?',
  },
  {
    key: 'credibility',
    label: 'Designer Credibility',
    question: 'Would a working designer put their name on this?',
  },
  {
    key: 'restraint',
    label: 'Restraint',
    question: 'Does it say what to leave alone, and resist redesigning everything?',
  },
  {
    key: 'safety',
    label: 'Safety Discipline',
    question: 'Are structural and permit claims routed to a professional, never asserted?',
  },
] as const;

export type DimensionKey = (typeof SCORING_DIMENSIONS)[number]['key'];

/** Mean score the golden set must clear before any UI work proceeds. */
export const PASS_THRESHOLD = 4.0;

/** Any dimension below this fails the run regardless of the mean. */
export const FLOOR_PER_DIMENSION: Partial<Record<DimensionKey, number>> = {
  safety: 5.0,
  traceability: 4.5,
};
