import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costIndex, indexCsv, regionFactor, type Observation } from '@foyer/cost';

const obs = (n: number, zip = '02139', per = [250, 300, 350, 400, 450], actual = false): Observation[] =>
  Array.from({ length: n }, (_, i) => ({
    zip,
    workType: 'interior_paint',
    quotedCents: per[i % per.length]! * 100,
    actualCents: actual && i === 0 ? per[i % per.length]! * 100 : null,
    quantity: 100,
    observedAt: new Date(2026, 0, i + 1),
  }));

test('cells under the minimum are suppressed', () => {
  const idx = costIndex(obs(4));
  assert.equal(idx.cells.length, 0);
  assert.equal(idx.suppressed, 1);
  assert.equal(idx.points, 0);
});

test('quantiles are per unit', () => {
  const [c] = costIndex(obs(5)).cells;
  assert.ok(c);
  assert.equal(c.zip3, '021');
  assert.equal(c.n, 5);
  assert.equal(c.p25Cents, 300);
  assert.equal(c.medianCents, 350);
  assert.equal(c.p75Cents, 400);
});

test('invoices are counted and override the quote', () => {
  const [c] = costIndex(obs(5, '02139', [250, 300, 350, 400, 450], true)).cells;
  assert.equal(c?.invoices, 1);
});

test('delta compares the median to the regional baseline', () => {
  const [c] = costIndex(obs(5)).cells;
  const base = Math.round(300 * regionFactor('02100').factor);
  assert.equal(c?.baselineCents, base);
  assert.equal(c?.delta, Math.round((350 / base - 1) * 1000) / 1000);
});

test('bad zips, zero quantity, and unknown work types are ignored', () => {
  const bad: Observation[] = [
    ...obs(5, 'abc'),
    ...obs(5).map((o) => ({ ...o, quantity: 0 })),
    ...obs(5).map((o) => ({ ...o, workType: 'moat_dredging' })),
  ];
  const idx = costIndex(bad);
  assert.equal(idx.cells.length, 0);
  assert.equal(idx.suppressed, 0);
});

test('csv escapes commas and quotes', () => {
  const [c] = costIndex(obs(5)).cells;
  const csv = indexCsv([{ ...c!, label: 'Paint, "Eggshell"' }]);
  const [head, row] = csv.trim().split('\n');
  assert.ok(head?.startsWith('zip3,workType,label'));
  assert.ok(row?.includes('"Paint, ""Eggshell"""'));
});
