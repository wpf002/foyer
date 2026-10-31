/**
 * Regional cost factor by zip. A metro zip3 hit is the closest read; past
 * that, a state factor from BLS construction wages; past that, 1.0. Coarse on purpose: a
 * wrong-by-15% multiplier beats a national average presented as local truth.
 * The flywheel replaces these zip by zip as real quotes accumulate.
 */
const BY_ZIP3: Record<string, number> = {
  '946': 1.40, '945': 1.36, '941': 1.42, '940': 1.38, '100': 1.46, '112': 1.33, '021': 1.31,
  '206': 1.24, '981': 1.21, '606': 1.12, '802': 1.08, '787': 0.98,
  '852': 0.96, '303': 0.95, '331': 1.02, '372': 0.91, '631': 0.89,
  '432': 0.88, '481': 0.92, '352': 0.84,
};

/** [first zip3, last zip3, state]. USPS prefix blocks. */
const ZIP3_STATE: [number, number, string][] = [
  [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'], [50, 59, 'VT'], [60, 69, 'CT'],
  [70, 89, 'NJ'], [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'], [200, 205, 'DC'],
  [206, 219, 'MD'], [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'],
  [300, 319, 'GA'], [320, 349, 'FL'], [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'],
  [398, 399, 'GA'], [400, 427, 'KY'], [430, 458, 'OH'], [460, 479, 'IN'], [480, 499, 'MI'],
  [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'], [570, 577, 'SD'], [580, 588, 'ND'],
  [590, 599, 'MT'], [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'],
  [700, 714, 'LA'], [716, 729, 'AR'], [730, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'],
  [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'],
  [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
];

/**
 * State factor = 0.55 × (state wage ÷ national wage) + 0.45. Wages are BLS OEWS
 * May 2025 annual means for SOC 47-0000, Construction and Extraction
 * (series OEUS{fips}0000000000047000004, national $65,360). 0.55 is the labor
 * share of a residential remodel; materials price near national.
 */
export const STATE_FACTOR_SOURCE = 'BLS OEWS May 2025, SOC 47-0000';
const BY_STATE: Record<string, number> = {
  AK: 1.13, AL: 0.88, AR: 0.86, AZ: 0.96, CA: 1.11, CO: 1.0, CT: 1.06, DC: 1.07, DE: 0.98,
  FL: 0.92, GA: 0.92, HI: 1.16, IA: 0.97, ID: 0.95, IL: 1.14, IN: 1.01, KS: 0.96, KY: 0.94,
  LA: 0.91, MA: 1.13, MD: 1.0, ME: 0.98, MI: 1.0, MN: 1.08, MO: 1.02, MS: 0.88, MT: 0.99, NC: 0.91,
  ND: 1.01, NE: 0.94, NH: 0.99, NJ: 1.13, NM: 0.92, NV: 1.03, NY: 1.09, OH: 1.0, OK: 0.91,
  OR: 1.09, PA: 1.01, RI: 1.04, SC: 0.92, SD: 0.91, TN: 0.93, TX: 0.91, UT: 0.95, VA: 0.95,
  VT: 0.97, WA: 1.14, WI: 1.04, WV: 0.95, WY: 0.99,
};

export type RegionBasis = 'metro' | 'state' | 'national';

export function stateOf(zip: string): string | null {
  const n = Number(zip.slice(0, 3));
  if (!Number.isFinite(n)) return null;
  return ZIP3_STATE.find(([a, b]) => n >= a && n <= b)?.[2] ?? null;
}

export function regionFactor(zip: string): { factor: number; exact: boolean; basis: RegionBasis; state: string | null } {
  const state = stateOf(zip);
  const hit = BY_ZIP3[zip.slice(0, 3)];
  if (hit) return { factor: hit, exact: true, basis: 'metro', state };
  const s = state ? BY_STATE[state] : undefined;
  return s ? { factor: s, exact: false, basis: 'state', state } : { factor: 1.0, exact: false, basis: 'national', state };
}
