import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIMENSION_KEYS } from '@foyer/rubric';
import { summarize } from '../src/score';
import type { CaseResult } from '../src/types';

const result = (caseId: string, score: number, overrides: Record<string, number> = {}) => {
  const scores = Object.fromEntries(DIMENSION_KEYS.map((k) => [k, { score: overrides[k] ?? score, reason: '' }]));
  const vals = Object.values(scores).map((s) => s.score);
  return { caseId, judgement: { scores, failures: [], mean: vals.reduce((a, b) => a + b, 0) / vals.length } } as unknown as CaseResult;
};

test('ship bar passes a clean run', () => {
  const s = summarize([result('a', 5), result('b', 5, { credibility: 4, restraint: 4 })], 2);
  assert.ok(s.passed, s.blockers.join('; '));
});

test('ship bar blocks a weak case, a weak dimension, and missing cases', () => {
  const weakCase = summarize([result('a', 5), result('b', 5, { relevance: 2, specificity: 2, credibility: 3 })], 2);
  assert.ok(weakCase.blockers.some((b) => b.startsWith('Case b')));

  const weakDim = summarize([result('a', 5, { credibility: 3 }), result('b', 5, { credibility: 3 })], 2);
  assert.ok(weakDim.blockers.some((b) => b.includes('under its floor of 3.50')));

  const missing = summarize([result('a', 5)], 2);
  assert.ok(missing.blockers.includes('1 of 2 cases scored'));
});
