import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_GENERATOR, boardOf, buildBoard } from '@foyer/artifacts';

test('board pulls color temperature and measurements', () => {
  const b = buildBoard({
    title: 'Light The Kitchen In Three Layers',
    rationale: 'Four 3-inch recessed on a dimmer, one warm pendant at 2700K, rods 6 inches above the head.',
  });
  assert.ok(b);
  assert.deepEqual(b.specs, [
    { label: 'Color Temp', value: '2700K' },
    { label: 'Measure', value: '3 in' },
    { label: 'Measure', value: '6 in' },
  ]);
});

test('specific finish names win over general ones', () => {
  const b = buildBoard({ title: 'Refinish The White Oak', rationale: 'Satin keeps the grain readable.' });
  assert.deepEqual(b?.swatches.map((s) => s.name), ['White Oak']);
  assert.equal(b?.specs.find((s) => s.label === 'Sheen')?.value, 'Satin');
});

test('materials named only in preserve are marked keep', () => {
  const b = buildBoard({
    title: 'Limewash The Walls',
    rationale: 'A warm plaster finish.',
    preserve: 'Keep the walnut built-ins and the plaster cornice.',
  });
  assert.deepEqual(
    b?.swatches.map((s) => [s.name, s.role]),
    [
      ['Limewash Plaster', 'new'],
      ['Walnut', 'keep'],
    ],
  );
});

test('a recommendation that names nothing gets no board', () => {
  assert.equal(buildBoard({ title: 'Move The Fridge', rationale: 'It blocks the walkway.' }), null);
});

test('board caps swatches at five, in order of mention', () => {
  const b = buildBoard({
    title: 'Materials',
    rationale: 'Marble, brass, walnut, linen, terracotta, slate and wool.',
  });
  assert.deepEqual(b?.swatches.map((s) => s.name), ['Honed Marble', 'Aged Brass', 'Walnut', 'Linen', 'Terracotta']);
});

test('boardOf only reads boards Foyer drew', () => {
  const board = { swatches: [], specs: [{ label: 'CRI', value: '90' }] };
  assert.deepEqual(boardOf({ generator: BOARD_GENERATOR, board }), board);
  assert.equal(boardOf({ generator: 'other', board }), null);
  assert.equal(boardOf(null), null);
});
