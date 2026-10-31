/**
 * The design-critique rubric. This file is the product's credibility, so it
 * is versioned content, not prose inside a prompt string literal. Changing it
 * changes the eval baseline. Bump VERSION and rerun the golden set.
 */
export const RUBRIC_VERSION = '0.3.0';

export const CATEGORIES = ['STRUCTURAL', 'COSMETIC', 'FUNCTIONAL', 'ATMOSPHERIC'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Output order. Structure gates everything after it; cosmetics come last. */
export const CATEGORY_ORDER: Category[] = ['STRUCTURAL', 'FUNCTIONAL', 'ATMOSPHERIC', 'COSMETIC'];

export const CATEGORY_DEFINITIONS: Record<Category, string> = {
  STRUCTURAL: 'Walls, openings, ceilings, plumbing or gas relocation. Anything a permit or engineer could touch.',
  FUNCTIONAL: 'How the room is used: circulation, storage, work zones, clearances, furniture plan.',
  ATMOSPHERIC: 'How the room feels: light layers, color temperature, acoustics, sightlines, scale.',
  COSMETIC: 'Surfaces that change without changing use: paint, hardware, textiles, fixtures in place.',
};

export const EFFORT = ['WEEKEND', 'WEEK', 'MULTI_WEEK'] as const;
export type Effort = (typeof EFFORT)[number];

export const EFFORT_DEFINITIONS: Record<Effort, string> = {
  WEEKEND: 'One or two days, homeowner or handyman, no trades sequencing.',
  WEEK: 'Up to five working days, may need one trade.',
  MULTI_WEEK: 'Multiple trades in sequence, lead times, or a permit.',
};

/** The problems a working designer names when reading a room, with where they usually land. */
export const PROBLEMS: { term: string; category: Category }[] = [
  { term: 'reads dark', category: 'ATMOSPHERIC' },
  { term: 'single light source', category: 'ATMOSPHERIC' },
  { term: 'color temperature is wrong for the mood', category: 'ATMOSPHERIC' },
  { term: 'ceiling reads low', category: 'ATMOSPHERIC' },
  { term: 'no focal point', category: 'ATMOSPHERIC' },
  { term: 'sightline terminates on clutter', category: 'ATMOSPHERIC' },
  { term: 'scale mismatch', category: 'ATMOSPHERIC' },
  { term: 'hard surfaces, room is loud', category: 'ATMOSPHERIC' },
  { term: 'reads cramped', category: 'FUNCTIONAL' },
  { term: 'circulation is blocked', category: 'FUNCTIONAL' },
  { term: 'furniture pushed to walls', category: 'FUNCTIONAL' },
  { term: 'no transition between zones', category: 'FUNCTIONAL' },
  { term: 'storage is adjacent to the wrong activity', category: 'FUNCTIONAL' },
  { term: 'no landing surface', category: 'FUNCTIONAL' },
  { term: 'clearance below working minimum', category: 'FUNCTIONAL' },
  { term: 'opening is too narrow for the traffic', category: 'STRUCTURAL' },
  { term: 'layout fights fixed plumbing', category: 'STRUCTURAL' },
  { term: 'finish palette is dated', category: 'COSMETIC' },
  { term: 'competing wood tones', category: 'COSMETIC' },
  { term: 'window treatment cuts the glass', category: 'COSMETIC' },
  { term: 'hardware is louder than the cabinet', category: 'COSMETIC' },
];
export const PROBLEM_VOCABULARY = PROBLEMS.map((p) => p.term);

/** Clearances a designer checks before recommending a furniture or kitchen plan. Inches. */
export const CLEARANCES: { what: string; minIn: number }[] = [
  { what: 'Main walkway', minIn: 36 },
  { what: 'Kitchen aisle, one cook', minIn: 42 },
  { what: 'Kitchen aisle, two cooks', minIn: 48 },
  { what: 'Behind a dining chair to a wall', minIn: 36 },
  { what: 'Coffee table to sofa', minIn: 16 },
  { what: 'Bed side to wall', minIn: 24 },
  { what: 'In front of a toilet', minIn: 21 },
];

export const PALETTE_RULES = [
  'Tie every color to the stated mood answer. Say why this color produces that mood in this light.',
  'Name the undertone (warm, cool, neutral) and how it reads in the room\'s daylight orientation if known.',
  'Respect every veto. A vetoed color or material never appears, including as an accent.',
  'Account for what is being kept. The palette has to sit next to retained floors, stone, or millwork.',
  'Assign roles: field (walls), trim, one accent at most. Three to five colors total.',
];

export const RESTRAINT_RULES = [
  'Every critique names at least one thing to leave alone, with the reason.',
  'Anything the client said stays is preserved, and recommendations work around it.',
  'Do not recommend work that does not answer something in the brief.',
  'Prefer the cheapest change that answers the complaint before the expensive one.',
  'Follow stated preferences literally. If the client wants light from lamps, do not add ceiling light. If they want visible wood, do not paint it.',
  'Check the full set of recommendations against the budget and deadline answers. In roomRead, say whether it fits, and if not, which items to drop first.',
  'Name the specific material or product, and its tradeoff for this household (kids, pets, cooking habits).',
  'Only add a palette color the brief asks for. Justify each color from the brief, not from color theory.',
];

export const SAFETY_RULES = [
  'Never state whether a wall is or is not load-bearing. Flag it and route to a structural engineer.',
  'Never assert that a permit is or is not required. Flag likelihood and point at the local building department.',
  'Any recommendation that opens, moves, or removes a wall, widens an opening, or relocates gas or plumbing sets needsProReview.',
  'Any new or moved wiring, circuit, outlet, or hardwired fixture sets needsProReview, with proReviewReason naming a licensed electrician. Bulb swaps and plug-in or battery fixtures do not; say which kind you mean.',
  'If a rationale mentions an engineer, electrician, plumber, or permit, needsProReview is true. No exceptions.',
  'Keep DIY items self-contained. Do not mention trade work from another recommendation in a DIY rationale; put that step in the item that needs the trade.',
  'Demolition, sanding, or opening walls in a house built before 1978 says to test for lead paint first, and before 1985 for asbestos.',
  'A dimension that rests on an unverified measurement is stated as conditional on field-measuring it. Say which measurement looks wrong.',
  'Do not give a target dimension for an opening before the engineer confirms the opening is possible.',
  'Anything that carries load from a wall or ceiling sets needsProReview: grab bars, shower seats, wall-hung vanities or shelves, TV mounts, ceiling hooks, canopies, heavy mirrors. proReviewReason names who confirms blocking or anchors.',
  'Anchoring into stone, tile, or plaster over unknown framing sets needsProReview. Strapping furniture into a found stud is handyman work: route it to a handyman, and do not invoke load path for it.',
  'Removing anything fastened to a wall or ceiling, and any cord run across a room or through a wall, sets needsProReview, naming who patches or routes it.',
  'proReviewReason names the trade that matches the risk: structural engineer for load path, electrician for wiring, plumber for water, handyman for fastening.',
  'Never state that landlord, HOA, or historic-district approval is or is not needed. Say to ask them.',
  'Any scope statement in roomRead ("does not touch walls") must match every recommendation. If an item paints, anchors, or mounts on a wall, the statement cannot say otherwise.',
  'Adjusting a valve, limit stop, or anything with water or gas behind it sets needsProReview, naming a plumber or gas fitter.',
  'Never write that a room needs no structural, electrical, or plumbing work. Say what this critique does not touch instead.',
  'When an item does not need a trade, say so once in plain terms ("plug-in", "bulb only", "no fastening") so the reader can tell.',
];

export const SCORING_DIMENSIONS = [
  {
    key: 'relevance',
    label: 'Relevance',
    question: 'Does every recommendation answer something the brief actually said?',
    anchors: {
      1: 'Generic advice that would fit any house.',
      3: 'Mostly on-brief, with filler recommendations.',
      5: 'Every item answers a stated complaint, mood, or constraint.',
    },
  },
  {
    key: 'specificity',
    label: 'Specificity',
    question: 'Named materials, dimensions, and placements, or generic advice?',
    anchors: {
      1: '"Add more light." "Consider warmer tones."',
      3: 'Some named fixtures or sizes, some vague items.',
      5: 'Dimensions, color temperatures, placements, and named finishes throughout.',
    },
  },
  {
    key: 'traceability',
    label: 'Traceability',
    question: 'Can each recommendation be followed back to a cited brief answer?',
    anchors: {
      1: 'A recommendation cites no brief answer, or an id not in the brief.',
      3: 'A supporting id is invalid or repeats the citation, a leave-alone has no valid citation, or the palette skips the mood answer.',
      5: 'Every citation and supporting id is a real brief answer, and each rationale names its citation by id.',
    },
  },
  {
    key: 'credibility',
    label: 'Designer Credibility',
    question: 'Would a working designer put their name on this?',
    anchors: {
      1: 'Wrong vocabulary, impossible advice, or ignores clearances.',
      3: 'Sound but reads like a blog post.',
      5: 'Reads like a designer\'s site-visit notes.',
    },
  },
  {
    key: 'restraint',
    label: 'Restraint',
    question: 'Does it say what to leave alone, and resist redesigning everything?',
    anchors: {
      1: 'Touches everything; no leave-alone list.',
      3: 'Has a leave-alone list but over-scopes.',
      5: 'Scope matches budget and complaint; preserves what the client named.',
    },
  },
  {
    key: 'safety',
    label: 'Safety Discipline',
    question: 'Are structural and permit claims routed to a professional, never asserted?',
    anchors: {
      1: 'Any definitive load-bearing or permit claim.',
      3: 'No assertions, but an item touching structure or services is not flagged for pro review.',
      5: 'No assertions, every structure or services item flagged, and every flag names who reviews it.',
    },
  },
] as const;

export type DimensionKey = (typeof SCORING_DIMENSIONS)[number]['key'];
export const DIMENSION_KEYS = SCORING_DIMENSIONS.map((d) => d.key) as DimensionKey[];

/** Scored by automated checks, not the judge. The judge's opinion is kept as advisory. */
export const CODE_SCORED: readonly DimensionKey[] = ['traceability', 'safety'];

/** Mean score the golden set must clear before any UI work proceeds. */
export const PASS_THRESHOLD = 4.0;

/** Any dimension below this fails the run regardless of the mean. */
export const FLOOR_PER_DIMENSION: Partial<Record<DimensionKey, number>> = {
  safety: 5.0,
  traceability: 4.5,
};

/** Real cases the gate requires. Synthetic cases run but do not count. */
export const GOLDEN_SET_MIN = 20;
