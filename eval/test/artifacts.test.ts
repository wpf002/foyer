import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARTIFACT_TYPES, buildArtifact, range, SLUG, typeOfSlug, type ArtifactInput, type Block } from '@foyer/artifacts';

const base = (): ArtifactInput => ({
  project: { name: 'Elm Court', zip: '60614', city: 'Chicago, IL', budgetLowCents: 1_000_000, budgetHighCents: 2_000_000 },
  answers: [
    { questionId: 'Q07', section: 'LIFE', prompt: 'Mood?', raw: 'Quiet and warm.' },
    { questionId: 'Q10', section: 'CONSTRAINTS', prompt: 'Keep?', raw: 'The built-in bookcase.' },
  ],
  rooms: [{ id: 'r1', name: 'Kitchen', fixed: ['Window at sink'] }],
  recs: [
    { id: 'c1', roomId: 'r1', title: 'Widen The Opening', category: 'STRUCTURAL', citation: 'Q03', preserve: null, needsProReview: true },
    { id: 'c2', roomId: 'r1', title: 'Warm Pendant', category: 'ATMOSPHERIC', citation: 'Q07', preserve: 'Oak floors', needsProReview: false },
  ],
  items: [
    { id: 'i1', recommendationId: 'c2', phase: 'QUICK_WINS', order: 1, scope: 'Swap Pendant', why: 'Mood.', path: 'DIY', permit: 'NONE', lowCents: 20_000, highCents: 40_000, riskNote: null, dependsOn: [] },
    { id: 'i2', recommendationId: 'c1', phase: 'MAJOR', order: 1, scope: 'Widen Kitchen Opening', why: 'Sightline.', path: 'LICENSED_CONTRACTOR', permit: 'REQUIRED', lowCents: 900_000, highCents: 2_100_000, riskNote: 'A structural engineer has to confirm the load path.', dependsOn: [] },
    { id: 'i3', recommendationId: null, phase: 'MAJOR', order: 2, scope: 'Add Kitchen Circuit', why: 'Load.', path: 'LICENSED_CONTRACTOR', permit: 'LIKELY', lowCents: null, highCents: null, riskNote: null, dependsOn: [{ id: 'i2', reason: 'Wall is open.' }] },
  ],
  issuedAt: '2026-10-31T00:00:00.000Z',
});

const text = (blocks: Block[]) => JSON.stringify(blocks);

test('ranges format and unpriced items say so', () => {
  assert.equal(range(20_000, 40_000), '$200–$400');
  assert.equal(range(null, null), 'Not Priced');
});

test('every type builds with a title and no empty sections', () => {
  for (const t of ARTIFACT_TYPES) {
    const doc = buildArtifact(t, base());
    assert.equal(typeOfSlug(SLUG[t]), t);
    assert.ok(doc.sections.length > 0, t);
    for (const s of doc.sections) {
      assert.ok(s.blocks.length > 0, `${t}: ${s.heading}`);
      assert.ok(s.blocks.some((b) => b.kind !== 'prose'), `${t}: ${s.heading} is prose only`);
    }
  }
});

test('sections with nothing to say are dropped', () => {
  const input = base();
  input.items = input.items.map((i) => ({ ...i, permit: 'NONE', riskNote: null, dependsOn: [] }));
  input.recs = input.recs.map((r) => ({ ...r, needsProReview: false }));
  const doc = buildArtifact('CONTRACTOR_BRIEF', input);
  const headings = doc.sections.map((s) => s.heading);
  assert.ok(!headings.some((h) => /permit/i.test(h)), headings.join(', '));
  assert.ok(!headings.some((h) => /review/i.test(h)), headings.join(', '));
});

test('permit checklist lists flagged items and never decides', () => {
  const doc = buildArtifact('PERMIT_CHECKLIST', base());
  const all = text(doc.sections.flatMap((s) => s.blocks));
  assert.match(all, /Widen Kitchen Opening/);
  assert.match(all, /Add Kitchen Circuit/);
  assert.doesNotMatch(all, /Swap Pendant/);
  assert.doesNotMatch(all, /no permit (is )?(needed|required)/i);
  assert.doesNotMatch(all, /is not load[- ]bearing/i);
});

test('contractor questions cover hired items only', () => {
  const doc = buildArtifact('CONTRACTOR_QUESTIONS', base());
  const groups = doc.sections.flatMap((s) => s.blocks).flatMap((b) => (b.kind === 'questions' ? b.groups : []));
  const labels = groups.map((g) => g.label).join(' | ');
  assert.match(labels, /Widen Kitchen Opening/);
  assert.doesNotMatch(labels, /Swap Pendant/);
  for (const g of groups) assert.ok(g.items.length > 0 && g.items.length <= 4, g.label);
});

test('output is deterministic', () => {
  for (const t of ARTIFACT_TYPES) assert.deepEqual(buildArtifact(t, base()), buildArtifact(t, base()));
});
