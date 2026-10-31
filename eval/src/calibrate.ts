import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIMENSION_KEYS, type DimensionKey } from '@foyer/rubric';
import type { CaseResult } from './types';

/**
 * Compares designer scores to the judge's on a blind packet.
 *
 *   pnpm --filter @foyer/eval calibrate <runId>
 *
 * Reads results/<runId>/scores/<reviewer>.json (from `blind`'s TEMPLATE.json)
 * and blind-key.json. Prints bias and agreement per dimension, then every item
 * where the judge and a designer differ by a point or more, with the judge's
 * reason, so the judge prompt can be fixed against real disagreements.
 */

type Sheet = { reviewer: string; scores: Record<string, Partial<Record<DimensionKey, number | null>>> };

const [runId] = process.argv.slice(2);
if (!runId) {
  console.error('usage: calibrate <runId>');
  process.exit(1);
}
const dir = join(import.meta.dirname, '..', 'results', runId);
const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as { results: CaseResult[] };
const { key } = JSON.parse(readFileSync(join(dir, 'blind-key.json'), 'utf8')) as { key: Record<string, string> };
const byCase = new Map(run.results.map((r) => [r.caseId, r]));

const scoresDir = join(dir, 'scores');
const sheets = existsSync(scoresDir)
  ? readdirSync(scoresDir)
      .filter((f) => f.endsWith('.json') && f !== 'TEMPLATE.json')
      .map((f) => JSON.parse(readFileSync(join(scoresDir, f), 'utf8')) as Sheet)
  : [];
if (!sheets.length) {
  console.error(`no reviewer sheets in results/${runId}/scores`);
  process.exit(1);
}

const pairs: { dim: DimensionKey; label: string; reviewer: string; judge: number; designer: number }[] = [];
for (const s of sheets) {
  for (const [label, row] of Object.entries(s.scores)) {
    const r = byCase.get(key[label] ?? '');
    if (!r) continue;
    for (const dim of DIMENSION_KEYS) {
      const designer = row[dim];
      if (typeof designer !== 'number') continue;
      pairs.push({ dim, label, reviewer: s.reviewer, judge: r.judgement.scores[dim].score, designer });
    }
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (n: number) => (Number.isNaN(n) ? '  -  ' : n.toFixed(2).padStart(5));
const rows = DIMENSION_KEYS.map((dim) => {
  const p = pairs.filter((x) => x.dim === dim);
  return {
    dim,
    n: p.length,
    judge: mean(p.map((x) => x.judge)),
    designer: mean(p.map((x) => x.designer)),
    bias: mean(p.map((x) => x.judge - x.designer)),
    exact: mean(p.map((x) => (x.judge === x.designer ? 1 : 0))),
    within1: mean(p.map((x) => (Math.abs(x.judge - x.designer) <= 1 ? 1 : 0))),
  };
});

console.log(`${sheets.length} reviewer(s) · ${Object.keys(key).length} rooms\n`);
console.log('dimension      n  judge designer  bias  exact within1');
for (const r of rows) {
  console.log(`${r.dim.padEnd(13)}${String(r.n).padStart(3)} ${f(r.judge)}  ${f(r.designer)}  ${f(r.bias)} ${f(r.exact)} ${f(r.within1)}`);
}

const gaps = pairs.filter((x) => Math.abs(x.judge - x.designer) >= 1).sort((a, b) => a.dim.localeCompare(b.dim));
if (gaps.length) console.log('\ndisagreements');
for (const g of gaps) {
  const reason = byCase.get(key[g.label]!)!.judgement.scores[g.dim].reason;
  console.log(`\n${g.label} ${g.dim} judge ${g.judge} · ${g.reviewer} ${g.designer}\n  ${reason}`);
}

writeFileSync(join(dir, 'calibration.json'), JSON.stringify({ rows, gaps }, null, 2));
console.log(`\nresults/${runId}/calibration.json`);
