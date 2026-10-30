import type { Finish } from '@foyer/ui';
/**
 * Sample project. Stands in for the Prisma reads until Phase 1 wires the
 * critique chain. Shaped exactly like the schema so the screens do not have to
 * change when real data arrives — note that every recommendation carries a
 * briefAnswer and every render would carry a recommendation.
 */

export type Section = 'SPACE' | 'LIFE' | 'AESTHETIC' | 'CONSTRAINTS';
export type Category = 'STRUCTURAL' | 'COSMETIC' | 'FUNCTIONAL' | 'ATMOSPHERIC';
export type Effort = 'WEEKEND' | 'WEEK' | 'MULTI_WEEK';
export type Phase = 'QUICK_WINS' | 'MID_RANGE' | 'MAJOR';
export type Path = 'DIY' | 'HANDYMAN' | 'LICENSED_CONTRACTOR';
export type Permit = 'NONE' | 'LIKELY' | 'REQUIRED' | 'UNKNOWN';

export interface BriefAnswer {
  id: string;
  questionId: string;
  section: Section;
  short: string;
  prompt: string;
  raw: string;
  parsed?: string[];
}

export interface Recommendation {
  id: string;
  roomId: string;
  briefAnswerId: string;
  category: Category;
  title: string;
  rationale: string;
  preserve?: string;
  effort: Effort;
  needsProReview?: boolean;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  dims: string;
  ceiling: string;
  photos: number;
  fixed: string[];
  movable: string[];
  read: string;
  dimsFromScan: boolean;
}

export interface RoadmapItem {
  id: string;
  phase: Phase;
  order: number;
  scope: string;
  why: string;
  path: Path;
  permit: Permit;
  effort: Effort;
  lowCents: number;
  midCents: number;
  highCents: number;
  dependsOn?: { id: string; reason: string };
  riskNote?: string;
}

export const project = {
  id: 'prescott',
  name: 'Prescott Street',
  subtitle: '1948 ranch · 1,340 sq ft',
  zip: '94610',
  city: 'Oakland, CA',
  status: 'Brief Ready',
  updated: 'Oct 27, 2026',
  budgetLowCents: 1_800_000,
  budgetHighCents: 3_400_000,
  regionFactor: 1.4,
};

export const SECTIONS: { key: Section; label: string; n: string }[] = [
  { key: 'SPACE', label: 'Space', n: '01' },
  { key: 'LIFE', label: 'Life', n: '02' },
  { key: 'AESTHETIC', label: 'Aesthetic', n: '03' },
  { key: 'CONSTRAINTS', label: 'Constraints', n: '04' },
];

export const brief: BriefAnswer[] = [
  { id: 'a01', questionId: 'Q01', section: 'SPACE', short: 'Scope', prompt: 'Which rooms are in scope?', raw: 'Kitchen, living room, entry. The primary bath if the money stretches.', parsed: ['Kitchen', 'Living', 'Entry', 'Bath (stretch)'] },
  { id: 'a02', questionId: 'Q02', section: 'SPACE', short: 'Horizon', prompt: 'How long do you expect to stay?', raw: "Ten years at least. Kids are 4 and 7, we're not moving before high school.", parsed: ['10+ years'] },
  { id: 'a03', questionId: 'Q03', section: 'SPACE', short: 'Complaint', prompt: 'What does the house get wrong today?', raw: 'It feels low and dim. Eight-foot ceilings and one light in the middle of every room.', parsed: ['Ceiling reads low', 'Single light source'] },
  { id: 'a04', questionId: 'Q04', section: 'SPACE', short: 'Measurements', prompt: 'Do you have dimensions or drawings?', raw: 'I measured by hand. Kitchen is about 8′4″ by 13′6″.', parsed: ['Hand-measured', 'No drawings'] },
  { id: 'a05', questionId: 'Q05', section: 'LIFE', short: 'Household', prompt: 'Who lives here, and who visits?', raw: 'Two adults, two kids, a 60-lb dog. My parents stay a week at a time twice a year.', parsed: ['4 residents', 'Large dog', 'Recurring guests'] },
  { id: 'a06', questionId: 'Q06', section: 'LIFE', short: 'Weekday', prompt: 'Walk me through a weekday evening.', raw: 'Both of us cook at once and we collide. Homework happens at the dining table while dinner is going.', parsed: ['Two cooks', 'Overlapping zones'] },
  { id: 'a07', questionId: 'Q07', section: 'LIFE', short: 'Mood', prompt: 'What mood should the space hold?', raw: 'Calm. Warm at night. I want it to feel like the light is coming from lamps, not the ceiling.', parsed: ['Calm', 'Warm', 'Low ambient at night'] },
  { id: 'a08', questionId: 'Q08', section: 'LIFE', short: 'Friction', prompt: 'What do you do here that the room fights?', raw: 'Carrying food from the kitchen to the table. The doorway is 32 inches and you turn sideways.', parsed: ['Blocked circulation', 'Narrow opening'] },
  { id: 'a09', questionId: 'Q09', section: 'AESTHETIC', short: 'References', prompt: "Three rooms you've saved. What do they share?", raw: 'All three had plaster walls, visible wood, and almost no hardware showing.', parsed: ['Plaster', 'Warm wood', 'Minimal hardware'] },
  { id: 'a10', questionId: 'Q10', section: 'AESTHETIC', short: 'Keep', prompt: 'What stays exactly as it is?', raw: 'The oak floors. They are original and I will not cover them.', parsed: ['Original oak floors'] },
  { id: 'a11', questionId: 'Q11', section: 'AESTHETIC', short: 'Veto', prompt: "Colors or materials you can't live with?", raw: 'Cool grey. Greige. Anything that reads blue in daylight. No subway tile.', parsed: ['No cool grey', 'No subway tile'] },
  { id: 'a12', questionId: 'Q12', section: 'AESTHETIC', short: 'Quiet', prompt: 'How much visual quiet do you need?', raw: 'A lot. Closed storage wherever possible. Open shelves become a mess within a week.', parsed: ['High quiet', 'Closed storage'] },
  { id: 'a13', questionId: 'Q13', section: 'CONSTRAINTS', short: 'Budget', prompt: 'Budget band, and what is flexible?', raw: '18 to 34 thousand. I would rather do the kitchen properly than touch four rooms lightly.', parsed: ['$18k–$34k', 'Depth over breadth'] },
  { id: 'a14', questionId: 'Q14', section: 'CONSTRAINTS', short: 'Timeline', prompt: 'Timeline and hard dates?', raw: 'Start in spring. Kitchen has to work by the end of August, school starts.', parsed: ['Spring start', 'Hard date: late Aug'] },
  { id: 'a15', questionId: 'Q15', section: 'CONSTRAINTS', short: 'Tenure', prompt: 'Own or rent? HOA or landmark district?', raw: 'We own it. No HOA. It is not in a historic district as far as I know.', parsed: ['Owner', 'No HOA', 'No district (unconfirmed)'] },
];

export const rooms: Room[] = [
  {
    id: 'r1', name: 'Kitchen', type: 'Galley', dims: '8′4″ × 13′6″', ceiling: '8′0″', photos: 5,
    fixed: ['Window at sink wall', 'Sewer stack, NE corner', 'Gas line at range', 'Load path, dining wall (unconfirmed)'],
    movable: ['Fridge', 'Base cabinets', 'Counter', 'Pendant', 'Dining table'],
    read: 'Work triangle is broken by the fridge door swinging into the only walkway. The single pendant puts the cook in their own shadow at the counter.',
    dimsFromScan: false,
  },
  {
    id: 'r2', name: 'Living Room', type: 'Living', dims: '15′2″ × 18′0″', ceiling: '8′0″', photos: 6,
    fixed: ['Chimney breast', 'Two south windows', 'Entry threshold'],
    movable: ['Sofa', 'Media wall', 'Curtain rods', 'Rug'],
    read: 'Curtain rods sit 6 inches above the window head, which cuts the wall and makes the ceiling read lower than it is. Furniture is pushed to all four walls.',
    dimsFromScan: false,
  },
  {
    id: 'r3', name: 'Entry', type: 'Entry', dims: '5′6″ × 7′0″', ceiling: '8′0″', photos: 3,
    fixed: ['Front door swing', 'Coat closet'],
    movable: ['Console', 'Hooks', 'Runner'],
    read: 'No landing surface inside the door, so bags go on the floor and the door swing is blocked by 5pm on a weekday.',
    dimsFromScan: false,
  },
  {
    id: 'r4', name: 'Primary Bath', type: 'Bathroom', dims: '6′0″ × 8′6″', ceiling: '8′0″', photos: 4,
    fixed: ['Toilet drain', 'Tub alcove', 'Vent stack'],
    movable: ['Vanity', 'Mirror', 'Lighting'],
    read: 'Vanity light sits above the mirror, which casts down and ages everyone using it. The tub surround is the only dated finish in the room.',
    dimsFromScan: false,
  },
];

export const recommendations: Recommendation[] = [
  {
    id: 'c1', roomId: 'r1', briefAnswerId: 'a07', category: 'ATMOSPHERIC',
    title: 'Light The Kitchen In Three Layers, Not One',
    rationale: 'You asked for light that reads like it comes from lamps. One ceiling pendant cannot do that, and at the counter it puts the cook in their own shadow. Three layers: under-cabinet task strips on the sink run, four 3-inch recessed on a dimmer for ambient, one warm pendant over the table at 2700K. The ceiling circuit becomes the layer you almost never use.',
    effort: 'WEEK',
  },
  {
    id: 'c2', roomId: 'r2', briefAnswerId: 'a03', category: 'COSMETIC',
    title: 'Hang Curtains At The Ceiling Line',
    rationale: 'The rods are 6 inches above the window head. Move them to within 2 inches of the ceiling and run the panels to the floor. The eye reads the full height of the fabric as the wall height, which is the cheapest thing in this whole brief and the one that most directly answers "it feels low."',
    effort: 'WEEKEND',
  },
  {
    id: 'c3', roomId: 'r1', briefAnswerId: 'a08', category: 'STRUCTURAL',
    title: 'Widen The Kitchen-To-Dining Opening To 7 Feet',
    rationale: 'A 32-inch opening is why you turn sideways carrying a dish. Widening it to 7 feet fixes the carry and lets the homework table and the cooking zone see each other, which is what you described wanting.',
    preserve: 'Keep the existing header height. Dropping it to gain width would cost you the one vertical dimension you already said reads low.',
    effort: 'MULTI_WEEK',
    needsProReview: true,
  },
  {
    id: 'c4', roomId: 'r1', briefAnswerId: 'a06', category: 'FUNCTIONAL',
    title: 'Move The Fridge To The Pantry Wall',
    rationale: 'Two cooks collide because the fridge door opens into the only walkway. On the pantry wall it opens away from traffic and the sink-range-fridge triangle closes to about 13 feet of travel, down from 21.',
    effort: 'MULTI_WEEK',
  },
  {
    id: 'c5', roomId: 'r2', briefAnswerId: 'a11', category: 'COSMETIC',
    title: 'Limewash In A Warm Bone, Not White',
    rationale: 'You vetoed anything that reads blue in daylight, and your three saved rooms all had plaster. Limewash in a warm bone gives you the depth of those references and shifts warm as the light drops, which is the behavior you asked for at night. Flat white in a south-facing room at this latitude goes cold by 4pm.',
    effort: 'WEEK',
  },
  {
    id: 'c6', roomId: 'r2', briefAnswerId: 'a10', category: 'ATMOSPHERIC',
    title: 'Refinish The Oak In Satin. Do Not Stain It.',
    rationale: 'The floors are the best material in the house and they are staying. A satin penetrating finish keeps the grain readable; gloss would turn them into a mirror for the new recessed lighting and fight the calm you asked for.',
    preserve: 'No stain. The 1948 red oak has already ambered, and a stain would flatten the variation you are paying to expose.',
    effort: 'WEEK',
  },
  {
    id: 'c7', roomId: 'r1', briefAnswerId: 'a13', category: 'FUNCTIONAL',
    title: 'Reface The Cabinets. Keep The Carcasses.',
    rationale: 'You said depth over breadth. The boxes are solid plywood and square, which is the expensive part of a kitchen. New doors, new drawer boxes, and a new counter buy you the whole visual change for roughly a third of a rip-out, and it keeps your closed-storage requirement intact.',
    preserve: 'Keep the existing cabinet boxes and the sink location. Moving the sink adds plumbing scope you do not need.',
    effort: 'MULTI_WEEK',
  },
  {
    id: 'c8', roomId: 'r3', briefAnswerId: 'a05', category: 'FUNCTIONAL',
    title: 'Give The Entry A 30-Inch Landing Zone',
    rationale: 'Four people and a dog come through a 5′6″ entry with nowhere to set anything down. A 30-inch bench with closed storage under it, plus hooks at 42 inches for the kids and 60 for the adults, clears the floor and unblocks the door swing.',
    effort: 'WEEKEND',
  },
];

export const roadmap: RoadmapItem[] = [
  { id: 'p1', phase: 'QUICK_WINS', order: 1, scope: 'Rehang Curtains At The Ceiling Line', why: 'Biggest perceived height gain per dollar in the brief.', path: 'DIY', permit: 'NONE', effort: 'WEEKEND', lowCents: 18_000, midCents: 28_000, highCents: 42_000 },
  { id: 'p2', phase: 'QUICK_WINS', order: 2, scope: 'Entry Bench And Hooks', why: 'Clears the floor and unblocks the door swing.', path: 'DIY', permit: 'NONE', effort: 'WEEKEND', lowCents: 24_000, midCents: 36_000, highCents: 48_000 },
  { id: 'p3', phase: 'QUICK_WINS', order: 3, scope: 'Satin Test Patch On The Oak', why: 'Confirms the finish before committing the whole floor.', path: 'DIY', permit: 'NONE', effort: 'WEEKEND', lowCents: 6_000, midCents: 9_000, highCents: 14_000 },
  { id: 'p4', phase: 'MID_RANGE', order: 1, scope: 'Three-Layer Kitchen Lighting', why: 'The mood answer depends on this more than on any finish.', path: 'LICENSED_CONTRACTOR', permit: 'LIKELY', effort: 'WEEK', lowCents: 180_000, midCents: 272_000, highCents: 390_000, riskNote: 'Adding circuits may exceed the existing panel. A licensed electrician should confirm capacity before scheduling.' },
  { id: 'p5', phase: 'MID_RANGE', order: 2, scope: 'Limewash Living And Dining', why: 'Answers the veto on cool grey and matches the plaster references.', path: 'HANDYMAN', permit: 'NONE', effort: 'WEEK', lowCents: 140_000, midCents: 198_000, highCents: 280_000 },
  { id: 'p6', phase: 'MID_RANGE', order: 3, scope: 'Refinish Oak Floors, Satin', why: 'The floors are staying, so they get finished last in the room.', path: 'LICENSED_CONTRACTOR', permit: 'NONE', effort: 'WEEK', lowCents: 210_000, midCents: 310_000, highCents: 440_000, dependsOn: { id: 'p5', reason: 'Walls get painted before floors get finished. Reversing this means sanding through new finish or taping a fresh floor.' } },
  { id: 'p7', phase: 'MAJOR', order: 1, scope: 'Widen Kitchen-To-Dining Opening', why: 'The carry path and the sightline both depend on it.', path: 'LICENSED_CONTRACTOR', permit: 'REQUIRED', effort: 'MULTI_WEEK', lowCents: 900_000, midCents: 1_480_000, highCents: 2_100_000, riskNote: 'This wall may be load-bearing. Foyer cannot determine that from photographs. A structural engineer has to confirm the load path and size the header before any demolition.' },
  { id: 'p8', phase: 'MAJOR', order: 2, scope: 'Relocate Fridge And Water Line', why: 'Closes the work triangle for two cooks.', path: 'LICENSED_CONTRACTOR', permit: 'LIKELY', effort: 'MULTI_WEEK', lowCents: 320_000, midCents: 465_000, highCents: 650_000, dependsOn: { id: 'p7', reason: 'The framing work opens the wall the new water line runs through. Doing it after means opening the same wall twice.' } },
  { id: 'p9', phase: 'MAJOR', order: 3, scope: 'Cabinet Reface And New Counter', why: 'Whole visual change at a third of a rip-out.', path: 'LICENSED_CONTRACTOR', permit: 'NONE', effort: 'MULTI_WEEK', lowCents: 640_000, midCents: 940_000, highCents: 1_320_000, dependsOn: { id: 'p8', reason: 'Cabinet and counter layout follows the final appliance plan. Template a counter before the fridge moves and you template it twice.' } },
];

export const PHASES: { key: Phase; label: string; band: string; n: string }[] = [
  { key: 'QUICK_WINS', label: 'Quick Wins', band: 'Under $500 · DIY · A Weekend', n: '01' },
  { key: 'MID_RANGE', label: 'Mid-Range', band: 'Under $5k · Simple Contractor', n: '02' },
  { key: 'MAJOR', label: 'Major', band: '$10k+ · Licensed · Permits', n: '03' },
];

export const artifacts = [
  { slug: 'contractor-brief', title: 'Contractor Brief', pages: 4, note: 'Scope, what to preserve, sequencing, permits flagged.', ready: true },
  { slug: 'designer-brief', title: 'Designer Brief', pages: 3, note: 'Mood, priority areas, budget allocation, pieces retained.', ready: true },
  { slug: 'shopping-list', title: 'Shopping List', pages: 2, note: 'Categories with ranges and specifications, by room.', ready: true },
  { slug: 'permit-checklist', title: 'Permit Checklist', pages: 2, note: 'Flagged items and Oakland building department links.', ready: true },
  { slug: 'contractor-questions', title: 'Questions For Your Contractor', pages: 2, note: 'Nine questions tied to specific scope items.', ready: false },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  STRUCTURAL: 'Structural',
  FUNCTIONAL: 'Functional',
  ATMOSPHERIC: 'Atmospheric',
  COSMETIC: 'Cosmetic',
};

export const EFFORT_LABEL: Record<Effort, string> = {
  WEEKEND: 'A Weekend',
  WEEK: 'About A Week',
  MULTI_WEEK: 'Multi-Week',
};

export const PATH_LABEL: Record<Path, string> = {
  DIY: 'DIY',
  HANDYMAN: 'Handyman',
  LICENSED_CONTRACTOR: 'Licensed',
};

export const PERMIT_LABEL: Record<Permit, string> = {
  NONE: 'No Permit',
  LIKELY: 'Permit Likely',
  REQUIRED: 'Permit Required',
  UNKNOWN: 'Permit Unknown',
};

export const CATEGORY_ORDER: Category[] = ['STRUCTURAL', 'FUNCTIONAL', 'ATMOSPHERIC', 'COSMETIC'];

export function answerFor(id: string): BriefAnswer {
  const a = brief.find((x) => x.id === id);
  if (!a) throw new Error(`brief answer ${id} is missing — a recommendation cannot exist without one`);
  return a;
}

export function roomFor(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}

export function itemFor(id: string): RoadmapItem | undefined {
  return roadmap.find((r) => r.id === id);
}

export const totals = {
  lowCents: roadmap.reduce((n, r) => n + r.lowCents, 0),
  midCents: roadmap.reduce((n, r) => n + r.midCents, 0),
  highCents: roadmap.reduce((n, r) => n + r.highCents, 0),
};

/**
 * The palette Foyer is proposing, drawn off the recommendations rather than
 * chosen for the page: limewash on the living and dining walls, satin on the
 * oak, linen at the windows. A decorator presents the finishes as a board, so
 * the app does too. Hex values stand in for real finish codes until Phase 2.
 */
export const palette = [
  { finish: 'plaster' as Finish, name: 'Limewash Plaster', hex: '#e9e3d7', where: 'Living, Dining Walls' },
  { finish: 'oak' as Finish, name: 'White Oak, Satin', hex: '#c9ab7e', where: 'Floors Throughout' },
  { finish: 'linen' as Finish, name: 'Unbleached Linen', hex: '#ddd5c4', where: 'Curtains, Bench Seat' },
  { finish: 'terracotta' as Finish, name: 'Terracotta', hex: '#b05a38', where: 'Kitchen Accents' },
  { finish: 'brass' as Finish, name: 'Aged Brass', hex: '#a98b4e', where: 'Lamps And Hardware' },
  { finish: 'walnut' as Finish, name: 'Oiled Walnut', hex: '#5b4432', where: 'Entry Bench, Shelving' },
];

/** Which finishes each room carries, read off the palette's placements. */
export const roomFinishes: Record<string, Finish[]> = {
  r1: ['oak', 'terracotta', 'brass'],
  r2: ['plaster', 'oak', 'linen', 'brass'],
  r3: ['walnut', 'oak', 'plaster'],
  r4: ['plaster', 'brass'],
};

/** The finish each recommendation is about, used as its sample. */
export const recFinish: Record<string, Finish> = {
  c1: 'brass',
  c2: 'linen',
  c3: 'plaster',
  c4: 'oak',
  c5: 'plaster',
  c6: 'oak',
  c7: 'walnut',
  c8: 'walnut',
};
