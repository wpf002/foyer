import { CASE_FLOOR, DIMENSION_FLOOR, FLOOR_PER_DIMENSION, PASS_THRESHOLD, SCORING_DIMENSIONS } from '@foyer/rubric';
import type { CaseResult } from './types';

export interface RunSummary {
  mean: number;
  perDimension: Record<string, number>;
  passed: boolean;
  blockers: string[];
}

/** `expected` is how many cases should have scored; fewer is a blocker. */
export function summarize(results: CaseResult[], expected = results.length): RunSummary {
  const perDimension: Record<string, number> = {};
  const blockers: string[] = [];

  for (const d of SCORING_DIMENSIONS) {
    const vals = results.map((r) => r.judgement.scores[d.key].score);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    perDimension[d.key] = Number(mean.toFixed(2));

    const floor = FLOOR_PER_DIMENSION[d.key] ?? DIMENSION_FLOOR;
    if (mean < floor) {
      blockers.push(`${d.label} ${mean.toFixed(2)} is under its floor of ${floor.toFixed(2)}`);
    }
  }

  const all = Object.values(perDimension);
  const mean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  if (mean < PASS_THRESHOLD) {
    blockers.push(`Mean ${mean.toFixed(2)} is under the threshold of ${PASS_THRESHOLD.toFixed(2)}`);
  }

  for (const r of results) {
    if (r.judgement.mean < CASE_FLOOR) {
      blockers.push(`Case ${r.caseId} ${r.judgement.mean.toFixed(2)} is under the case floor of ${CASE_FLOOR.toFixed(2)}`);
    }
  }
  if (results.length < expected) {
    blockers.push(`${results.length} of ${expected} cases scored`);
  }

  return { mean: Number(mean.toFixed(2)), perDimension, passed: blockers.length === 0, blockers };
}
