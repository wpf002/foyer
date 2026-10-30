import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RUBRIC_VERSION, SCORING_DIMENSIONS } from '@foyer/rubric';
import { summarize } from './score';
import type { JudgeResult } from './types';

/**
 * Regression runner. Every rubric or prompt change runs this and the score has
 * to move the right way. This is how output quality gets iterated without
 * vibes, and it is why eval/ exists before apps/web has anything real in it.
 */

const GOLDEN = join(import.meta.dirname, '..', 'golden');

function cases(): string[] {
  if (!existsSync(GOLDEN)) return [];
  return readdirSync(GOLDEN, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

async function main() {
  const ids = cases();
  console.log(`rubric ${RUBRIC_VERSION} · ${ids.length} golden cases`);

  if (ids.length === 0) {
    console.log('\nNo golden cases yet. Add real rooms under eval/golden before trusting a score.');
    console.log('Dimensions the judge will score:');
    for (const d of SCORING_DIMENSIONS) console.log(`  ${d.key.padEnd(13)} ${d.question}`);
    process.exit(0);
  }

  // Phase 1: generate a brief per case through packages/ai, score it with the
  // judge prompt, then summarize. Wired once the critique chain exists.
  const results: JudgeResult[] = [];
  const summary = summarize(results);

  console.log(`\nmean ${summary.mean}  ${summary.passed ? 'PASS' : 'FAIL'}`);
  for (const [k, v] of Object.entries(summary.perDimension)) console.log(`  ${k.padEnd(13)} ${v}`);
  for (const b of summary.blockers) console.log(`  ! ${b}`);
  process.exit(summary.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
