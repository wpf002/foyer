import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conceptPrompt, ledger, renderConcept } from '@foyer/ai';
import { regionFactor, STATE_FACTOR_SOURCE } from '@foyer/cost';

test('concept prompt carries only the recommendation', () => {
  const p = conceptPrompt({
    title: 'Limewash the living room walls',
    rationale: 'ignored',
    preserve: 'the original oak floor',
    specs: ['Walls limewash', 'Bulbs 2700K'],
  });
  assert.ok(p.includes('Limewash the living room walls'));
  assert.ok(p.includes('Walls limewash; Bulbs 2700K'));
  assert.ok(p.includes('Leave unchanged: the original oak floor'));
  assert.ok(p.includes('camera angle'));
  assert.ok(!p.includes('ignored'));
});

test('concept prompt drops empty parts', () => {
  const p = conceptPrompt({ title: 'Add a runner', rationale: '', preserve: null, specs: [] });
  assert.ok(!p.includes('Materials:'));
  assert.ok(!p.includes('Leave unchanged'));
});

test('render refuses without FAL_KEY and spends nothing', async () => {
  const prior = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  const before = ledger.spent('render-test').user;
  await assert.rejects(renderConcept({ userId: 'render-test', prompt: 'x', image: { mime: 'image/jpeg', data: '' } }), /FAL_KEY/);
  assert.equal(ledger.spent('render-test').user, before);
  if (prior !== undefined) process.env.FAL_KEY = prior;
});

test('state factors come from BLS construction wages', () => {
  assert.match(STATE_FACTOR_SOURCE, /BLS OEWS/);
  const mt = regionFactor('59801');
  assert.equal(mt.basis, 'state');
  assert.ok(mt.factor > 0.8 && mt.factor < 1.2);
  assert.ok(regionFactor('39201').factor < regionFactor('98501').factor, 'MS under WA');
});
