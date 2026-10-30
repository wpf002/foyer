import { randomInt } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseResult } from './types';

/**
 * Designer review packet. Shuffles a run's critiques, strips case ids and
 * scores, and writes one markdown file per room plus a separate key.
 *
 *   pnpm --filter @foyer/eval blind <runId> [count]
 */

const [runId, countArg] = process.argv.slice(2);
if (!runId) {
  console.error('usage: blind <runId> [count]');
  process.exit(1);
}

const dir = join(import.meta.dirname, '..', 'results', runId);
const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as { promptHash: string; results: CaseResult[] };
const pool = [...run.results];
for (let i = pool.length - 1; i > 0; i--) {
  const j = randomInt(i + 1);
  [pool[i], pool[j]] = [pool[j]!, pool[i]!];
}
const sample = pool.slice(0, Number(countArg) || pool.length);

const out = join(dir, 'blind');
mkdirSync(out, { recursive: true });
const key: Record<string, string> = {};

sample.forEach((r, i) => {
  const label = `B${String(i + 1).padStart(2, '0')}`;
  key[label] = r.caseId;
  const c = r.critique;
  const md = [
    `# ${label}`,
    '',
    '## Brief',
    ...r.brief.map((b) => `- **${b.questionId}** ${b.prompt} "${b.raw}"`),
    '',
    '## Room Read',
    c.roomRead,
    '',
    '## Recommendations',
    ...c.recommendations.map(
      (x, n) =>
        `### ${n + 1}. ${x.title}\n${x.category} · ${x.effort} · cites ${x.citation}${x.needsProReview ? ' · pro review' : ''}\n\n${x.rationale}${x.preserve ? `\n\nKeep: ${x.preserve}` : ''}`,
    ),
    '',
    '## Palette',
    ...c.palette.colors.map((p) => `- ${p.name} (${p.role}, ${p.undertone})`),
    '',
    c.palette.reasoning,
    '',
    '## Leave Alone',
    ...c.leaveAlone.map((l) => `- ${l.element}: ${l.reason}`),
    '',
    '## Your Review',
    'Would you send this to a client? (yes / with edits / no)',
    '',
    'What is wrong or missing?',
    '',
  ].join('\n');
  writeFileSync(join(out, `${label}.md`), md);
});

writeFileSync(join(dir, 'blind-key.json'), JSON.stringify({ promptHash: run.promptHash, key }, null, 2));
console.log(`${sample.length} files in results/${runId}/blind · key in results/${runId}/blind-key.json`);
