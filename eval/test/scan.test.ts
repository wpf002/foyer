import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometry, readScan, scanOf } from '@foyer/cost';

/** A wall of width w and height h centred at (x, z), running at angle a in the floor plane. */
const wall = (w: number, h: number, x: number, z: number, a: number) => ({
  dimensions: [w, h, 0],
  transform: [Math.cos(a), 0, Math.sin(a), 0, 0, 1, 0, 0, -Math.sin(a), 0, Math.cos(a), 0, x, h / 2, z, 1],
});

/** A 4 m × 5 m box, 2.7 m tall, rotated by `rot` around the origin. */
function box(rot: number, extra: Record<string, unknown> = {}) {
  const at = (x: number, z: number) => [x * Math.cos(rot) - z * Math.sin(rot), x * Math.sin(rot) + z * Math.cos(rot)] as const;
  const w = (len: number, x: number, z: number, a: number) => {
    const [px, pz] = at(x, z);
    return wall(len, 2.7, px, pz, a + rot);
  };
  return {
    walls: [w(4, 0, -2.5, 0), w(4, 0, 2.5, 0), w(5, -2, 0, Math.PI / 2), w(5, 2, 0, Math.PI / 2)],
    doors: [wall(0.9, 2.0, 0, -2.5, 0)],
    windows: [wall(1.2, 1.5, 0, 2.5, 0), wall(1.2, 1.5, 2, 0, 0)],
    openings: [],
    ...extra,
  };
}

test('scan reads width, length, and ceiling in inches', () => {
  const s = readScan(box(0))!;
  assert.equal(s.widthIn, 157); // 4 m
  assert.equal(s.lengthIn, 197); // 5 m
  assert.equal(s.ceilingIn, 106); // 2.7 m
  assert.equal(s.doors, 1);
  assert.equal(s.windows, 2);
  assert.equal(s.perimeterFt, 59);
});

test('rotated scans measure the same box', () => {
  const a = readScan(box(0))!;
  const b = readScan(box(0.6))!;
  assert.equal(b.widthIn, a.widthIn);
  assert.equal(b.lengthIn, a.lengthIn);
});

test('wall area is net of doors and windows', () => {
  const s = readScan(box(0))!;
  // (18 m × 2.7 m) − 1.8 − 3.6 = 43.2 m²
  assert.equal(s.wallSqft, Math.round(43.2 * 10.7639));
  assert.equal(s.floorSqft, Math.round(20 * 10.7639));
});

test('floor polygon wins over the bounding box', () => {
  const l = [[0, 0, 0], [4, 0, 0], [4, 3, 0], [2, 3, 0], [2, 5, 0], [0, 5, 0]];
  const s = readScan(box(0, { floors: [{ dimensions: [4, 5, 0], transform: wall(1, 0, 0, 0, 0).transform, polygonCorners: l }] }))!;
  assert.equal(s.floorSqft, Math.round(16 * 10.7639));
});

test('accepts column-nested transforms and object vectors', () => {
  const raw = box(0);
  const nested = {
    ...raw,
    walls: raw.walls.map((w) => ({
      dimensions: { x: w.dimensions[0], y: w.dimensions[1], z: 0 },
      transform: [w.transform.slice(0, 4), w.transform.slice(4, 8), w.transform.slice(8, 12), w.transform.slice(12)],
    })),
  };
  assert.equal(readScan(nested)?.lengthIn, 197);
});

test('junk and wall-less scans return null', () => {
  assert.equal(readScan(null), null);
  assert.equal(readScan({ walls: [] }), null);
  assert.equal(readScan({ walls: [{ dimensions: [1, 2, 0] }] }), null);
  assert.equal(scanOf({ widthIn: 1 }), null);
});

test('scanned areas replace the box estimate', () => {
  const scan = readScan(box(0))!;
  const g = geometry({ type: 'living', widthIn: scan.widthIn, lengthIn: scan.lengthIn, ceilingIn: scan.ceilingIn, scan });
  assert.equal(g.wall, scan.wallSqft);
  assert.equal(g.floor, scan.floorSqft);
  assert.match(g.label, /^scanned/);
});
