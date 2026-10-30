/**
 * Baseline cost adapter. A Homewyse/RSMeans-shaped lookup, bundled static
 * sample behind the same interface so the engine is testable before a data
 * licence exists. National mid-points in cents, per unit.
 */
export interface BaselineLine {
  workType: string;
  label: string;
  unit: 'sqft' | 'linear_ft' | 'each' | 'room' | 'job';
  lowCents: number;
  midCents: number;
  highCents: number;
}

export interface BaselineAdapter {
  readonly source: 'BASELINE_HOMEWYSE' | 'BASELINE_RSMEANS' | 'BASELINE_STATIC';
  lookup(workType: string): Promise<BaselineLine | null>;
}

const STATIC: Record<string, BaselineLine> = {
  interior_paint: { workType: 'interior_paint', label: 'Interior Paint', unit: 'sqft', lowCents: 180, midCents: 300, highCents: 480 },
  lvp_flooring: { workType: 'lvp_flooring', label: 'Luxury Vinyl Plank', unit: 'sqft', lowCents: 450, midCents: 760, highCents: 1200 },
  refinish_hardwood: { workType: 'refinish_hardwood', label: 'Refinish Hardwood', unit: 'sqft', lowCents: 340, midCents: 520, highCents: 810 },
  recessed_light: { workType: 'recessed_light', label: 'Recessed Light', unit: 'each', lowCents: 17500, midCents: 26000, highCents: 40000 },
  cabinet_refinish: { workType: 'cabinet_refinish', label: 'Cabinet Refinish', unit: 'linear_ft', lowCents: 8000, midCents: 13500, highCents: 22000 },
  quartz_counter: { workType: 'quartz_counter', label: 'Quartz Countertop', unit: 'sqft', lowCents: 5500, midCents: 8500, highCents: 14000 },
  tile_backsplash: { workType: 'tile_backsplash', label: 'Tile Backsplash', unit: 'sqft', lowCents: 2200, midCents: 3600, highCents: 6000 },
  remove_partition: { workType: 'remove_partition', label: 'Remove Non-Bearing Partition', unit: 'job', lowCents: 90000, midCents: 185000, highCents: 350000 },
  move_plumbing: { workType: 'move_plumbing', label: 'Relocate Plumbing', unit: 'job', lowCents: 150000, midCents: 320000, highCents: 650000 },
  panel_upgrade: { workType: 'panel_upgrade', label: 'Electrical Panel Upgrade', unit: 'job', lowCents: 180000, midCents: 285000, highCents: 450000 },
};

export const staticAdapter: BaselineAdapter = {
  source: 'BASELINE_STATIC',
  async lookup(workType) {
    return STATIC[workType] ?? null;
  },
};

export function adapter(): BaselineAdapter {
  // Swap on COST_BASELINE_PROVIDER once a licensed feed exists.
  return staticAdapter;
}
