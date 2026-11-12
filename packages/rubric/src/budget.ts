import type { Critique, CritiqueRec } from './critique';
import type { BriefEntry } from './intake';

/** Low end of an item's priced range in cents, or null when it can't be priced. */
export type LowCentsOf = (rec: CritiqueRec) => number | null;

const BUDGET_QUESTION = 'Q13';
const DROP_SENTENCE = /\bdrop\b/i;
const STOP_WORDS = new Set(['the', 'and', 'add', 'lay', 'one', 'two', 'for', 'with', 'into', 'from', 'under', 'around', 'off', 'swap', 'edit', 'set']);

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const stems = (title: string) =>
  title
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .map((w) => w.replace(/s$/, ''));

function budgetCents(brief: BriefEntry[]): number | null {
  const high = brief.find((b) => b.questionId === BUDGET_QUESTION)?.parsed?.budgetHighUsd;
  return typeof high === 'number' && high > 0 ? high * 100 : null;
}

/**
 * Indexes of recommendations in the order to cut them. Items named in the
 * roomRead's "drop X first, then Y" sentence come first, in the order named.
 * The rest follow from the bottom of the list up. The first item is never cut.
 */
export function dropOrder(c: Critique): number[] {
  const dropText = sentences(c.roomRead).filter((s) => DROP_SENTENCE.test(s)).join(' ').toLowerCase();
  const named: { i: number; at: number }[] = [];
  c.recommendations.forEach((rec, i) => {
    const hits = stems(rec.title).map((w) => dropText.search(new RegExp(`\\b${w.replace(/[^a-z0-9]/g, '\\$&')}`)));
    const at = Math.min(...hits.filter((h) => h >= 0));
    if (Number.isFinite(at)) named.push({ i, at });
  });
  const first = named.sort((a, b) => a.at - b.at).map((n) => n.i);
  const rest = c.recommendations.map((_, i) => i).reverse().filter((i) => !first.includes(i));
  return [...first, ...rest].filter((i) => i !== 0);
}

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/**
 * Cuts items, in drop order, until the low end of the priced total fits the
 * stated budget. The critique model never sees prices, so this is the only
 * place the plan is held to the budget. Idempotent: a plan that fits is returned as is.
 */
export function fitBudget(c: Critique, brief: BriefEntry[], lowCentsOf: LowCentsOf): Critique {
  const budget = budgetCents(brief);
  if (budget === null) return c;
  const low = c.recommendations.map((r) => lowCentsOf(r) ?? 0);
  let total = low.reduce((a, b) => a + b, 0);
  if (total <= budget) return c;

  const cut = new Set<number>();
  for (const i of dropOrder(c)) {
    if (total <= budget) break;
    if (low[i]! <= 0) continue;
    cut.add(i);
    total -= low[i]!;
  }
  if (!cut.size) return c;

  const out: Critique = structuredClone(c);
  const titles = c.recommendations.filter((_, i) => cut.has(i)).map((r) => r.title);
  out.recommendations = c.recommendations.filter((_, i) => !cut.has(i)).map((r) => structuredClone(r));
  const kept = sentences(out.roomRead).filter((s) => !DROP_SENTENCE.test(s));
  const note = `To fit the ${dollars(budget)} budget (${BUDGET_QUESTION}), this plan leaves out ${titles.join(', ')}. Add ${titles.length > 1 ? 'them' : 'it'} back if the budget grows.`;
  out.roomRead = [...kept, note].join(' ');
  return out;
}
