import { call, type ModelUsage } from '@foyer/ai';
import { CATEGORY_ORDER, EFFORT, RUBRIC_VERSION, SAFETY_RULES, type Category, type Effort } from './rubric';
import { safeText } from './checks';

export const PHASES = ['QUICK_WINS', 'MID_RANGE', 'MAJOR'] as const;
export type Phase = (typeof PHASES)[number];
export const PATHS = ['DIY', 'HANDYMAN', 'LICENSED_CONTRACTOR'] as const;
export type ExecPath = (typeof PATHS)[number];
export const PERMITS = ['NONE', 'LIKELY', 'REQUIRED', 'UNKNOWN'] as const;
export type Permit = (typeof PERMITS)[number];

/** One stored recommendation, as the roadmap pass sees it. */
export interface RoadmapRec {
  id: string;
  room: string | null;
  category: Category;
  title: string;
  rationale: string;
  effort: Effort;
  needsProReview: boolean;
  priority: number;
}

/** The model's draft for one recommendation. `recId` and `dependsOn` use the short ids R1..Rn. */
export interface DraftItem {
  recId: string;
  scope: string;
  why: string;
  phase: Phase;
  path: ExecPath;
  permit: Permit;
  riskNote?: string;
  dependsOn?: { recId: string; reason: string }[];
}

export interface PlannedItem {
  recId: string;
  phase: Phase;
  order: number;
  scope: string;
  why: string;
  path: ExecPath;
  permit: Permit;
  effort: Effort;
  riskNote: string | null;
}

export interface PlannedEdge {
  dependent: string;
  prerequisite: string;
  reason: string;
  source: 'rule' | 'model';
}

export interface Roadmap {
  items: PlannedItem[];
  edges: PlannedEdge[];
  /** What code changed or dropped from the draft. Logged, never shown as UI copy. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Trade order. "Don't finish floors before electrical" lives here, in code.
// ---------------------------------------------------------------------------

export const STAGES = ['structure', 'rough', 'close', 'built', 'paint', 'floor', 'dress'] as const;
export type Stage = (typeof STAGES)[number];

const STAGE_TEST: Record<Stage, RegExp> = {
  structure: /\b(?:walls? opening|widen\w*|header|beam|joists?|framing|demo\w*|remove (?:the )?wall|load path|open(?:ing)? (?:up )?the wall)\b/i,
  rough: /\b(?:plumb\w*|water line|drains?|supply lines?|gas line|(?:re)?wir(?:e|ed|ing)|circuits?|electrical|outlets?|receptacles?|panel|hardwire\w*|recessed|downlights?|can lights?|ducts?|hvac|vent fan)\b/i,
  close: /\b(?:drywall|plaster(?:ing)?|patch(?:ing)?|skim coat)\b/i,
  built: /\b(?:cabinet\w*|counter(?:top)?s?|built-ins?|vanity|backsplash|tile|tiling|millwork)\b/i,
  paint: /\b(?:paint\w*|limewash\w*|primer|repaint\w*|wallpaper|color drench\w*)\b/i,
  floor: /\b(?:floors?|flooring|refinish\w*|hardwood|carpet(?:ing)?|lvp|screen and recoat)\b/i,
  dress: /\b(?:curtains?|drapes?|drapery|rugs?|textiles?|sofa|sectional|furniture|artwork|art wall|pillows?|throws?|bench|hooks|lamps?)\b/i,
};

/** Stage edges that hold within one room. The reason is the shown sentence. */
const RULES: { before: Stage; after: Stage[]; reason: string }[] = [
  {
    before: 'structure',
    after: ['rough', 'close', 'built', 'paint', 'floor', 'dress'],
    reason: 'Framing work opens walls and throws dust. Everything else in the room waits until the structure is settled.',
  },
  {
    before: 'rough',
    after: ['close', 'built', 'paint', 'floor'],
    reason: 'Wiring and plumbing run inside walls and ceilings. Those surfaces get closed and finished after the rough-in.',
  },
  {
    before: 'close',
    after: ['built', 'paint', 'floor'],
    reason: 'Patching and plaster leave dust and need to cure. Patch before painting or finishing anything nearby.',
  },
  {
    before: 'built',
    after: ['paint'],
    reason: 'Cabinets and counters go in before final paint, so install scuffs get touched up once.',
  },
  {
    before: 'paint',
    after: ['floor'],
    reason: 'Walls get painted before floors get finished. Reversing it means taping a fresh floor or sanding through new finish.',
  },
  {
    before: 'paint',
    after: ['dress'],
    reason: 'Curtains, rugs and furniture go in after paint, so nothing gets moved twice.',
  },
  {
    before: 'floor',
    after: ['dress'],
    reason: 'Rugs and furniture go back in after the floor finish cures.',
  },
];

/** Stages a recommendation touches, from its title and rationale. */
export function stagesOf(r: Pick<RoadmapRec, 'category' | 'title' | 'rationale'>): Stage[] {
  // The title says what the work is. The rationale adds stages only for structural items,
  // where it usually names the trades the work pulls in.
  const text = r.category === 'STRUCTURAL' ? `${r.title}. ${r.rationale}` : r.title;
  const found = STAGES.filter((s) => STAGE_TEST[s].test(text));
  if (r.category === 'STRUCTURAL' && !found.includes('structure')) found.unshift('structure');
  return found;
}

const PHASE_RANK: Record<Phase, number> = { QUICK_WINS: 0, MID_RANGE: 1, MAJOR: 2 };
const maxPhase = (a: Phase, b: Phase): Phase => (PHASE_RANK[a] >= PHASE_RANK[b] ? a : b);

/** Lowest phase an item can sit in, from facts code can check. */
export function phaseFloor(r: RoadmapRec, path: ExecPath, permit: Permit): Phase {
  if (r.category === 'STRUCTURAL' || r.effort === 'MULTI_WEEK') return 'MAJOR';
  if (path === 'LICENSED_CONTRACTOR' || r.effort === 'WEEK' || permit === 'LIKELY' || permit === 'REQUIRED') return 'MID_RANGE';
  return 'QUICK_WINS';
}

const PRO_SENTENCE = /\b(?:licensed|engineer|electrician|plumber|gas fitter|inspector|contractor)\b/i;
const DEFAULT_RISK = 'A licensed professional reviews this scope before it is scheduled.';

function riskFrom(rationale: string): string {
  const s = rationale.split(/(?<=[.!?])\s+/).filter((x) => PRO_SENTENCE.test(x));
  return s.length ? s.slice(-2).join(' ') : DEFAULT_RISK;
}

const firstSentence = (t: string) => t.split(/(?<=[.!?])\s+/)[0]?.trim() ?? t;

/** True when `to` is reachable from `from` along prerequisite -> dependent edges. */
function reaches(next: Map<string, Set<string>>, from: string, to: string): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === to) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(next.get(n) ?? []));
  }
  return false;
}

/**
 * Turns a model draft into a roadmap code can stand behind. Pure: no I/O.
 *  - Every recommendation gets exactly one item. Missing ones are filled from the rec.
 *  - Pro-review items go to a licensed contractor with a risk note.
 *  - Permit is never stated as required; that is the building department's call.
 *  - Trade-order rules add edges within a room; model edges that would loop are dropped.
 *  - A dependent never sits in an earlier phase than its prerequisite.
 *  - Order within a phase follows the edges, then category order, then critique priority.
 */
export function planRoadmap(recs: RoadmapRec[], draft: DraftItem[], shortIds: Map<string, string>): Roadmap {
  const notes: string[] = [];
  const toId = (s: string) => shortIds.get(s.trim().toUpperCase());
  const byId = new Map(recs.map((r) => [r.id, r]));
  const drafts = new Map<string, DraftItem>();
  for (const d of draft) {
    const id = toId(d.recId);
    if (!id) notes.push(`dropped draft for unknown ${d.recId}`);
    else if (drafts.has(id)) notes.push(`dropped duplicate draft for ${d.recId}`);
    else drafts.set(id, d);
  }

  const items = new Map<string, PlannedItem>();
  for (const r of recs) {
    const d = drafts.get(r.id);
    if (!d) notes.push(`filled missing item for "${r.title}"`);
    let path: ExecPath = d && PATHS.includes(d.path) ? d.path : r.needsProReview ? 'LICENSED_CONTRACTOR' : r.effort === 'WEEKEND' ? 'DIY' : 'HANDYMAN';
    let permit: Permit = d && PERMITS.includes(d.permit) ? d.permit : 'UNKNOWN';
    if (r.needsProReview && path !== 'LICENSED_CONTRACTOR') {
      notes.push(`"${r.title}": ${path} -> LICENSED_CONTRACTOR (pro review)`);
      path = 'LICENSED_CONTRACTOR';
    }
    if (permit === 'REQUIRED') permit = 'LIKELY';
    if (r.category === 'STRUCTURAL' && permit === 'NONE') permit = 'UNKNOWN';
    const floor = phaseFloor(r, path, permit);
    const asked = d && PHASES.includes(d.phase) ? d.phase : floor;
    if (PHASE_RANK[asked] < PHASE_RANK[floor]) notes.push(`"${r.title}": ${asked} -> ${floor}`);
    const note = d?.riskNote?.trim() ? d.riskNote.trim() : r.needsProReview ? riskFrom(r.rationale) : '';
    items.set(r.id, {
      recId: r.id,
      phase: maxPhase(asked, floor),
      order: 0,
      scope: d?.scope?.trim() || r.title,
      why: safeText(d?.why?.trim() || firstSentence(r.rationale)),
      path,
      permit,
      effort: r.effort,
      riskNote: note ? safeText(note) : r.needsProReview ? DEFAULT_RISK : null,
    });
  }

  // Edges: rules first, so a model edge that contradicts trade order is the one dropped.
  const next = new Map<string, Set<string>>();
  const edges: PlannedEdge[] = [];
  const add = (e: PlannedEdge): boolean => {
    if (e.dependent === e.prerequisite) return false;
    if (next.get(e.prerequisite)?.has(e.dependent)) return false;
    if (reaches(next, e.dependent, e.prerequisite)) {
      notes.push(`dropped ${e.source} edge that loops: "${byId.get(e.prerequisite)?.title}" before "${byId.get(e.dependent)?.title}"`);
      return false;
    }
    if (!next.has(e.prerequisite)) next.set(e.prerequisite, new Set());
    next.get(e.prerequisite)!.add(e.dependent);
    edges.push(e);
    return true;
  };

  const stages = new Map(recs.map((r) => [r.id, stagesOf(r)]));
  // Earliest stage pair wins, so each pair gets the most specific reason once.
  for (const rule of RULES)
    for (const a of recs)
      for (const b of recs) {
        if (a.id === b.id || (a.room ?? '') !== (b.room ?? '')) continue;
        const sa = stages.get(a.id)!;
        const sb = stages.get(b.id)!;
        if (!sa.includes(rule.before) || !rule.after.some((s) => sb.includes(s))) continue;
        // An item that already spans the later stage carries its own sequencing.
        if (sb.includes(rule.before)) continue;
        if (edges.some((e) => e.prerequisite === a.id && e.dependent === b.id)) continue;
        add({ dependent: b.id, prerequisite: a.id, reason: rule.reason, source: 'rule' });
      }

  for (const [id, d] of drafts)
    for (const dep of d.dependsOn ?? []) {
      const pre = toId(dep.recId);
      if (!pre) {
        notes.push(`dropped edge to unknown ${dep.recId}`);
        continue;
      }
      if (!dep.reason?.trim()) {
        notes.push(`dropped edge with no reason on "${byId.get(id)?.title}"`);
        continue;
      }
      add({ dependent: id, prerequisite: pre, reason: safeText(dep.reason.trim()), source: 'model' });
    }

  // Transitive reduction: A -> C goes when A -> B -> C already says it.
  const reduced = edges.filter((e) => {
    next.get(e.prerequisite)!.delete(e.dependent);
    const implied = reaches(next, e.prerequisite, e.dependent);
    next.get(e.prerequisite)!.add(e.dependent);
    if (implied) next.get(e.prerequisite)!.delete(e.dependent);
    return !implied;
  });

  // Topological order (Kahn). Ties: phase, trade stage, category order, critique priority.
  const indeg = new Map(recs.map((r) => [r.id, 0]));
  for (const e of reduced) indeg.set(e.dependent, indeg.get(e.dependent)! + 1);
  const firstStage = (id: string) => {
    const s = stages.get(id)!;
    return s.length ? STAGES.indexOf(s[0]!) : STAGES.length;
  };
  const key = (id: string) => {
    const r = byId.get(id)!;
    return [PHASE_RANK[items.get(id)!.phase], firstStage(id), CATEGORY_ORDER.indexOf(r.category), r.priority];
  };
  const cmp = (a: string, b: string) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!;
    return a < b ? -1 : 1;
  };
  const ready = recs.map((r) => r.id).filter((id) => indeg.get(id) === 0);
  const topo: string[] = [];
  while (ready.length) {
    ready.sort(cmp);
    const id = ready.shift()!;
    topo.push(id);
    for (const e of reduced)
      if (e.prerequisite === id) {
        indeg.set(e.dependent, indeg.get(e.dependent)! - 1);
        if (indeg.get(e.dependent) === 0) ready.push(e.dependent);
      }
  }

  // A dependent never lands in an earlier phase than what it waits on.
  for (const id of topo)
    for (const e of reduced)
      if (e.dependent === id) {
        const it = items.get(id)!;
        const pre = items.get(e.prerequisite)!;
        if (PHASE_RANK[pre.phase] > PHASE_RANK[it.phase]) {
          notes.push(`"${byId.get(id)?.title}": ${it.phase} -> ${pre.phase} (waits on "${byId.get(e.prerequisite)?.title}")`);
          it.phase = pre.phase;
        }
      }

  const out: PlannedItem[] = [];
  for (const phase of PHASES) {
    let n = 0;
    for (const id of topo) {
      const it = items.get(id)!;
      if (it.phase === phase) out.push({ ...it, order: ++n });
    }
  }
  return { items: out, edges: reduced, notes };
}

// ---------------------------------------------------------------------------
// Model pass
// ---------------------------------------------------------------------------

export function roadmapSystemPrompt(): string {
  return [
    `You sequence a renovation the way a general contractor plans a job. Rubric ${RUBRIC_VERSION}.`,
    'You get every recommendation on one project, each with a short id (R1, R2, ...). You return one roadmap item per id as JSON.',
    '',
    '## Phases',
    '- QUICK_WINS: a weekend, homeowner or handyman, no trades, roughly under $500.',
    '- MID_RANGE: about a week, one simple trade or a handyman, roughly under $5k.',
    '- MAJOR: multiple trades in sequence, lead times, permits, or anything structural.',
    '',
    '## Path',
    '- DIY: the homeowner does it with common tools.',
    '- HANDYMAN: fastening, patching, assembly, painting. No licensed trade work.',
    '- LICENSED_CONTRACTOR: any wiring, plumbing, gas, structure, or anything flagged for pro review.',
    '',
    '## Permit',
    '- NONE: finish-only work no building department touches (paint, textiles, furniture, plug-in lamps).',
    '- LIKELY: new circuits, moved plumbing or gas, structural changes, window or door changes.',
    '- UNKNOWN: anything in between. Never use REQUIRED. The local building department decides.',
    '',
    '## Dependencies',
    '- dependsOn lists the ids that must finish first, each with a one-sentence reason naming the physical conflict.',
    '- Trade order inside a room: structure, rough-in (wiring, plumbing), close walls, built-ins, paint, floors, furnishings.',
    '- Add cross-room edges only for shared work: one open wall, one panel upgrade, one water line, one crew moving through.',
    '- No edge without a physical reason. "Do the cheap thing first" is phase, not dependency.',
    '',
    '## Writing',
    '- scope: the work in under 8 words, Title Case, an imperative.',
    '- why: one sentence on what it fixes, carried from the rationale. No new claims.',
    '- riskNote: for anything structural, electrical, plumbing, gas, or flagged for pro review. Names who confirms what. Hedged, never definitive.',
    '',
    '## Safety',
    ...SAFETY_RULES.map((s) => `- ${s}`),
    '',
    '## Output',
    'JSON only: { "items": [{ "recId", "scope", "why", "phase", "path", "permit", "riskNote"?, "dependsOn"?: [{ "recId", "reason" }] }] }',
  ].join('\n');
}

export function roadmapMessage(recs: RoadmapRec[], shortOf: Map<string, string>): string {
  const effort = (e: Effort) => `${e} (${EFFORT.indexOf(e) + 1}/3)`;
  return [
    'Recommendations:',
    ...recs.map((r) =>
      [
        `${shortOf.get(r.id)} [${r.room ?? 'whole house'}] ${r.category} · ${effort(r.effort)}${r.needsProReview ? ' · PRO REVIEW' : ''}`,
        `  ${r.title}`,
        `  ${r.rationale.replace(/\s+/g, ' ')}`,
      ].join('\n'),
    ),
    '',
    'Return the roadmap JSON.',
  ].join('\n');
}

export function draftErrors(v: unknown): string[] {
  const o = v as { items?: unknown } | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.items)) return ['items missing'];
  const e: string[] = [];
  (o.items as Partial<DraftItem>[]).forEach((d, i) => {
    if (typeof d?.recId !== 'string') e.push(`items[${i}].recId missing`);
    if (typeof d?.scope !== 'string') e.push(`items[${i}].scope missing`);
    if (d?.dependsOn !== undefined && !Array.isArray(d.dependsOn)) e.push(`items[${i}].dependsOn invalid`);
  });
  return e;
}

export interface RoadmapResult {
  roadmap: Roadmap;
  model: string;
  usage: ModelUsage;
}

/** One reasoning-tier call per project, then planRoadmap enforces the rules. */
export async function buildRoadmap(recs: RoadmapRec[], userId: string): Promise<RoadmapResult> {
  if (!recs.length) throw new Error('No recommendations to sequence');
  const shortOf = new Map(recs.map((r, i) => [r.id, `R${i + 1}`]));
  const longOf = new Map([...shortOf].map(([id, s]) => [s, id]));
  const res = await call<{ items: DraftItem[] }>({
    task: 'build_roadmap',
    userId,
    system: [{ text: roadmapSystemPrompt(), cache: true }],
    messages: [{ role: 'user', content: roadmapMessage(recs, shortOf) }],
    maxTokens: 16000,
    json: true,
  });
  const errs = draftErrors(res.parsed);
  if (errs.length) throw new Error(`Roadmap failed shape check: ${errs.join('; ')}`);
  return { roadmap: planRoadmap(recs, res.parsed!.items, longOf), model: res.model, usage: res.usage };
}
