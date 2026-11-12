import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitBudget, type BriefEntry, type Critique } from '@foyer/rubric';
import { scopeOf } from '@foyer/cost';

const rec = (title: string) => ({ category: 'FUNCTIONAL', title, rationale: '', citation: 'Q03', effort: 'WEEKEND', needsProReview: false });
const critique = {
  roomRead: 'Seating is the complaint. If the priced total runs over, drop the pillow edit first, then the second stool, then the rug. Keep the chair.',
  recommendations: [rec('Add One Lounge Chair'), rec('Add Two Stackable Wood Stools'), rec('Add A Table Lamp'), rec('Lay An 8x10 Wool-Jute Rug'), rec('Edit Pillows To Two Neutral Tones')],
  leaveAlone: [],
  palette: { colors: [], reasoning: '', citations: [] },
  problems: [],
} as unknown as Critique;
const low: Record<string, number> = { 'Add One Lounge Chair': 40000, 'Add Two Stackable Wood Stools': 20000, 'Add A Table Lamp': 8000, 'Lay An 8x10 Wool-Jute Rug': 32000, 'Edit Pillows To Two Neutral Tones': 0 };
const lowOf = (r: { title: string }) => low[r.title] ?? null;
const budget = (usd?: number) =>
  [{ questionId: 'Q13', raw: '', parsed: usd ? { tags: [], flags: [], budgetLowUsd: usd, budgetHighUsd: usd } : { tags: [], flags: [] } }] as unknown as BriefEntry[];

test('fitBudget cuts in the named drop order until the low total fits', () => {
  const out = fitBudget(critique, budget(700), lowOf);
  assert.deepEqual(out.recommendations.map((r) => r.title), ['Add One Lounge Chair', 'Add A Table Lamp', 'Edit Pillows To Two Neutral Tones']);
  assert.ok(out.roomRead.includes('To fit the $700 budget (Q13), this plan leaves out Add Two Stackable Wood Stools, Lay An 8x10 Wool-Jute Rug.'));
  assert.ok(!out.roomRead.includes('drop the pillow'));
  assert.deepEqual(fitBudget(out, budget(700), lowOf), out);
});

test('fitBudget leaves a plan alone with no budget or when it fits', () => {
  assert.equal(fitBudget(critique, budget(), lowOf), critique);
  assert.equal(fitBudget(critique, budget(5000), lowOf), critique);
});

test('regrouping seating prices as a rearrange, not a purchase', () => {
  assert.equal(scopeOf({ title: 'Regroup Seating Around The TV Stand', rationale: 'Pull the stools in.', category: 'FUNCTIONAL' })?.workType, 'rearrange');
});
