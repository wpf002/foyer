/**
 * Reads an Apple RoomPlan `CapturedRoom` JSON export. Pure, no IO.
 *
 * RoomPlan surfaces carry `dimensions` [width, height, depth] in meters and a
 * 4×4 column-major `transform`. Walls stand on the floor with their width
 * along the transform's first column and y pointing up.
 */

export interface ScanSummary {
  widthIn: number;
  lengthIn: number;
  ceilingIn: number;
  floorSqft: number;
  /** Wall surface net of doors, windows, and openings. */
  wallSqft: number;
  perimeterFt: number;
  walls: number;
  doors: number;
  windows: number;
  openings: number;
}

const IN_PER_M = 39.3701;
const SQFT_PER_M2 = 10.7639;

type Vec = [number, number, number];

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function vec3(v: unknown): Vec | null {
  if (Array.isArray(v) && v.length >= 3) {
    const [x, y, z] = [num(v[0]), num(v[1]), num(v[2])];
    return x !== null && y !== null && z !== null ? [x, y, z] : null;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const [x, y, z] = [num(o.x), num(o.y), num(o.z)];
    return x !== null && y !== null && z !== null ? [x, y, z] : null;
  }
  return null;
}

/** Accepts 16 flat floats or 4 columns of 4. */
function matrix(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const flat = (v.flat() as unknown[]).map(num);
  return flat.length === 16 && flat.every((n) => n !== null) ? (flat as number[]) : null;
}

interface Surface {
  dims: Vec;
  t: number[];
}

function surfaces(v: unknown): Surface[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const dims = vec3(o.dimensions);
    const t = matrix(o.transform);
    return dims && t && dims[0] > 0 ? [{ dims, t }] : [];
  });
}

const area = (s: Surface[]) => s.reduce((a, x) => a + x.dims[0] * x.dims[1], 0);

/** Area of a planar polygon in any orientation: half the norm of the summed cross products. */
function polygon(pts: Vec[]) {
  const sum: Vec = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const [a, b] = [pts[i]!, pts[(i + 1) % pts.length]!];
    sum[0] += a[1] * b[2] - a[2] * b[1];
    sum[1] += a[2] * b[0] - a[0] * b[2];
    sum[2] += a[0] * b[1] - a[1] * b[0];
  }
  return Math.hypot(...sum) / 2;
}

function floorArea(v: unknown): number | null {
  if (!Array.isArray(v)) return null;
  let total = 0;
  for (const f of v) {
    const o = (f ?? {}) as Record<string, unknown>;
    const corners = Array.isArray(o.polygonCorners) ? o.polygonCorners.map(vec3) : [];
    if (corners.length >= 3 && corners.every(Boolean)) {
      total += polygon(corners as Vec[]);
    } else {
      const d = vec3(o.dimensions);
      if (d) total += d[0] * d[1];
    }
  }
  return total > 0 ? total : null;
}

/** Validates a stored summary. Anything malformed reads as no scan. */
export function scanOf(v: unknown): ScanSummary | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const keys = ['widthIn', 'lengthIn', 'ceilingIn', 'floorSqft', 'wallSqft', 'perimeterFt', 'walls', 'doors', 'windows', 'openings'] as const;
  return keys.every((k) => typeof o[k] === 'number') ? (o as unknown as ScanSummary) : null;
}

/**
 * Returns null when the JSON has no usable walls. Width and length come from
 * the wall footprint's bounding box, aligned to the longest wall.
 */
export function readScan(raw: unknown): ScanSummary | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const walls = surfaces(o.walls);
  if (walls.length < 3) return null;
  const doors = surfaces(o.doors);
  const windows = surfaces(o.windows);
  const openings = surfaces(o.openings);

  const longest = walls.reduce((a, w) => (w.dims[0] > a.dims[0] ? w : a));
  const ax = Math.atan2(longest.t[2]!, longest.t[0]!);
  const [c, s] = [Math.cos(-ax), Math.sin(-ax)];

  let [minU, maxU, minV, maxV] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const w of walls) {
    const half = w.dims[0] / 2;
    const [dx, dz] = [w.t[0]!, w.t[2]!];
    const len = Math.hypot(dx, dz) || 1;
    for (const sign of [-1, 1]) {
      const x = w.t[12]! + (sign * half * dx) / len;
      const z = w.t[14]! + (sign * half * dz) / len;
      const u = x * c - z * s;
      const v = x * s + z * c;
      [minU, maxU, minV, maxV] = [Math.min(minU, u), Math.max(maxU, u), Math.min(minV, v), Math.max(maxV, v)];
    }
  }
  const spans = [maxU - minU, maxV - minV].sort((a, b) => a - b) as [number, number];
  if (spans[0] <= 0) return null;

  const ceiling = Math.max(...walls.map((w) => w.dims[1]));
  const floor = floorArea(o.floors) ?? spans[0] * spans[1];
  const net = Math.max(0, area(walls) - area(doors) - area(windows) - area(openings));

  return {
    widthIn: Math.round(spans[0] * IN_PER_M),
    lengthIn: Math.round(spans[1] * IN_PER_M),
    ceilingIn: Math.round(ceiling * IN_PER_M),
    floorSqft: Math.round(floor * SQFT_PER_M2),
    wallSqft: Math.round(net * SQFT_PER_M2),
    perimeterFt: Math.round((walls.reduce((a, w) => a + w.dims[0], 0) * IN_PER_M) / 12),
    walls: walls.length,
    doors: doors.length,
    windows: windows.length,
    openings: openings.length,
  };
}
