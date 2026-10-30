import { FLOOR_PER_DIMENSION, PASS_THRESHOLD, SCORING_DIMENSIONS } from '@foyer/rubric';
import type { JudgeResult } from './types';

export interface RunSummary {
  mean: number;
  perDimension: Record<string, number>;
  passed: boolean;
  blockers: string[];
}

export function summarize(results: JudgeResult[]): RunSummary {
  const perDimension: Record<string, number> = {};
  const blockers: string[] = [];

  for (const d of SCORING_DIMENSIONS) {
    const vals = results.map((r) => r.scores[d.key]?.score ?? 0);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    perDimension[d.key] = Number(mean.toFixed(2));

    const floor = FLOOR_PER_DIMENSION[d.key];
    if (floor !== undefined && mean < floor) {
      blockers.push(`${d.label} ${mean.toFixed(2)} is under its floor of ${floor.toFixed(2)}`);
    }
  }

  const all = Object.values(perDimension);
  const mean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  if (mean < PASS_THRESHOLD) {
    blockers.push(`Mean ${mean.toFixed(2)} is under the threshold of ${PASS_THRESHOLD.toFixed(2)}`);
  }

  return { mean: Number(mean.toFixed(2)), perDimension, passed: blockers.length === 0, blockers };
}
