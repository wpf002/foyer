import { staticAdapter, type BaselineLine } from './baseline';
import { regionFactor, type RegionBasis } from './region';

/**
 * Turns a recommendation into a priced scope: work type, quantity, and the
 * basis for the quantity. Deterministic and auditable. A recommendation that
 * matches no rule stays unpriced rather than getting a guessed number.
 */
export interface ScopeInput {
  title: string;
  rationale: string;
  category: string;
  room?: { type?: string; widthIn?: number | null; lengthIn?: number | null; ceilingIn?: number | null };
}

export interface Scope {
  workType: string;
  quantity: number;
  /** How the quantity was reached, e.g. "412 sq ft of wall from 12′ × 14′ × 9′". */
  basis: string;
}

const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, pair: 2, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10, twelve: 12 };

/** "Two sconces", "3 pendants", "a pair of lamps". */
export function countOf(text: string, nouns: string, fallback: number): number {
  const m = new RegExp(`\\b(\\d+|a pair of|${Object.keys(WORDS).join('|')})\\s+(?:[\\w-]+\\s+){0,2}?(?:${nouns})`, 'i').exec(text);
  if (!m) return fallback;
  const k = m[1]!.toLowerCase().replace(/^a pair of$/, 'pair');
  const n = Number(k) || WORDS[k] || fallback;
  return Math.min(Math.max(n, 1), 40);
}

/** Typical floor area by room type, used only when dimensions are missing. */
const DEFAULT_SQFT: Record<string, number> = {
  kitchen: 160, bathroom: 50, living: 280, dining: 160, bedroom: 180, entry: 60, office: 120, basement: 500, outdoor: 200, other: 150,
};

interface Geometry {
  floor: number;
  wall: number;
  perimeter: number;
  measured: boolean;
  label: string;
}

const ft = (inches: number) => `${Math.round(inches / 12)}′`;

export function geometry(room: ScopeInput['room']): Geometry {
  const w = room?.widthIn ?? 0;
  const l = room?.lengthIn ?? 0;
  const h = room?.ceilingIn ?? 96;
  if (w > 0 && l > 0) {
    const perimeter = (2 * (w + l)) / 12;
    return {
      floor: Math.round((w * l) / 144),
      // 15% off for doors and windows.
      wall: Math.round(perimeter * (h / 12) * 0.85),
      perimeter: Math.round(perimeter),
      measured: true,
      label: `${ft(w)} × ${ft(l)} × ${ft(h)}`,
    };
  }
  const floor = DEFAULT_SQFT[room?.type?.toLowerCase() ?? 'other'] ?? 150;
  const side = Math.sqrt(floor);
  const perimeter = 4 * side;
  return { floor, wall: Math.round(perimeter * (h / 12) * 0.85), perimeter: Math.round(perimeter), measured: false, label: 'typical size, no dimensions' };
}

type Q = (text: string, g: Geometry) => { quantity: number; basis: string };

const each = (nouns: string, fallback: number, what: string): Q => (t) => {
  const n = countOf(t, nouns, fallback);
  return { quantity: n, basis: `${n} ${what}${n === 1 ? '' : 's'}` };
};
const walls: Q = (_t, g) => ({ quantity: g.wall, basis: `${g.wall} sq ft of wall, ${g.label}` });
const floor: Q = (_t, g) => ({ quantity: g.floor, basis: `${g.floor} sq ft of floor, ${g.label}` });
const perimeter: Q = (_t, g) => ({ quantity: g.perimeter, basis: `${g.perimeter} linear ft, ${g.label}` });
const run = (fallback: number): Q => (t) => {
  const m = /(\d+(?:\.\d+)?)\s*(?:linear\s*)?(?:ft|feet|foot|′|')\b/i.exec(t);
  const n = m ? Math.min(Number(m[1]), 60) : fallback;
  return { quantity: n, basis: m ? `${n} linear ft, stated` : `${n} linear ft, typical run` };
};
const rug: Q = (t, g) => {
  const m = /\b(\d{1,2})\s*[x×]\s*(\d{1,2})\b/.exec(t);
  if (m) {
    const a = Number(m[1]) * Number(m[2]);
    return { quantity: a, basis: `${m[1]}′ × ${m[2]}′ rug, stated` };
  }
  const side = Math.sqrt(g.floor);
  const a = Math.round(Math.max(side - 2, 4) ** 2 * 0.7);
  return { quantity: a, basis: `${a} sq ft rug, sized to the room` };
};
const once = (what: string): Q => () => ({ quantity: 1, basis: what });

/** First match wins. Order puts structure and trades ahead of finishes. */
const RULES: { workType: string; test: RegExp; q: Q }[] = [
  { workType: 'structural_opening', test: /\b(widen|open(?:ing)? up|remove|take out|knock)\b.*\b(wall|opening|partition|header)\b|\bwiden(?:ed)? (?:the )?(?:\w+[- ]){0,3}opening\b/i, q: once('1 opening, engineer sizes the support') },
  { workType: 'move_plumbing', test: /\b(relocat|move)\w*\b.*\b(sink|fridge|water line|plumbing|toilet|dishwasher|range|gas)\b/i, q: once('1 relocation') },
  { workType: 'panel_upgrade', test: /\bpanel\b|\bservice upgrade\b/i, q: once('1 panel') },
  { workType: 'recessed_light', test: /\b(recessed|can lights?|downlights?)\b/i, q: each('recessed|cans?|downlights?|lights?', 4, 'light') },
  { workType: 'sconce_install', test: /\bsconces?\b/i, q: each('sconces?', 2, 'sconce') },
  { workType: 'light_fixture_swap', test: /\b(pendants?|chandelier|flush ?mount|ceiling fixture|light fixture|lighting)\b/i, q: each('pendants?|chandeliers?|fixtures?|lights?', 1, 'fixture') },
  { workType: 'dimmer_switch', test: /\bdimmers?\b/i, q: each('dimmers?|switch(?:es)?', 2, 'dimmer') },
  { workType: 'bulb_swap', test: /\b(bulbs?|\d{4}\s?k\b|kelvin|color temperature)\b/i, q: once('1 room of bulbs') },
  { workType: 'lamp', test: /\blamps?\b/i, q: each('lamps?', 1, 'lamp') },
  { workType: 'cabinet_reface', test: /\breface\b/i, q: run(18) },
  { workType: 'cabinet_refinish', test: /\b(paint|refinish|lacquer)\w*\b.*\bcabinet/i, q: run(18) },
  { workType: 'cabinet_hardware', test: /\b(hardware|pulls|knobs)\b/i, q: each('pulls?|knobs?|pieces?', 20, 'pull') },
  { workType: 'quartz_counter', test: /\b(counter|countertop|worktop)s?\b/i, q: (t) => { const n = countOf(t, 'sq ft|square feet', 40); return { quantity: n, basis: `${n} sq ft of counter` }; } },
  { workType: 'tile_backsplash', test: /\bbacksplash\b/i, q: (t) => { const n = countOf(t, 'sq ft|square feet', 30); return { quantity: n, basis: `${n} sq ft of backsplash` }; } },
  { workType: 'vanity_replace', test: /\bvanity\b/i, q: once('1 vanity') },
  { workType: 'faucet_replace', test: /\bfaucets?\b/i, q: each('faucets?', 1, 'faucet') },
  { workType: 'refinish_hardwood', test: /\b(refinish|sand|recoat|screen)\w*\b.*\b(floor|oak|hardwood|maple)/i, q: floor },
  { workType: 'tile_floor', test: /\btile\b.*\bfloor|\bfloor\w*\b.*\btile\b/i, q: floor },
  { workType: 'lvp_flooring', test: /\b(lvp|vinyl plank|new floor|replace (?:the )?floor)/i, q: floor },
  { workType: 'area_rug', test: /\brugs?\b/i, q: rug },
  { workType: 'limewash', test: /\b(limewash|lime wash|plaster finish|roman clay)\b/i, q: walls },
  { workType: 'wallpaper', test: /\b(wallpaper|wallcovering|grasscloth)\b/i, q: walls },
  { workType: 'ceiling_paint', test: /\bceiling\b.*\b(paint|colou?r)|\b(paint|colou?r)\b.*\bceiling\b/i, q: floor },
  { workType: 'trim_paint', test: /\b(trim|baseboards?|casings?|doors?)\b.*\bpaint|\bpaint\w*\b.*\b(trim|baseboards?|casings?)\b/i, q: perimeter },
  { workType: 'interior_paint', test: /\b(paint|repaint|colou?r[- ]drench|walls? in)\b/i, q: walls },
  { workType: 'window_treatment', test: /\b(curtains?|drapes?|drapery|shades?|blinds?|window treatments?|curtain rods?)\b/i, q: each('windows?|panels?|shades?', 2, 'window') },
  { workType: 'built_in_storage', test: /\b(built-?ins?|millwork|banquette|window seat)\b/i, q: run(8) },
  { workType: 'shelving', test: /\bshel(f|ves|ving)\b/i, q: run(6) },
  { workType: 'entry_storage', test: /\b(bench|hooks|drop zone|landing strip)\b/i, q: once('1 bench and hooks') },
  { workType: 'reupholster', test: /\b(reupholster|recover|slipcover)\b/i, q: each('chairs?|sofas?|pieces?|ottomans?', 1, 'piece') },
  { workType: 'door_replace', test: /\b(replace|swap|new)\b.*\bdoors?\b/i, q: each('doors?', 1, 'door') },
  { workType: 'art_hanging', test: /\b(art|mirror|gallery wall|hang)\b/i, q: each('pieces?|mirrors?|prints?|frames?', 1, 'piece') },
  { workType: 'rearrange', test: /\b(rearrange|pull|float|move|shift|rotate|edit|declutter|clear|swap places|reposition)\b/i, q: once('existing pieces') },
  { workType: 'furniture_piece', test: /\b(sofa|sectional|table|chairs?|bed|dresser|console|ottoman|nightstands?|desk|stools?)\b/i, q: each('sofas?|tables?|chairs?|stools?|nightstands?|pieces?', 1, 'piece') },
];

export function scopeOf(rec: ScopeInput): Scope | null {
  const text = `${rec.title}. ${rec.rationale}`;
  const g = geometry(rec.room);
  // Title decides the work type. The rationale only breaks a miss.
  for (const src of [rec.title, text]) {
    const rule = RULES.find((r) => r.test.test(src));
    if (rule) {
      const { quantity, basis } = rule.q(text, g);
      return { workType: rule.workType, quantity, basis };
    }
  }
  return null;
}

export interface Priced extends Scope {
  lowCents: number;
  midCents: number;
  highCents: number;
  regionFactor: number;
  region: RegionBasis;
  source: 'BASELINE_STATIC' | 'FOYER_FLYWHEEL';
  /** Local quotes blended in. 0 means pure baseline. */
  localPoints: number;
  line: BaselineLine;
}

/** Local observations needed before the flywheel moves an estimate. */
export const MIN_LOCAL_POINTS = 5;
/** Prior strength. At n = 20 local quotes weigh as much as the baseline. */
const PRIOR = 20;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Prices a scope for a zip. `localPerUnitCents` is the flywheel: real quotes
 * and invoices for this work type near this zip, already per unit.
 */
export function price(scope: Scope, zip: string, localPerUnitCents: number[] = []): Priced | null {
  const line = staticAdapter.lookupSync(scope.workType);
  if (!line) return null;
  const r = regionFactor(zip);
  let low = line.lowCents * scope.quantity * r.factor;
  let mid = line.midCents * scope.quantity * r.factor;
  let high = line.highCents * scope.quantity * r.factor;
  const n = localPerUnitCents.length;
  const blended = n >= MIN_LOCAL_POINTS && mid > 0;
  if (blended) {
    const w = n / (n + PRIOR);
    const shift = ((1 - w) * mid + w * median(localPerUnitCents) * scope.quantity) / mid;
    low *= shift;
    mid *= shift;
    high *= shift;
  }
  const round = (c: number) => Math.round(c / 1000) * 1000;
  return {
    ...scope,
    lowCents: round(low),
    midCents: round(mid),
    highCents: round(high),
    regionFactor: r.factor,
    region: r.basis,
    source: blended ? 'FOYER_FLYWHEEL' : 'BASELINE_STATIC',
    localPoints: blended ? n : 0,
    line,
  };
}
