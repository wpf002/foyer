import { staticAdapter } from './baseline';
import { regionFactor } from './region';
import { MIN_LOCAL_POINTS } from './scope';

/**
 * The cost index: real quotes and invoices aggregated by zip3 and work type.
 * Pure, no IO. A cell with fewer than MIN_LOCAL_POINTS observations is
 * suppressed so no single job can be read back out of it.
 */
export interface Observation {
  zip: string;
  workType: string;
  quotedCents: number | null;
  actualCents: number | null;
  quantity: number | null;
  observedAt: Date | string;
}

export interface IndexCell {
  zip3: string;
  workType: string;
  label: string;
  unit: string;
  n: number;
  /** Invoices among the n. The rest are quotes. */
  invoices: number;
  p25Cents: number;
  medianCents: number;
  p75Cents: number;
  /** Regional baseline mid for one unit. */
  baselineCents: number;
  /** Median against baseline, e.g. 0.12 = 12% over. */
  delta: number;
  lastObserved: string;
}

export interface CostIndex {
  cells: IndexCell[];
  points: number;
  regions: number;
  workTypes: number;
  /** Cells held back for having too few points. */
  suppressed: number;
}

/** Linear-interpolated quantile of a sorted list. */
function quantile(sorted: number[], q: number) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

export function costIndex(obs: Observation[], minPoints = MIN_LOCAL_POINTS): CostIndex {
  const groups = new Map<string, { zip3: string; workType: string; per: number[]; invoices: number; last: number }>();
  for (const o of obs) {
    const cents = o.actualCents ?? o.quotedCents;
    if (cents === null || !o.quantity || o.quantity <= 0 || !/^\d{3}/.test(o.zip)) continue;
    const zip3 = o.zip.slice(0, 3);
    const key = `${zip3}:${o.workType}`;
    const g = groups.get(key) ?? { zip3, workType: o.workType, per: [], invoices: 0, last: 0 };
    g.per.push(cents / o.quantity);
    if (o.actualCents !== null) g.invoices++;
    g.last = Math.max(g.last, new Date(o.observedAt).getTime());
    groups.set(key, g);
  }

  let suppressed = 0;
  const cells: IndexCell[] = [];
  for (const g of groups.values()) {
    const line = staticAdapter.lookupSync(g.workType);
    if (!line) continue;
    if (g.per.length < minPoints) {
      suppressed++;
      continue;
    }
    const s = g.per.sort((a, b) => a - b);
    const baseline = Math.round(line.midCents * regionFactor(`${g.zip3}00`).factor);
    const median = Math.round(quantile(s, 0.5));
    cells.push({
      zip3: g.zip3,
      workType: g.workType,
      label: line.label,
      unit: line.unit,
      n: s.length,
      invoices: g.invoices,
      p25Cents: Math.round(quantile(s, 0.25)),
      medianCents: median,
      p75Cents: Math.round(quantile(s, 0.75)),
      baselineCents: baseline,
      delta: baseline > 0 ? Math.round((median / baseline - 1) * 1000) / 1000 : 0,
      lastObserved: new Date(g.last).toISOString(),
    });
  }
  cells.sort((a, b) => a.zip3.localeCompare(b.zip3) || b.n - a.n || a.label.localeCompare(b.label));

  return {
    cells,
    points: cells.reduce((a, c) => a + c.n, 0),
    regions: new Set(cells.map((c) => c.zip3)).size,
    workTypes: new Set(cells.map((c) => c.workType)).size,
    suppressed,
  };
}

const COLUMNS = ['zip3', 'workType', 'label', 'unit', 'n', 'invoices', 'p25Cents', 'medianCents', 'p75Cents', 'baselineCents', 'delta', 'lastObserved'] as const;

const field = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function indexCsv(cells: IndexCell[]): string {
  return [COLUMNS.join(','), ...cells.map((c) => COLUMNS.map((k) => field(c[k])).join(','))].join('\n') + '\n';
}
