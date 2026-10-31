import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countOf, geometry, MIN_LOCAL_POINTS, price, regionFactor, scopeOf, stateOf } from '@foyer/cost';

const room = { type: 'living', widthIn: 144, lengthIn: 168, ceilingIn: 108 };
const s = (title: string, rationale = '', category = 'COSMETIC') => scopeOf({ title, rationale, category, room });

test('work type comes from the title', () => {
  assert.equal(s('Limewash The Walls')?.workType, 'limewash');
  assert.equal(s('Refinish Oak Floors, Satin')?.workType, 'refinish_hardwood');
  assert.equal(s('Widen Kitchen-To-Dining Opening', '', 'STRUCTURAL')?.workType, 'structural_opening');
  assert.equal(s('Rehang Curtains At The Ceiling Line')?.workType, 'window_treatment');
  assert.equal(s('Pull The Sofa Off The Wall')?.workType, 'rearrange');
  assert.equal(s('Paint The Lower Cabinets')?.workType, 'cabinet_refinish');
  assert.equal(s('Swap Bulbs To 2700K')?.workType, 'bulb_swap');
  assert.equal(s('Remove The Wallpaper Border')?.workType, 'wallpaper');
});

test('unmatched recommendations stay unpriced', () => {
  assert.equal(s('Leave The Fireplace As Is'), null);
});

test('quantities come from room geometry and stated counts', () => {
  const g = geometry(room);
  assert.equal(g.floor, 168);
  assert.equal(g.perimeter, 52);
  assert.equal(g.wall, Math.round(52 * 9 * 0.85));
  assert.equal(s('Add Sconces', 'Two sconces flank the bed.')?.quantity, 2);
  assert.equal(countOf('a pair of lamps', 'lamps?', 1), 2);
  assert.equal(s('New Rug', 'An 8x10 wool flatweave.')?.quantity, 80);
  assert.equal(geometry({ type: 'bathroom' }).measured, false);
});

test('region uses metro, then state, then national', () => {
  assert.equal(regionFactor('94610').basis, 'metro');
  assert.equal(stateOf('59801'), 'MT');
  assert.equal(regionFactor('59801').basis, 'state');
  assert.equal(regionFactor('00901').basis, 'national');
});

test('price is a range scaled by quantity and region', () => {
  const p = price({ workType: 'interior_paint', quantity: 100, basis: '' }, '94610')!;
  assert.equal(p.midCents, Math.round((300 * 100 * 1.4) / 1000) * 1000);
  assert.ok(p.lowCents < p.midCents && p.midCents < p.highCents);
  assert.equal(p.source, 'BASELINE_STATIC');
  assert.equal(price({ workType: 'nope', quantity: 1, basis: '' }, '94610'), null);
});

test('flywheel blends only past the minimum, toward the local median', () => {
  const scope = { workType: 'interior_paint', quantity: 100, basis: '' };
  const base = price(scope, '94610')!;
  const few = price(scope, '94610', Array(MIN_LOCAL_POINTS - 1).fill(900))!;
  assert.equal(few.midCents, base.midCents);
  const many = price(scope, '94610', Array(20).fill(900))!;
  assert.equal(many.source, 'FOYER_FLYWHEEL');
  assert.equal(many.localPoints, 20);
  // 20 points against a prior of 20: halfway from 420 to 900 per unit.
  assert.equal(many.midCents, 66000);
  assert.ok(many.midCents > base.midCents);
});
