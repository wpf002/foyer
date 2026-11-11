import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumPlan } from '../../packages/cost/src/plan';

test('sumPlan adds priced lines and counts unpriced ones', () => {
  assert.deepEqual(
    sumPlan([
      { lowCents: 100, highCents: 300 },
      { lowCents: null, highCents: null },
      { lowCents: 50, highCents: 70 },
      { lowCents: 10, highCents: null },
    ]),
    { lowCents: 150, highCents: 370, unpriced: 2 },
  );
});

test('sumPlan of an empty roadmap is zero', () => {
  assert.deepEqual(sumPlan([]), { lowCents: 0, highCents: 0, unpriced: 0 });
});
