import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modelFor, setTransport, type ModelResponse } from '@foyer/ai';
import {
  applyCaps,
  critiqueRoom,
  parseIntake,
  runChecks,
  type BriefEntry,
  type Critique,
} from '@foyer/rubric';
import { loadCases } from '../src/cases';


const usage = { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, costUsd: 0 };
const reply = (text: string, model = 'm'): ModelResponse => ({ model, text, usage });

const brief: BriefEntry[] = ['Q07', 'Q10', 'Q11'].map((q) => ({
  questionId: q,
  section: 'LIFE',
  prompt: '',
  raw: '',
  parsed: { tags: [], flags: [] },
}));

const base = (): Critique => ({
  roomRead: 'Galley with one pendant.',
  problems: [],
  recommendations: [
    { category: 'FUNCTIONAL', title: 'Swap Fridge Hinge', rationale: 'Door blocks the aisle, per Q10.', citation: 'Q10', effort: 'WEEKEND', needsProReview: false },
    { category: 'ATMOSPHERIC', title: 'Add Under-Cabinet Light', rationale: '2700K strips for the calm mood in Q07.', citation: 'Q07', effort: 'WEEKEND', needsProReview: false },
  ],
  palette: { colors: [], reasoning: 'Warm field for a calm room.', citations: ['Q07'] },
  leaveAlone: [{ element: 'Oak floor', reason: 'Client is keeping it.', citation: 'Q10' }],
});

test('clean critique passes every check', () => {
  assert.deepEqual(runChecks(base(), brief), []);
});

test('uncited recommendation caps traceability at 1', () => {
  const c = base();
  c.recommendations[0]!.citation = 'Q99';
  const f = runChecks(c, brief);
  assert.ok(f.some((x) => x.dimension === 'traceability' && x.cap === 1));
});

test('load-bearing assertion fails safety, hedged wording does not', () => {
  const c = base();
  c.recommendations[0]!.rationale = 'This wall is not load-bearing, so open it.';
  assert.ok(runChecks(c, brief).some((x) => x.dimension === 'safety' && x.cap === 1));

  c.recommendations[0]!.rationale = 'Have an engineer confirm whether the wall is load-bearing.';
  assert.ok(!runChecks(c, brief).some((x) => x.cap === 1));
});

test('permit assertion fails safety', () => {
  const c = base();
  c.recommendations[1]!.rationale = 'No permit needed for this.';
  assert.ok(runChecks(c, brief).some((x) => x.dimension === 'safety' && x.cap === 1));
});

test('widening an opening without pro review is flagged', () => {
  const c = base();
  c.recommendations[0]!.title = 'Widen The Dining Doorway To 42 Inches';
  assert.ok(runChecks(c, brief).some((x) => x.dimension === 'safety' && x.cap === 3));
});

test('judge scores are capped by checks and missing dimensions score 1', () => {
  const j = applyCaps(
    { scores: { restraint: { score: 5, reason: 'ok' }, relevance: { score: 4.6, reason: 'ok' } }, failures: ['x'] },
    [{ dimension: 'restraint', cap: 1, message: 'assertion' }],
  );
  assert.equal(j.scores.restraint.score, 1);
  assert.equal(j.scores.restraint.cappedFrom, 5);
  assert.equal(j.scores.relevance.score, 5);
  assert.equal(j.scores.credibility.score, 1);
  assert.equal(j.failures[0], '[check] assertion');
});

test('intake: choices never hit a model, free text is one cheap call', async () => {
  const calls: Record<string, unknown>[] = [];
  const tiers: string[] = [];
  setTransport(async (body, tier) => {
    calls.push(body);
    tiers.push(tier);
    return reply(JSON.stringify({ answers: [{ questionId: 'Q07', tags: ['Calm'], flags: ['made_up'] }] }));
  });
  const out = await parseIntake(
    [
      { questionId: 'Q02', raw: 'Longer' },
      { questionId: 'Q07', raw: 'Calm and warm.' },
      { questionId: 'Q15', raw: 'Own, Landmark District' },
    ],
    'u1',
  );
  setTransport(undefined);

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.model, modelFor('parse_intake_answer'));
  assert.equal(tiers[0], 'cheap');
  assert.deepEqual(calls[0]!.thinking, { type: 'disabled' });
  assert.equal(out.find((a) => a.questionId === 'Q02')!.parsed.stayYears, 15);
  assert.deepEqual(out.find((a) => a.questionId === 'Q07')!.parsed.flags, []);
  assert.deepEqual(out.find((a) => a.questionId === 'Q15')!.parsed.flags, ['historic_district_unknown']);
});

test('critique uses the reasoning tier with rubric and brief cached', async () => {
  let sent: Record<string, unknown> = {};
  setTransport(async (body) => {
    sent = body;
    return reply('```json\n' + JSON.stringify(base()) + '\n```');
  });
  const [c] = loadCases('000-synthetic-prescott-kitchen');
  const r = await critiqueRoom(brief, c!.room, 'u1');
  setTransport(undefined);

  assert.equal(sent.model, modelFor('design_critique'));
  const sys = sent.system as { cache_control?: unknown }[];
  assert.equal(sys.length, 2);
  assert.ok(sys.every((b) => b.cache_control));
  assert.equal(r.critique.recommendations.length, 2);
});

test('golden cases load and validate', () => {
  assert.ok(loadCases().length >= 1);
});

test('new wiring without pro review is flagged, bulb swaps are not', () => {
  const c = base();
  c.recommendations[1]!.rationale = 'Add two recessed downlights over the sink.';
  assert.ok(runChecks(c, brief).some((f) => f.dimension === 'safety'));
  c.recommendations[1]!.rationale = 'Fit a dim-to-warm bulb in the existing pendant, behind the under-cabinet light, per Q07.';
  assert.deepEqual(runChecks(c, brief), []);
});
