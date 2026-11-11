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
  lookupSync(workType: string): BaselineLine | null;
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
  structural_opening: { workType: 'structural_opening', label: 'Widen Or Open A Wall', unit: 'job', lowCents: 600000, midCents: 1100000, highCents: 2000000 },
  sconce_install: { workType: 'sconce_install', label: 'Wall Sconce, Wired', unit: 'each', lowCents: 30000, midCents: 52000, highCents: 85000 },
  light_fixture_swap: { workType: 'light_fixture_swap', label: 'Light Fixture Swap', unit: 'each', lowCents: 15000, midCents: 32000, highCents: 60000 },
  dimmer_switch: { workType: 'dimmer_switch', label: 'Dimmer Switch', unit: 'each', lowCents: 9000, midCents: 15000, highCents: 25000 },
  lamp: { workType: 'lamp', label: 'Floor Or Table Lamp', unit: 'each', lowCents: 8000, midCents: 22000, highCents: 60000 },
  bulb_swap: { workType: 'bulb_swap', label: 'Bulb Swap', unit: 'room', lowCents: 3000, midCents: 6000, highCents: 12000 },
  limewash: { workType: 'limewash', label: 'Limewash Walls', unit: 'sqft', lowCents: 350, midCents: 550, highCents: 900 },
  wallpaper: { workType: 'wallpaper', label: 'Wallpaper', unit: 'sqft', lowCents: 400, midCents: 750, highCents: 1300 },
  ceiling_paint: { workType: 'ceiling_paint', label: 'Ceiling Paint', unit: 'sqft', lowCents: 150, midCents: 250, highCents: 400 },
  trim_paint: { workType: 'trim_paint', label: 'Trim And Doors Paint', unit: 'linear_ft', lowCents: 150, midCents: 300, highCents: 500 },
  tile_floor: { workType: 'tile_floor', label: 'Tile Floor', unit: 'sqft', lowCents: 1100, midCents: 1800, highCents: 3000 },
  area_rug: { workType: 'area_rug', label: 'Area Rug', unit: 'sqft', lowCents: 400, midCents: 1200, highCents: 3500 },
  window_treatment: { workType: 'window_treatment', label: 'Curtains Or Shades', unit: 'each', lowCents: 15000, midCents: 35000, highCents: 80000 },
  cabinet_reface: { workType: 'cabinet_reface', label: 'Cabinet Reface', unit: 'linear_ft', lowCents: 20000, midCents: 35000, highCents: 55000 },
  cabinet_hardware: { workType: 'cabinet_hardware', label: 'Cabinet Hardware', unit: 'each', lowCents: 800, midCents: 1800, highCents: 4000 },
  built_in_storage: { workType: 'built_in_storage', label: 'Built-In Millwork', unit: 'linear_ft', lowCents: 30000, midCents: 60000, highCents: 110000 },
  shelving: { workType: 'shelving', label: 'Open Shelving', unit: 'linear_ft', lowCents: 4000, midCents: 9000, highCents: 18000 },
  entry_storage: { workType: 'entry_storage', label: 'Bench And Hooks', unit: 'job', lowCents: 15000, midCents: 35000, highCents: 70000 },
  reupholster: { workType: 'reupholster', label: 'Reupholster', unit: 'each', lowCents: 60000, midCents: 120000, highCents: 250000 },
  furniture_piece: { workType: 'furniture_piece', label: 'Furniture Piece', unit: 'each', lowCents: 40000, midCents: 120000, highCents: 350000 },
  art_hanging: { workType: 'art_hanging', label: 'Hang Art Or Mirror', unit: 'each', lowCents: 3000, midCents: 8000, highCents: 20000 },
  vanity_replace: { workType: 'vanity_replace', label: 'Vanity Replace', unit: 'each', lowCents: 80000, midCents: 180000, highCents: 400000 },
  faucet_replace: { workType: 'faucet_replace', label: 'Faucet Replace', unit: 'each', lowCents: 25000, midCents: 50000, highCents: 100000 },
  door_replace: { workType: 'door_replace', label: 'Interior Door', unit: 'each', lowCents: 50000, midCents: 110000, highCents: 250000 },
  small_accessory: { workType: 'small_accessory', label: 'Small Accessory', unit: 'each', lowCents: 2000, midCents: 6000, highCents: 20000 },
  accent_piece: { workType: 'accent_piece', label: 'Accent Piece', unit: 'each', lowCents: 10000, midCents: 30000, highCents: 80000 },
  rearrange: { workType: 'rearrange', label: 'Rearrange Existing', unit: 'room', lowCents: 0, midCents: 0, highCents: 0 },
  panel_upgrade: { workType: 'panel_upgrade', label: 'Electrical Panel Upgrade', unit: 'job', lowCents: 180000, midCents: 285000, highCents: 450000 },
};

export const WORK_TYPES = () => Object.keys(STATIC);

export const staticAdapter: BaselineAdapter = {
  source: 'BASELINE_STATIC',
  async lookup(workType) {
    return STATIC[workType] ?? null;
  },
  lookupSync(workType) {
    return STATIC[workType] ?? null;
  },
};

export function adapter(): BaselineAdapter {
  // Swap on COST_BASELINE_PROVIDER once a licensed feed exists.
  return staticAdapter;
}
