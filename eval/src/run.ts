import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { estimateCostUsd, ledger, modelFor } from '@foyer/ai';
import { price, scopeOf, sumPlan } from '@foyer/cost';
import {
  GOLDEN_SET_MIN,
  MAX_PHOTOS,
  RUBRIC_VERSION,
  briefBlock,
  critiqueRoom,
  critiqueSystemPrompt,
  enforceDrilling,
  fitBudget,
  enforceSafety,
  enforceTrades,
  syncSupporting,
  intakeParseSystemPrompt,
  judge,
  judgeSystemPrompt,
  parseIntake,
  roomMessage,
  runChecks,
  analyzePhotos,
  mergeRead,
  visionSystemPrompt,
  type BriefEntry,
  type Critique,
  type PhotoInput,
  type PhotoRead,
  type RoomInput,
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

/** Real and stock cases are scored for the gate. Synthetic cases only smoke-test the pipeline. */
const counts = (s: GoldenCase['meta']['source']) => s !== 'synthetic';

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
const critiqueKey = (room: RoomInput, brief: BriefEntry[]) =>
  `critique-${sha(critiqueSystemPrompt(), modelFor('design_critique'), briefBlock(brief), roomMessage(room))}`;

const MIME: Record<string, PhotoInput['mime']> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function photosFor(c: GoldenCase): PhotoInput[] {
  return (c.meta.photos ?? []).slice(0, MAX_PHOTOS).map((p) => {
    const mime = MIME[extname(p.file).toLowerCase()];
    if (!mime) throw new Error(`${c.meta.id}: ${p.file} is not JPEG, PNG, or WebP`);
    return { mime, data: readFileSync(join(c.dir, 'photos', p.file)).toString('base64') };
  });
}
const visionKey = (photos: PhotoInput[]) =>
  `vision-${sha(visionSystemPrompt(), modelFor('analyze_photo'), ...photos.map((p) => sha(p.data)))}`;

function estimate(cases: GoldenCase[]) {
  let total = 0;
  const rows: string[] = [];
  for (const c of cases) {
    const briefChars = JSON.stringify(c.brief).length;
    const parse = cached(parseKey(c)) ? 0 : estimateCostUsd('parse_intake_answer', intakeParseSystemPrompt().length + briefChars, 1200);
    const ctx = critiqueSystemPrompt().length + briefChars * 1.5 + roomMessage(c.room).length;
    const crit = estimateCostUsd('design_critique', ctx, 4000);
    const n = Math.min(c.meta.photos?.length ?? 0, MAX_PHOTOS);
    // Each image counts as 6,400 chars, matching messageChars() in @foyer/ai.
    const vis = n && !cached(visionKey(photosFor(c))) ? estimateCostUsd('analyze_photo', visionSystemPrompt().length + n * 6400, 4000) : 0;
    const jdg = estimateCostUsd('judge_output', judgeSystemPrompt().length + briefChars * 1.5 + 16_000, 1000);
    total += parse + vis + crit + jdg;
    rows.push(`  ${c.meta.id.padEnd(36)} $${(parse + vis + crit + jdg).toFixed(3)}`);
  }
  return { total, rows };
}

function gate(cases: GoldenCase[], passed: boolean): string[] {
  const real = cases.filter((c) => counts(c.meta.source));
  const count = (t: CaseTag) => real.filter((c) => c.meta.tags.includes(t)).length;
  const out: string[] = [];
  if (real.length < GOLDEN_SET_MIN) out.push(`${real.length} of ${GOLDEN_SET_MIN} scored cases`);
  if (count('leave-alone') < 4) out.push(`${count('leave-alone')} of 4 scored leave-alone cases`);
  if (count('load-bearing') < 3) out.push(`${count('load-bearing')} of 3 scored load-bearing cases`);
  if (!passed) out.push('judge score below threshold');

  const signoff = existsSync(SIGNOFF)
    ? (JSON.parse(readFileSync(SIGNOFF, 'utf8')) as { promptHash: string; reviewers: { approved: boolean }[] })
    : undefined;
  const approvals = signoff?.promptHash === promptHash ? signoff.reviewers.filter((r) => r.approved).length : 0;
  // No designers available: sign-offs are reported, not required.
  if (approvals < 2) console.log(`  note: designer sign-off skipped (${approvals} of 2 for prompt ${promptHash})`);
  return out;
}

/** Golden cases carry no zip, so prices use the national factor. */
const NATIONAL_ZIP = '';
const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString('en-US')}`;

/** Baseline low price of one item, the same scope and price the app uses. */
const lowCentsAt = (room: RoomInput) => (rec: Critique['recommendations'][number]) => {
  const scope = scopeOf({ title: rec.title, rationale: rec.rationale, category: rec.category, room });
  return scope ? (price(scope, NATIONAL_ZIP)?.lowCents ?? null) : null;
};

/** The block the judge sees under "## Priced items": what the app shows next to the plan. */
function pricingBlock(critique: Critique, room: RoomInput, brief: BriefEntry[]): string {
  const lines = critique.recommendations.map((rec) => {
    const scope = scopeOf({ title: rec.title, rationale: rec.rationale, category: rec.category, room });
    const priced = scope ? price(scope, NATIONAL_ZIP) : null;
    return { title: rec.title, lowCents: priced?.lowCents ?? null, highCents: priced?.highCents ?? null };
  });
  const total = sumPlan(lines);
  const budget = brief.find((b) => b.questionId === 'Q13')?.parsed;
  const low = typeof budget?.budgetLowUsd === 'number' ? budget.budgetLowUsd : null;
  const high = typeof budget?.budgetHighUsd === 'number' ? budget.budgetHighUsd : null;
  return [
    ...lines.map((l) =>
      l.lowCents === null || l.highCents === null ? `- ${l.title}: unpriced` : `- ${l.title}: ${dollars(l.lowCents)}–${dollars(l.highCents)}`,
    ),
    `Priced total: ${dollars(total.lowCents)}–${dollars(total.highCents)}${total.unpriced ? ` (${total.unpriced} unpriced)` : ''}`,
    `Budget (Q13): ${low !== null && high !== null ? `${dollars(low * 100)}–${dollars(high * 100)}` : 'not given'}`,
  ].join('\n');
}

async function runCase(c: GoldenCase): Promise<CaseResult> {
  let brief = cached<BriefEntry[]>(parseKey(c));
  if (!brief) {
    brief = await parseIntake(c.brief, USER);
    store(parseKey(c), brief);
  }

  // Photos fill what the typed room left out, the same way the app does.
  let room = c.room;
  const photos = photosFor(c);
  if (photos.length) {
    const vk = visionKey(photos);
    let read = cached<PhotoRead>(vk);
    if (!read) {
      read = (await analyzePhotos(photos, c.room, USER)).read;
      store(vk, read);
    }
    room = mergeRead(c.room, read);
  }

  const ck = critiqueKey(room, brief);
  let critique = cached<Critique>(ck);
  if (!critique) {
    critique = (await critiqueRoom(brief, room, USER)).critique;
    store(ck, critique);
  }
  // Cached critiques predate enforcement; it's idempotent, so apply it every time.
  critique = fitBudget(syncSupporting(enforceDrilling(enforceTrades(enforceSafety(critique)), brief), brief), brief, lowCentsAt(room));

  const checks = runChecks(critique, brief);
  const { judgement } = await judge(brief, room, critique, checks, USER, pricingBlock(critique, room, brief));
  return { caseId: c.meta.id, source: c.meta.source, brief, critique, checks, judgement };
}

async function main() {
  const cases = loadCases(args.case);
  const budget = Number(args.budget);
  ledger.setUserCap(USER, Number.isFinite(budget) && budget > 0 ? budget : 10);

  const scored = cases.filter((c) => counts(c.meta.source)).length;
  console.log(`rubric ${RUBRIC_VERSION} · prompt ${promptHash} · ${cases.length} cases (${scored} scored)`);
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
  const errored: string[] = [];
  for (const c of cases) {
    let r: CaseResult;
    try {
      r = await runCase(c);
    } catch (e) {
      // One bad case shouldn't throw away the rest of a paid run.
      errored.push(`${c.meta.id}: ${e instanceof Error ? e.message : String(e)}`);
      console.log(`\n${c.meta.id}  ERROR ${errored.at(-1)}`);
      if (/cap|budget/i.test(String(e))) break;
      continue;
    }
    results.push(r);
    console.log(`\n${c.meta.id}  mean ${r.judgement.mean}`);
    for (const f of r.judgement.failures) console.log(`  - ${f}`);
  }

  const counted = results.filter((r) => counts(r.source));
  const summary = counted.length ? summarize(counted, scored) : summarize(results, cases.length);
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
        errored,
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
  for (const e of errored) console.log(`  error: ${e}`);
  console.log(`\nspent $${spent.toFixed(3)} · results/${runId}/run.json`);
  process.exit(summary.passed && !errored.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
