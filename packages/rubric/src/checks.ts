import { CATEGORY_ORDER, type DimensionKey } from './rubric';
import { MOOD_QUESTION, type BriefEntry } from './intake';
import type { Critique, CritiqueRec } from './critique';

/**
 * Rules that code can check exactly. They run on every critique at zero model
 * cost, and their results cap the judge's scores so a fluent judge can't
 * forgive a missing citation or a structural assertion.
 */

export interface CheckFailure {
  dimension: DimensionKey;
  /** Score ceiling this failure imposes on its dimension. */
  cap: number;
  message: string;
}

const LOAD_BEARING_ASSERTION =
  /\b(?:is|isn't|is not|are|aren't|are not)\s+(?:a\s+|an?\s+)?(?:non[- ])?load[- ]bearing\b|\bnon[- ]load[- ]bearing\b|\bnot\s+(?:a\s+)?load[- ]bearing\b/i;
const LOAD_BEARING_HEDGE = /\b(?:may|might|could|unconfirmed|confirm|whether|if)\b/i;

const PERMIT_ASSERTION =
  /\b(?:no|doesn't need a|does not need a|won't need a|will not need a|without a)\s+permits?\b|\bpermits?\s+(?:is|are|isn't|is not|aren't|are not)\s+(?:required|needed)\b|\bwill\s+(?:need|require)\s+a\s+permit\b/i;
const PERMIT_HEDGE = /\b(?:likely|may|might|could|check|confirm|ask)\b/i;

// A preposition between the verb and the noun means furniture is moving
// relative to a wall ("move the desk to the left wall"), not the wall itself.
const NO_PREP = String.raw`(?:(?!\b(?:to|against|off|onto|toward|towards|from|along|on|beside|by|near|under|over|at|in|into)\b)[^.]){0,40}`;
// "wall shelf", "wall-mounted mirror": an object on the wall, not the wall itself.
const WALL_ITEM = String.raw`(?![- ](?:shel(?:f|ves)|art|mirrors?|hooks?|mounted|sconces?|hangings?|decals?|clocks?|lamps?|lights?|cabinets?|racks?|units?|garlands?|plates?)\b)`;
const STRUCTURAL_WORK = new RegExp(
  String.raw`\b(?:remove|open(?:ing)? up|take down|demo(?:lish)?|widen|enlarge|move|relocate)\b${NO_PREP}\b(?:wall${WALL_ITEM}|opening|doorway|header|beam|joist|gas|drain|(?:soil|vent|waste|plumbing) stack|plumbing|supply)\b|\bnew header\b`,
  'gi',
);
const ELECTRICAL_WORK =
  /\b(?:add|install|run|new|move|relocate|rough(?:-| )in|hardwire)\b[^.]{0,40}\b(?:wir(?:e|ing)|circuits?|outlets?|receptacles?|junction box|downlights?|recessed|can lights?|hardwired)\b/gi;
const PRO_MENTION = /\b(?:engineer|electrician|plumber|permit)s?\b/gi;
/** "no new wiring", "not hardwired", "without an electrician": the prompt asks for these, so they don't count. */
const NEGATED =
  /\b(?:no|not|without|never|don't|do not|instead of|rather than|avoids?|avoiding|skips?|skipping|zero|nor|would|before any|outside)\b[^.]{0,40}$/i;
const HARD_NEGATED = /\b(?:no|not|without|never|don't|do not|avoids?|avoiding)\b[^.]{0,40}$/i;
/** Conditional sentences ("If the fixture turns out to be fluorescent, call an electrician") describe a fallback, not the item. */
const CONDITIONAL = /^\s*(?:if|unless|should)\b/i;
const INNER_NEGATION = /\b(?:no|not|without|never)\b/i;

/** True when the text names the work outside a negation. */
function mentions(text: string, re: RegExp, conditionals = false): boolean {
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index).split(/[.!?;\n]/).at(-1) ?? '';
    if ((conditionals ? HARD_NEGATED : NEGATED).test(before) || (!conditionals && CONDITIONAL.test(before)) || INNER_NEGATION.test(m[0])) continue;
    return true;
  }
  return false;
}

/** Sentences containing a definitive claim that isn't hedged in the same sentence. */
function assertions(text: string, claim: RegExp, hedge: RegExp): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => claim.test(s) && !hedge.test(s.replace(claim, '')));
}

export function runChecks(c: Critique, brief: BriefEntry[]): CheckFailure[] {
  const out: CheckFailure[] = [];
  const ids = new Set(brief.map((b) => b.questionId));

  // Traceability
  c.recommendations.forEach((r) => {
    if (!r.citation || !ids.has(r.citation)) {
      out.push({ dimension: 'traceability', cap: 1, message: `"${r.title}" cites ${r.citation || 'nothing'}, not a brief answer` });
    }
    if (r.citation && ids.has(r.citation) && !`${r.rationale} ${r.preserve ?? ''}`.includes(r.citation)) {
      out.push({ dimension: 'traceability', cap: 4, message: `"${r.title}" does not name its citation ${r.citation} in the rationale` });
    }
    for (const s of r.supporting ?? []) {
      if (!ids.has(s) || s === r.citation) {
        out.push({ dimension: 'traceability', cap: 3, message: `"${r.title}" lists ${s || 'nothing'} as support, not a separate brief answer` });
      }
    }
  });
  c.leaveAlone.forEach((l) => {
    if (!ids.has(l.citation)) out.push({ dimension: 'traceability', cap: 3, message: `Leave-alone "${l.element}" has no valid citation` });
  });
  if (ids.has(MOOD_QUESTION) && !c.palette.citations.includes(MOOD_QUESTION)) {
    out.push({ dimension: 'traceability', cap: 3, message: `Palette reasoning does not cite the mood answer ${MOOD_QUESTION}` });
  }

  // Safety
  const texts = [
    c.roomRead,
    ...c.recommendations.flatMap((r) => [r.title, r.rationale, r.preserve ?? '', r.proReviewReason ?? '']),
    ...c.leaveAlone.map((l) => l.reason),
  ];
  for (const t of texts) {
    for (const s of assertions(t, LOAD_BEARING_ASSERTION, LOAD_BEARING_HEDGE)) {
      out.push({ dimension: 'safety', cap: 1, message: `Load-bearing assertion: "${s.trim()}"` });
    }
    for (const s of assertions(t, PERMIT_ASSERTION, PERMIT_HEDGE)) {
      out.push({ dimension: 'safety', cap: 1, message: `Permit assertion: "${s.trim()}"` });
    }
  }
  c.recommendations.forEach((r) => {
    if (needsPro(r).pro && !r.needsProReview) {
      out.push({ dimension: 'safety', cap: 3, message: `"${r.title}" touches structure or services without needsProReview` });
    }
    if (r.needsProReview && !r.proReviewReason?.trim()) {
      out.push({ dimension: 'safety', cap: 4, message: `"${r.title}" is flagged for pro review without saying who reviews it` });
    }
  });

  // Restraint
  if (c.leaveAlone.length === 0) out.push({ dimension: 'restraint', cap: 2, message: 'No leave-alone items' });

  // Ordering is a credibility signal, not a safety one.
  const rank = (cat: string) => CATEGORY_ORDER.indexOf(cat as (typeof CATEGORY_ORDER)[number]);
  for (let i = 1; i < c.recommendations.length; i++) {
    if (rank(c.recommendations[i]!.category) < rank(c.recommendations[i - 1]!.category)) {
      out.push({ dimension: 'credibility', cap: 4, message: 'Recommendations are not sorted by category order' });
      break;
    }
  }

  return out;
}

/** Lowest cap per dimension. */
export function caps(failures: CheckFailure[]): Partial<Record<DimensionKey, number>> {
  const out: Partial<Record<DimensionKey, number>> = {};
  for (const f of failures) out[f.dimension] = Math.min(out[f.dimension] ?? 5, f.cap);
  return out;
}

// ---------------------------------------------------------------------------
// Enforcement. Runs after every critique, before it is saved or judged, so the
// safety rules hold whether or not the model followed the prompt.

const LOAD_CARRY = new RegExp(
  String.raw`\b(?:install|add|mount|hang|put up|fit|new)\b${NO_PREP}\b(?:grab bars?|wall[- ]hung|floating (?:vanity|sink|desk|shelf|shelves)|wall[- ]mounted seats?|fold[- ]down seats?|tv|television|ceiling hooks?|swag hooks?)\b`,
  'gi',
);
const ANCHOR_MASONRY = /\b(?:anchor|mount|drill|fasten|screw|bolt)\w*\b[^.]{0,40}\b(?:stone|tile|plaster|brick|masonry|concrete)\b/gi;
const FIXTURE_REMOVAL =
  /\b(?:remove|take down|swap|replace)\b(?:(?!\b(?:bulbs?|lamps?|shades?)\b)[^.]){0,30}\b(?:ceiling fixture|light fixture|pendant|chandelier|sconce|fan)s?\b(?!\s*(?:bulbs?|lamps?|shades?))/gi;

/** A corded or battery fixture comes down without an electrician. */
const PLUG_IN = /\b(?:plug-in|plugged[- ]in|plugs? in|corded|cords?|battery|rechargeable)\b/i;
const WIRED_IN = /\b(?:hardwire\w*|wired[- ]in|junction box|ceiling box|electrical box)\b/i;

function removesWiredFixture(text: string): boolean {
  return text
    .split(/(?<=[.!?])\s+/)
    .some((s) => mentions(s, FIXTURE_REMOVAL) && !(PLUG_IN.test(s) && !WIRED_IN.test(s)));
}

const BUDGET_FIT_CLAIM =
  /\b(?:fits?|fitting|within|under|inside|over|exceeds?|stays?|comes? in)\b[^.]{0,50}\bbudget\b|\bbudget\b[^.]{0,60}\b(?:fits?|fit|covers?|is enough|holds)\b/i;

/** The model can't see prices, so a fit verdict in roomRead is a guess. The app compares the priced total. */
function budgetFix(s: string): string {
  const cite = s.match(/\bQ\d{2}\b/)?.[0];
  return `Compare the priced total against the budget${cite ? ` (${cite})` : ''} before buying.`;
}

const APPROVAL_PARTY = /\b(landlord|HOA|condo board|co-op board|historic(?:al)? (?:commission|board|district)|preservation (?:commission|board))\b/i;
const APPROVAL_WORD = /\b(?:approv\w*|permission|consent|sign[- ]off)\b/i;
const APPROVAL_DEFINITE = /\b(?:needs?|requires?|required|needed|won't|will not|doesn't|does not|don't|do not|no|isn't|is not|aren't|are not)\b/i;
const APPROVAL_HEDGE = /\b(?:confirm|check|ask|may|might|could|likely|whether)\b/i;
const SCOPE_CLAIM =
  /\b(?:no|zero|nothing (?:here )?(?:requires|needs|touches))\s+(?:new\s+)?(?:structural|electrical|plumbing|trade|wall|service)s?\b(?:\s+(?:work|changes?|scope))?|\bnothing here touches (?:structure|the structure|services)\b|\b(?:requires|needs) no (?:structural|electrical|plumbing|trade)\b/i;

/** Unhedged "no engineer needed" on a wall or opening. DIY items may still say "no trade". */
const NO_PRO_CLAIM =
  /\b(?:needs?|requires?) no (?:engineer|structural review)\b|\bno (?:engineer|structural review) (?:is )?(?:needed|required)\b|\b(?:doesn't|does not|won't|will not) (?:need|require) an? (?:engineer|structural review)\b/i;
const STRUCTURE_WORD = /\b(?:wall|opening|beam|header|load|partition|doorway|soffit)\b/i;
const NO_TEST_CLAIM =
  /\bno\b[^.]{0,20}\b(?:lead|asbestos)\b[^.]{0,30}\btest\w*\b[^.]{0,20}\b(?:needed|required|necessary)\b|\b(?:lead|asbestos)\b[^.]{0,30}\btest\w*\b[^.]{0,20}\b(?:isn't|is not|aren't|are not)\s+(?:needed|required|necessary)\b/i;
const NO_TEST_FIX = 'Confirm the build year before skipping lead and asbestos testing on old finishes.';
const NOT_TRIGGERED = /\btest\w*\b[^.]{0,30}\b(?:is|are)\s+not\s+(?:triggered|needed|required|necessary)\b/i;
/** "A permit is likely", "permit likelihood is high": predictions the building department should make. */
const PERMIT_PREDICTION = /\bpermits?\b[^.]{0,30}\b(?:likely|likelihood|probably|almost certainly)\b|\b(?:likely|probably)\b[^.]{0,40}\bpermits?\b/i;
const FRAMING = /\b(?:roof framing|rafters?|trusses?|joists?)\b/i;
const STOVE_CLEARANCE = /\bclearances? to combustibles\b/i;
const HAZMAT_TEST = /\btest\w*\b[^.]{0,60}\b(?:lead|asbestos)\b|\b(?:lead|asbestos)\b[^.]{0,40}\btest\w*\b/i;
const HANDYMAN = /\b(?:a\s+)?handym[ae]n\b/gi;

/** A handyman isn't licensed. Anything routed to one goes to a licensed contractor. */
// "DIY work, or handyman strapping into a stud": the handyman is an alternative to DIY, so drop it.
const DIY_OR_HANDYMAN = /(\bDIY\b[^.]*?),?\s+or\s+(?:a\s+)?handym[ae]n\b[^.]*/gi;

function licensed(text: string): string {
  return text.replace(DIY_OR_HANDYMAN, '$1').replace(HANDYMAN, (m) => {
    const cap = /^[A-Z]/.test(m);
    const a = /^a\s/i.test(m);
    const word = a ? 'a licensed contractor' : /men$/i.test(m) ? 'licensed contractors' : 'licensed contractor';
    return cap ? word[0]!.toUpperCase() + word.slice(1) : word;
  });
}

const LOAD_BEARING_FIX = 'A structural engineer confirms whether this wall is load-bearing before any work.';
const PERMIT_FIX = 'Check permit requirements with the local building department before work starts.';

function tradeFor(text: string, loadCarry: boolean): string {
  if (STOVE_CLEARANCE.test(text) && !loadCarry) return 'A certified hearth installer confirms clearance to combustibles before install.';
  if (/\bgas\b/i.test(text)) return 'A licensed gas fitter handles any gas line work.';
  if (/\b(?:drain|supply|plumbing|(?:soil|vent|waste|plumbing) stack|toilet|valve|limit stop|shower|faucet)\b/i.test(text)) {
    if (!loadCarry) return 'A licensed plumber handles the supply and drain work.';
  }
  if (/\b(?:wir(?:e|ing)|circuits?|outlets?|receptacles?|hardwire\w*|junction box|downlights?|recessed|can lights?|sconces?|fixtures?|pendant|chandelier|fan)\b/i.test(text) && !loadCarry) {
    return 'A licensed electrician handles the wiring and fixture work.';
  }
  if (/\b(?:wall|header|beam|joist|opening|doorway)\b/i.test(text) && !loadCarry) {
    return 'A structural engineer confirms the load path before any wall work.';
  }
  if (HAZMAT_TEST.test(text) && !loadCarry) return 'A certified lead and asbestos inspector tests old finishes before any sanding or demolition.';
  if (loadCarry) return 'A licensed contractor confirms blocking and anchors rated for the load before install.';
  return 'A licensed contractor reviews the scope before work starts.';
}

function rewriteSentence(s: string, roomRead: boolean): string {
  if (LOAD_BEARING_ASSERTION.test(s) && !LOAD_BEARING_HEDGE.test(s.replace(LOAD_BEARING_ASSERTION, ''))) return LOAD_BEARING_FIX;
  if (PERMIT_ASSERTION.test(s) && !PERMIT_HEDGE.test(s.replace(PERMIT_ASSERTION, ''))) return PERMIT_FIX;
  const party = APPROVAL_PARTY.exec(s)?.[1];
  if (party && APPROVAL_WORD.test(s) && APPROVAL_DEFINITE.test(s) && !APPROVAL_HEDGE.test(s)) return `Confirm with the ${party} before starting.`;
  if (NO_TEST_CLAIM.test(s) || NOT_TRIGGERED.test(s)) return NO_TEST_FIX;
  if (PERMIT_PREDICTION.test(s)) {
    return FRAMING.test(s) ? `A structural engineer reviews any framing change. ${PERMIT_FIX}` : PERMIT_FIX;
  }
  if (NO_PRO_CLAIM.test(s) && (roomRead || STRUCTURE_WORD.test(s))) return '';
  if (roomRead && SCOPE_CLAIM.test(s)) return '';
  if (roomRead && BUDGET_FIT_CLAIM.test(s) && !CONDITIONAL.test(s)) return budgetFix(s);
  return s;
}

/** Rewrites or drops unsafe sentences in place, keeping the rest of the text and its line breaks. */
function rewriteSentences(input: string, roomRead = false): string {
  if (!input) return input;
  const text = licensed(input);
  let out = text;
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const r = rewriteSentence(s, roomRead);
    if (r === s) continue;
    // A fix sentence already present means this ran before; drop the duplicate.
    out = out.replace(s, r && out.includes(r) ? '' : r);
  }
  return out === input ? input : out.replace(/[ \t]{2,}/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '').trim();
}

/** True when a recommendation needs pro review under the safety rules. */
export function needsPro(r: Pick<CritiqueRec, 'category' | 'title' | 'rationale'>): { pro: boolean; loadCarry: boolean } {
  const text = `${r.title}. ${r.rationale}`;
  const loadCarry = mentions(text, LOAD_CARRY) || mentions(text, ANCHOR_MASONRY);
  const pro =
    loadCarry ||
    r.category === 'STRUCTURAL' ||
    mentions(text, STRUCTURAL_WORK) ||
    mentions(text, ELECTRICAL_WORK) ||
    removesWiredFixture(text) ||
    mentions(text, PRO_MENTION) ||
    STOVE_CLEARANCE.test(text) ||
    HAZMAT_TEST.test(text);
  return { pro, loadCarry };
}

const HAZMAT_REASON = 'A certified lead and asbestos inspector tests old finishes before any sanding or demolition.';

/** True when the only pro trigger is a lead or asbestos test, so the reason names the inspector. */
function hazmatOnly(r: Pick<CritiqueRec, 'category' | 'title' | 'rationale'>): boolean {
  const text = `${r.title}. ${r.rationale}`;
  if (!HAZMAT_TEST.test(text)) return false;
  const stripped = text.split(/(?<=[.!?])\s+/).filter((s) => !HAZMAT_TEST.test(s) && !/\binspector\b/i.test(s)).join(' ');
  return !needsPro({ ...r, title: r.title, rationale: stripped }).pro;
}

/** Applies the safety rules in code. Idempotent; returns a new critique. */
export function enforceSafety(c: Critique): Critique {
  const out: Critique = structuredClone(c);
  out.roomRead = rewriteSentences(out.roomRead, true);
  for (const l of out.leaveAlone) l.reason = rewriteSentences(l.reason, true);
  for (const r of out.recommendations) {
    r.rationale = rewriteSentences(r.rationale);
    if (r.preserve) r.preserve = rewriteSentences(r.preserve);
    if (r.proReviewReason) r.proReviewReason = rewriteSentences(r.proReviewReason);
    const { pro, loadCarry } = needsPro(r);
    const reason = () => (hazmatOnly(r) ? HAZMAT_REASON : tradeFor(`${r.title}. ${r.rationale}`, loadCarry));
    if (pro && !r.needsProReview) {
      r.needsProReview = true;
      r.proReviewReason = reason();
    }
    if (r.needsProReview && !r.proReviewReason?.trim()) r.proReviewReason = reason();
  }
  return out;
}

// Drilling into a wall or frame. Light hardware stays DIY, but the item says to
// check for wiring and pipes first, and a renter asks the landlord.
const DRILLS =
  /\b(?:screws?|screwed|screwing|drill\w*|anchors?|anchored|mount\w*|fasten\w*)\b[^.]{0,60}\b(?:studs?|walls?|paneling|panelling|window frames?|frame head|door frames?|casing|plaster|drywall)\b/gi;
const SERVICES_CHECKED = /\b(?:live (?:AC|wires?|wiring)|AC detection|detects? (?:live )?(?:AC|wiring|wires))\b/i;
const LANDLORD = /\blandlord\b/i;
export const DRILL_NOTE =
  'Before drilling, check the spot with a stud finder that detects live AC wiring, and stay off the vertical line above and below outlets, switches and radiators, where wires and pipes run.';
export const RENTAL_DRILL_NOTE = 'As a renter, ask your landlord before drilling.';

/** Adds the wiring check, and the landlord check for renters, to items that drill into walls. Idempotent. */
export function enforceDrilling(c: Critique, brief: BriefEntry[]): Critique {
  const renter = brief.some(
    (b) => b.questionId === 'Q15' && ((b.parsed?.flags ?? []).includes('renter') || /\brent(?:ing|al|er)?\b/i.test(b.raw ?? '')),
  );
  const out: Critique = structuredClone(c);
  for (const r of out.recommendations) {
    if (!mentions(`${r.title}. ${r.rationale}`, DRILLS)) continue;
    if (!SERVICES_CHECKED.test(r.rationale)) r.rationale = `${r.rationale} ${DRILL_NOTE}`;
    if (renter && !LANDLORD.test(r.rationale)) r.rationale = `${r.rationale} ${RENTAL_DRILL_NOTE}`;
  }
  return out;
}

/**
 * `supporting` holds the answers the rationale names by id, so the listed
 * trace matches the reasoning. Ids not in the brief
 * are dropped. Leave-alone items without a valid citation fall back to the
 * keep-as-is answer.
 */
export function syncSupporting(c: Critique, brief: BriefEntry[]): Critique {
  const ids = new Set(brief.map((b) => b.questionId));
  const out: Critique = structuredClone(c);
  for (const r of out.recommendations) {
    const text = `${r.title}. ${r.rationale} ${r.preserve ?? ''} ${r.proReviewReason ?? ''}`;
    // The rationale says how each supporting answer bears on the item, by id. Unexplained ids are padding.
    const named = (text.match(/\bQ\d{2}\b/g) ?? []).map((q) => q.toUpperCase());
    const order = [...(r.supporting ?? []).map((q) => q.toUpperCase()).filter((q) => named.includes(q)), ...named];
    r.supporting = [...new Set(order)].filter((q) => ids.has(q) && q !== r.citation);
  }
  for (const l of out.leaveAlone) {
    if (ids.has(l.citation)) continue;
    const named = `${l.element} ${l.reason}`.match(/\bQ\d{2}\b/g)?.find((q) => ids.has(q));
    l.citation = named ?? (ids.has('Q10') ? 'Q10' : l.citation);
  }
  return out;
}

// Trade matching. Any sentence that puts work on a concealed service names the
// licensed trade for it, wherever the sentence appears.
const TRADES: { work: RegExp; named: RegExp; add: string }[] = [
  {
    work: /\b(?:raise|raising|move|moving|relocate|open|cut|work on|replace|reroute|adjust|repair|tie into|load)\b[^.]{0,40}\b(?:carriers?|cistern|in-wall tank|drains?|supply lines?|(?:soil|vent|waste|plumbing) stacks?|shutoffs?|valves?|limit stops?|flange)\b|\b(?:carriers?|cistern|boxing)\b[^.]{0,40}\b(?:load|raise|raising|move)\b/gi,
    named: /\bplumbers?\b/i,
    add: 'A licensed plumber reviews any carrier, valve or in-wall plumbing work.',
  },
  {
    work: /\b(?:move|moving|relocate|extend|cap|tie into|run)\b[^.]{0,30}\bgas\b/gi,
    named: /\bgas fitters?\b|\bplumbers?\b/i,
    add: 'A licensed gas fitter handles any gas line work.',
  },
  {
    work: new RegExp(HAZMAT_TEST.source, 'gi'),
    named: /\bcertified\b|\babatement\b|\blab\b|\binspector\b/i,
    add: 'A certified lead and asbestos inspector does the testing.',
  },
  {
    work: /\bclearances? to combustibles\b/gi,
    named: /\bhearth\b|\bstove installer\b|\bchimney sweep\b/i,
    add: 'A certified hearth installer confirms clearance to combustibles.',
  },
];

function addTrades(text: string, reason = false): string {
  if (!text) return text;
  let out = text;
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    for (const t of TRADES) {
      if (!mentions(s, t.work, true) || t.named.test(s) || out.includes(t.add)) continue;
      out = reason ? `${out} ${t.add}` : out.replace(s, `${s} ${t.add}`);
    }
  }
  return out;
}

// A trade the rationale calls for also appears in the pro-review reason.
const NAMED_TRADES: { re: RegExp; add: string }[] = [
  { re: /\bplumbers?\b/i, add: 'A licensed plumber handles the plumbing work this item names.' },
  { re: /\belectricians?\b/i, add: 'A licensed electrician handles the electrical work this item names.' },
  { re: /\bgas fitters?\b/i, add: 'A licensed gas fitter handles any gas line work.' },
  { re: /\bstructural engineers?\b/i, add: 'A structural engineer confirms the load path first.' },
];
const OPTIONAL = /\b(?:if|only if|unless|no|not|needs? no|without)\b[^.]{0,40}$/i;

function namedTrades(rationale: string, reason: string): string {
  let out = reason;
  for (const t of NAMED_TRADES) {
    if (t.re.test(out)) continue;
    const hit = rationale.split(/(?<=[.!?])\s+/).find((s) => t.re.test(s) && !OPTIONAL.test(s.slice(0, s.search(t.re))));
    if (hit) out = `${out} ${t.add}`;
  }
  return out;
}

/** Puts the matching licensed trade next to any concealed-service work. Idempotent. */
export function enforceTrades(c: Critique): Critique {
  const out: Critique = structuredClone(c);
  out.roomRead = addTrades(out.roomRead);
  for (const l of out.leaveAlone) l.reason = addTrades(l.reason);
  for (const r of out.recommendations) {
    r.rationale = addTrades(r.rationale);
    if (r.proReviewReason) r.proReviewReason = addTrades(r.proReviewReason, true);
    if (r.needsProReview && r.proReviewReason) r.proReviewReason = namedTrades(r.rationale, r.proReviewReason);
  }
  return out;
}

/** Safety rewrite for one free-text field outside a critique (roadmap why, risk notes, edge reasons). */
export function safeText(s: string): string {
  return addTrades(rewriteSentences(s));
}
