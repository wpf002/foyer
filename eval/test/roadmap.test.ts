import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTransport, type ModelResponse, type Tier } from '@foyer/ai';
import { buildRoadmap, planRoadmap, stagesOf, type DraftItem, type RoadmapRec } from '@foyer/rubric';

const rec = (id: string, over: Partial<RoadmapRec> = {}): RoadmapRec => ({
  id,
  room: 'Living',
  category: 'COSMETIC',
  title: 'Item',
  rationale: 'Because Q07 says so.',
  effort: 'WEEKEND',
  needsProReview: false,
  priority: 0,
  ...over,
});

const ids = (n: number) => new Map(Array.from({ length: n }, (_, i) => [`R${i + 1}`, `r${i + 1}`]));
const draft = (recId: string, over: Partial<DraftItem> = {}): DraftItem => ({
  recId,
  scope: 'Scope',
  why: 'Why.',
  phase: 'QUICK_WINS',
  path: 'DIY',
  permit: 'NONE',
  ...over,
});
const order = (r: ReturnType<typeof planRoadmap>) => r.items.map((i) => i.recId);

test('stagesOf reads trade stages from the title', () => {
  assert.deepEqual(stagesOf(rec('a', { title: 'Limewash The Walls' })), ['paint']);
  assert.deepEqual(stagesOf(rec('a', { title: 'Refinish Oak Floors, Satin' })), ['floor']);
  assert.deepEqual(stagesOf(rec('a', { category: 'STRUCTURAL', title: 'Widen The Opening', rationale: 'Then rewire the switch.' })), [
    'structure',
    'rough',
  ]);
});

test('paint comes before floor refinishing in the same room, by rule', () => {
  const recs = [rec('r1', { title: 'Refinish Oak Floors', effort: 'WEEK' }), rec('r2', { title: 'Limewash Walls', effort: 'WEEK' })];
  const r = planRoadmap(recs, [draft('R1', { phase: 'MID_RANGE' }), draft('R2', { phase: 'MID_RANGE' })], ids(2));
  assert.deepEqual(order(r), ['r2', 'r1']);
  assert.equal(r.edges.length, 1);
  assert.equal(r.edges[0]!.source, 'rule');
  assert.equal(r.edges[0]!.prerequisite, 'r2');
});

test('rules do not cross rooms', () => {
  const recs = [rec('r1', { title: 'Refinish Floors', room: 'Bedroom' }), rec('r2', { title: 'Paint Walls', room: 'Living' })];
  const r = planRoadmap(recs, [draft('R1'), draft('R2')], ids(2));
  assert.equal(r.edges.length, 0);
});

test('a model edge that contradicts trade order is dropped', () => {
  const recs = [rec('r1', { title: 'Refinish Floors' }), rec('r2', { title: 'Paint Walls' })];
  const r = planRoadmap(recs, [draft('R1'), draft('R2', { dependsOn: [{ recId: 'R1', reason: 'Floors first.' }] })], ids(2));
  assert.equal(r.edges.length, 1);
  assert.equal(r.edges[0]!.prerequisite, 'r2');
  assert.ok(r.notes.some((n) => n.includes('loops')));
});

test('pro review forces a licensed path and a risk note', () => {
  const recs = [
    rec('r1', {
      title: 'Add Sconces',
      category: 'ATMOSPHERIC',
      effort: 'WEEK',
      needsProReview: true,
      rationale: 'Two sconces flank the bed. A licensed electrician runs the new circuit.',
    }),
  ];
  const r = planRoadmap(recs, [draft('R1', { path: 'DIY' })], ids(1));
  const it = r.items[0]!;
  assert.equal(it.path, 'LICENSED_CONTRACTOR');
  assert.equal(it.phase, 'MID_RANGE');
  assert.match(it.riskNote ?? '', /electrician/);
});

test('permit is never stated as required, and structural work is never permit-free', () => {
  const recs = [
    rec('r1', { category: 'STRUCTURAL', title: 'Widen Opening', effort: 'MULTI_WEEK', needsProReview: true }),
    rec('r2', { category: 'STRUCTURAL', title: 'Move Doorway', effort: 'MULTI_WEEK', needsProReview: true, room: 'Hall' }),
  ];
  const r = planRoadmap(recs, [draft('R1', { permit: 'REQUIRED' }), draft('R2', { permit: 'NONE' })], ids(2));
  const by = new Map(r.items.map((i) => [i.recId, i]));
  assert.equal(by.get('r1')!.permit, 'LIKELY');
  assert.equal(by.get('r2')!.permit, 'UNKNOWN');
  assert.ok(r.items.every((i) => i.phase === 'MAJOR'));
});

test('a dependent is pulled up to its prerequisite phase', () => {
  const recs = [
    rec('r1', { category: 'STRUCTURAL', title: 'Widen Opening', effort: 'MULTI_WEEK', needsProReview: true }),
    rec('r2', { title: 'Hang Curtains' }),
  ];
  const r = planRoadmap(recs, [draft('R1', { phase: 'MAJOR' }), draft('R2')], ids(2));
  const curtains = r.items.find((i) => i.recId === 'r2')!;
  assert.equal(curtains.phase, 'MAJOR');
  assert.deepEqual(order(r), ['r1', 'r2']);
});

test('implied edges are removed', () => {
  const recs = [rec('r1', { title: 'Paint Walls' }), rec('r2', { title: 'Refinish Floors' }), rec('r3', { title: 'New Rug' })];
  const r = planRoadmap(recs, [draft('R1'), draft('R2'), draft('R3')], ids(3));
  // paint -> floor -> rug; paint -> rug is implied and dropped.
  assert.deepEqual(
    r.edges.map((e) => `${e.prerequisite}>${e.dependent}`).sort(),
    ['r1>r2', 'r2>r3'],
  );
  assert.deepEqual(order(r), ['r1', 'r2', 'r3']);
});

test('missing drafts are filled and unknown ids dropped', () => {
  const recs = [rec('r1', { title: 'Swap Bulbs To 2700K' }), rec('r2', { title: 'Reupholster Chair', effort: 'WEEK' })];
  const r = planRoadmap(recs, [draft('R1'), draft('R9')], ids(2));
  assert.equal(r.items.length, 2);
  const filled = r.items.find((i) => i.recId === 'r2')!;
  assert.equal(filled.scope, 'Reupholster Chair');
  assert.equal(filled.path, 'HANDYMAN');
  assert.equal(filled.phase, 'MID_RANGE');
  assert.ok(r.notes.some((n) => n.includes('R9')));
});

test('orders restart at 1 in each phase', () => {
  const recs = [rec('r1'), rec('r2', { room: 'Bed' }), rec('r3', { effort: 'WEEK', room: 'Hall' })];
  const r = planRoadmap(recs, [draft('R1'), draft('R2'), draft('R3', { phase: 'MID_RANGE' })], ids(3));
  assert.deepEqual(
    r.items.map((i) => `${i.phase}:${i.order}`),
    ['QUICK_WINS:1', 'QUICK_WINS:2', 'MID_RANGE:1'],
  );
});

test('buildRoadmap sends short ids and maps them back', async () => {
  let sent = '';
  setTransport(async (body: Record<string, unknown>, _t: Tier): Promise<ModelResponse> => {
    sent = JSON.stringify(body);
    return {
      model: 'm',
      text: JSON.stringify({ items: [draft('R1', { scope: 'Hang Curtains High' })] }),
      usage: { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0, costUsd: 0 },
    };
  });
  try {
    const { roadmap } = await buildRoadmap([rec('ckabc123', { title: 'Rehang Curtains' })], 'u');
    assert.match(sent, /R1 \[Living\]/);
    assert.doesNotMatch(sent, /ckabc123/);
    assert.equal(roadmap.items[0]!.recId, 'ckabc123');
    assert.equal(roadmap.items[0]!.scope, 'Hang Curtains High');
  } finally {
    setTransport(undefined);
  }
});
