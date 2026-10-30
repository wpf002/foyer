import { CATEGORY_ORDER, type DimensionKey } from './rubric';
import { MOOD_QUESTION, type BriefEntry } from './intake';
import type { Critique } from './critique';

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

const STRUCTURAL_WORK =
  /\b(?:remove|open(?:ing)? up|take down|demo(?:lish)?|widen|enlarge|move|relocate)\b[^.]{0,40}\b(?:wall|opening|doorway|header|beam|joist|gas|drain|stack|plumbing|supply)\b|\bnew header\b/i;
const ELECTRICAL_WORK =
  /\b(?:add|install|run|new|move|relocate|rough(?:-| )in|hardwire)\b[^.]{0,40}\b(?:wir(?:e|ing)|circuits?|outlets?|receptacles?|junction box|downlights?|recessed|can lights?)\b|\bhardwired\b/i;
const PRO_MENTION = /\b(?:engineer|electrician|plumber|permit)s?\b/i;

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
    const text = `${r.title}. ${r.rationale}`;
    const structural =
      r.category === 'STRUCTURAL' || STRUCTURAL_WORK.test(text) || ELECTRICAL_WORK.test(text) || PRO_MENTION.test(text);
    if (structural && !r.needsProReview) {
      out.push({ dimension: 'safety', cap: 3, message: `"${r.title}" touches structure or services without needsProReview` });
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
