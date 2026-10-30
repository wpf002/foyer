import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { estimateCostUsd, ledger, modelFor } from '@foyer/ai';
import {
  GOLDEN_SET_MIN,
  RUBRIC_VERSION,
  briefBlock,
  critiqueRoom,
  critiqueSystemPrompt,
  intakeParseSystemPrompt,
  judge,
  judgeSystemPrompt,
  parseIntake,
  roomMessage,
  runChecks,
  type BriefEntry,
  type Critique,
} from '@foyer/rubric';
import { loadCases } from './cases';
import { summarize } from './score';
import type { CaseResult, CaseTag, GoldenCase } from './types';

/**
 * Regression runner. Every rubric or prompt change runs this and the score has
 * to move the right way.
 *
 *   pnpm eval --dry            validate cases, estimate spend, no model calls
 *   pnpm eval                  full run; parse and critique are cached by input hash
 *   pnpm eval --case <id>      one case
 *   pnpm eval --fresh          ignore the cache
 *   pnpm eval --budget 10      hard USD cap for this run (default 10)
 */

const RESULTS = join(import.meta.dirname, '..', 'results');
const CACHE = join(RESULTS, 'cache');
const SIGNOFF = join(import.meta.dirname, '..', 'signoff.json');
const USER = 'eval';

const { values: args } = parseArgs({
  options: {
    dry: { type: 'boolean', default: false },
    fresh: { type: 'boolean', default: false },
    case: { type: 'string' },
    budget: { type: 'string', default: '10' },
  },
});

const sha = (...parts: string[]) => createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16);
const promptHash = sha(intakeParseSystemPrompt(), critiqueSystemPrompt(), judgeSystemPrompt());

function cached<T>(key: string): T | undefined {
  const f = join(CACHE, `${key}.json`);
  return !args.fresh && existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : undefined;
}
function store(key: string, v: unknown) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(join(CACHE, `${key}.json`), JSON.stringify(v, null, 2));
}

const parseKey = (c: GoldenCase) => `parse-${sha(intakeParseSystemPrompt(), modelFor('parse_intake_answer'), JSON.stringify(c.brief))}`;
const critiqueKey = (c: GoldenCase, brief: BriefEntry[]) =>
  `critique-${sha(critiqueSystemPrompt(), modelFor('design_critique'), briefBlock(brief), roomMessage(c.room))}`;

function estimate(cases: GoldenCase[]) {
  let total = 0;
  const rows: string[] = [];
  for (const c of cases) {
    const briefChars = JSON.stringify(c.brief).length;
    const parse = cached(parseKey(c)) ? 0 : estimateCostUsd('parse_intake_answer', intakeParseSystemPrompt().length + briefChars, 1200);
    const ctx = critiqueSystemPrompt().length + briefChars * 1.5 + roomMessage(c.room).length;
    const crit = estimateCostUsd('design_critique', ctx, 4000);
    const jdg = estimateCostUsd('judge_output', judgeSystemPrompt().length + briefChars * 1.5 + 16_000, 1000);
    total += parse + crit + jdg;
    rows.push(`  ${c.meta.id.padEnd(36)} $${(parse + crit + jdg).toFixed(3)}`);
  }
  return { total, rows };
}

function gate(cases: GoldenCase[], passed: boolean): string[] {
  const real = cases.filter((c) => c.meta.source === 'real');
  const count = (t: CaseTag) => real.filter((c) => c.meta.tags.includes(t)).length;
  const out: string[] = [];
  if (real.length < GOLDEN_SET_MIN) out.push(`${real.length} of ${GOLDEN_SET_MIN} real cases`);
  if (count('leave-alone') < 4) out.push(`${count('leave-alone')} of 4 real leave-alone cases`);
  if (count('load-bearing') < 3) out.push(`${count('load-bearing')} of 3 real load-bearing cases`);
  if (!passed) out.push('judge score below threshold');

  const signoff = existsSync(SIGNOFF)
    ? (JSON.parse(readFileSync(SIGNOFF, 'utf8')) as { promptHash: string; reviewers: { approved: boolean }[] })
    : undefined;
  const approvals = signoff?.promptHash === promptHash ? signoff.reviewers.filter((r) => r.approved).length : 0;
  if (approvals < 2) out.push(`${approvals} of 2 designer sign-offs for prompt ${promptHash}`);
  return out;
}

async function runCase(c: GoldenCase): Promise<CaseResult> {
  let brief = cached<BriefEntry[]>(parseKey(c));
  if (!brief) {
    brief = await parseIntake(c.brief, USER);
    store(parseKey(c), brief);
  }

  const ck = critiqueKey(c, brief);
  let critique = cached<Critique>(ck);
  if (!critique) {
    critique = (await critiqueRoom(brief, c.room, USER)).critique;
    store(ck, critique);
  }

  const checks = runChecks(critique, brief);
  const { judgement } = await judge(brief, c.room, critique, checks, USER);
  return { caseId: c.meta.id, source: c.meta.source, brief, critique, checks, judgement };
}

async function main() {
  const cases = loadCases(args.case);
  const budget = Number(args.budget);
  ledger.setUserCap(USER, Number.isFinite(budget) && budget > 0 ? budget : 10);

  const real = cases.filter((c) => c.meta.source === 'real').length;
  console.log(`rubric ${RUBRIC_VERSION} · prompt ${promptHash} · ${cases.length} cases (${real} real)`);
  console.log(
    `models: cheap ${modelFor('parse_intake_answer')} · reasoning ${modelFor('design_critique')} · judge ${modelFor('judge_output')}`,
  );
  if (cases.length === 0) {
    console.log('\nNo golden cases. Add rooms under eval/golden before trusting a score.');
    process.exit(0);
  }

  const est = estimate(cases);
  console.log(`\nestimated spend (worst case, no cache discount): $${est.total.toFixed(2)}`);
  for (const r of est.rows) console.log(r);

  if (args.dry) {
    console.log('\ndry run: cases valid, no model calls made');
    for (const g of gate(cases, false)) console.log(`  gate: ${g}`);
    process.exit(0);
  }

  const results: CaseResult[] = [];
  for (const c of cases) {
    const r = await runCase(c);
    results.push(r);
    console.log(`\n${c.meta.id}  mean ${r.judgement.mean}`);
    for (const f of r.judgement.failures) console.log(`  - ${f}`);
  }

  const counted = results.filter((r) => r.source === 'real');
  const summary = summarize(counted.length ? counted : results);
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(RESULTS, runId);
  mkdirSync(dir, { recursive: true });
  const spent = ledger.spent(USER).user;
  writeFileSync(
    join(dir, 'run.json'),
    JSON.stringify(
      {
        runId,
        rubricVersion: RUBRIC_VERSION,
        promptHash,
        judgeModel: modelFor('judge_output'),
        spentUsd: spent,
        summary,
        results,
      },
      null,
      2,
    ),
  );

  console.log(`\nmean ${summary.mean}  ${summary.passed ? 'PASS' : 'FAIL'}${counted.length ? '' : ' (synthetic only)'}`);
  for (const [k, v] of Object.entries(summary.perDimension)) console.log(`  ${k.padEnd(13)} ${v}`);
  for (const b of summary.blockers) console.log(`  ! ${b}`);
  for (const g of gate(cases, summary.passed)) console.log(`  gate: ${g}`);
  console.log(`\nspent $${spent.toFixed(3)} · results/${runId}/run.json`);
  process.exit(summary.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
