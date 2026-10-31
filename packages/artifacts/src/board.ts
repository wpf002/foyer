/**
 * Material boards. A board is the render Foyer can draw without an image
 * model: the finishes and specs a recommendation names, laid out the way a
 * decorator presents a sample board. It reads only the recommendation, so it
 * can never show something the recommendation doesn't say.
 */
export type BoardFinish = 'plaster' | 'oak' | 'linen' | 'terracotta' | 'brass' | 'walnut';

export interface Swatch {
  name: string;
  hex: string;
  /** Texture class in the web stylesheet, when there is one. */
  finish?: BoardFinish;
  /** Existing material the recommendation keeps, versus one it adds. */
  role: 'new' | 'keep';
}

export interface Spec {
  label: string;
  value: string;
}

export interface Board {
  swatches: Swatch[];
  specs: Spec[];
}

export interface BoardSource {
  title: string;
  rationale: string;
  preserve?: string | null;
}

export const BOARD_GENERATOR = 'foyer-board@1';

/** Order matters: the first match on a span wins, so specific names sit above general ones. */
const LEXICON: { re: RegExp; name: string; hex: string; finish?: BoardFinish }[] = [
  { re: /white oak/i, name: 'White Oak', hex: '#c9ab7e', finish: 'oak' },
  { re: /\boak\b/i, name: 'Oak', hex: '#b8935f', finish: 'oak' },
  { re: /walnut/i, name: 'Walnut', hex: '#5b4432', finish: 'walnut' },
  { re: /limewash|plaster/i, name: 'Limewash Plaster', hex: '#e9e3d7', finish: 'plaster' },
  { re: /\bbone\b/i, name: 'Warm Bone', hex: '#e6dccb' },
  { re: /linen/i, name: 'Linen', hex: '#ddd5c4', finish: 'linen' },
  { re: /terracotta|clay tile/i, name: 'Terracotta', hex: '#b05a38', finish: 'terracotta' },
  { re: /brass/i, name: 'Aged Brass', hex: '#a98b4e', finish: 'brass' },
  { re: /bronze/i, name: 'Oil-Rubbed Bronze', hex: '#4a3a2c' },
  { re: /matte black|black (?:iron|steel|metal)/i, name: 'Matte Black', hex: '#2a2826' },
  { re: /nickel/i, name: 'Brushed Nickel', hex: '#b9b6ae' },
  { re: /chrome/i, name: 'Chrome', hex: '#c9ccce' },
  { re: /marble/i, name: 'Honed Marble', hex: '#ece8e1' },
  { re: /travertine/i, name: 'Travertine', hex: '#d9c9ae' },
  { re: /zellige/i, name: 'Zellige', hex: '#cfd6cc' },
  { re: /soapstone/i, name: 'Soapstone', hex: '#6b6f6c' },
  { re: /\bslate\b/i, name: 'Slate', hex: '#5e6366' },
  { re: /quartz/i, name: 'Quartz', hex: '#eeece8' },
  { re: /concrete/i, name: 'Concrete', hex: '#b3afa7' },
  { re: /rattan|\bcane\b/i, name: 'Rattan', hex: '#c4a477' },
  { re: /\bwool\b/i, name: 'Wool', hex: '#e4ddd0' },
  { re: /leather/i, name: 'Leather', hex: '#8a5a3b' },
  { re: /\bsage\b/i, name: 'Sage', hex: '#a3ad94' },
  { re: /ochre/i, name: 'Ochre', hex: '#c08a3e' },
  { re: /greige/i, name: 'Greige', hex: '#c8bfb2' },
  { re: /charcoal/i, name: 'Charcoal', hex: '#3d3b39' },
  { re: /\bnavy\b/i, name: 'Navy', hex: '#2f3a4c' },
  { re: /warm white/i, name: 'Warm White', hex: '#f1ece2' },
];

const MAX_SWATCHES = 5;

function swatchesIn(text: string, role: Swatch['role']): Swatch[] {
  const hits: { at: number; s: Swatch }[] = [];
  const taken: [number, number][] = [];
  for (const l of LEXICON) {
    const m = new RegExp(l.re.source, 'gi').exec(text);
    if (!m) continue;
    const span: [number, number] = [m.index, m.index + m[0].length];
    if (taken.some(([a, b]) => span[0] < b && a < span[1])) continue;
    taken.push(span);
    hits.push({ at: m.index, s: { name: l.name, hex: l.hex, ...(l.finish ? { finish: l.finish } : {}), role } });
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.s);
}

const UNIT: Record<string, string> = { inch: 'in', inches: 'in', in: 'in', feet: 'ft', foot: 'ft', ft: 'ft' };

function specsIn(text: string): Spec[] {
  const out: Spec[] = [];
  const k = /\b(\d{4})\s?K\b/.exec(text);
  if (k) out.push({ label: 'Color Temp', value: `${k[1]}K` });
  const cri = /\bCRI\s?(?:of\s)?(\d{2})\b/i.exec(text);
  if (cri) out.push({ label: 'CRI', value: cri[1]! });
  const sheen = /\b(flat|matte|eggshell|satin|semi-gloss|high-gloss)\b/i.exec(text);
  if (sheen) out.push({ label: 'Sheen', value: sheen[1]!.replace(/^./, (c) => c.toUpperCase()) });
  const seen = new Set<string>();
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)[- ]?(inches|inch|in\b|feet|foot|ft\b)/gi)) {
    const v = `${m[1]} ${UNIT[m[2]!.toLowerCase()]}`;
    if (seen.has(v)) continue;
    seen.add(v);
    if (seen.size > 3) break;
    out.push({ label: 'Measure', value: v });
  }
  return out;
}

/** The board for one recommendation, or null when it names nothing to draw. */
export function buildBoard(src: BoardSource): Board | null {
  const added = swatchesIn(`${src.title}. ${src.rationale}`, 'new');
  const kept = swatchesIn(src.preserve ?? '', 'keep').filter((k) => !added.some((a) => a.name === k.name));
  const swatches = [...added, ...kept].slice(0, MAX_SWATCHES);
  const specs = specsIn(`${src.title}. ${src.rationale}`);
  return swatches.length || specs.length ? { swatches, specs } : null;
}

/** The board stored on a render row, if the row is one Foyer drew. */
export function boardOf(provenance: unknown): Board | null {
  const p = provenance as { generator?: string; board?: Board } | null;
  return p?.generator === BOARD_GENERATOR && p.board ? p.board : null;
}
