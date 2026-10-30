/**
 * Regional cost factor by zip prefix. Coarse on purpose: a wrong-by-15%
 * multiplier beats a national average presented as local truth. The flywheel
 * replaces this table zip by zip as real quotes accumulate.
 */
const BY_ZIP3: Record<string, number> = {
  '946': 1.40, '945': 1.36, '941': 1.42, '940': 1.38, '100': 1.46, '112': 1.33, '021': 1.31,
  '206': 1.24, '981': 1.21, '606': 1.12, '802': 1.08, '787': 0.98,
  '852': 0.96, '303': 0.95, '331': 1.02, '372': 0.91, '631': 0.89,
  '432': 0.88, '481': 0.92, '352': 0.84,
};

export function regionFactor(zip: string): { factor: number; exact: boolean } {
  const p = zip.slice(0, 3);
  const hit = BY_ZIP3[p];
  return hit ? { factor: hit, exact: true } : { factor: 1.0, exact: false };
}
