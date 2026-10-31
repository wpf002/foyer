import { TITLES, type ArtifactDoc, type ArtifactType, type Block, type Section } from './types';

/**
 * Deterministic handoff documents. Every line is read off project rows, so a
 * document is reproducible and never says something the plan does not.
 */

export type Phase = 'QUICK_WINS' | 'MID_RANGE' | 'MAJOR';
export type Path = 'DIY' | 'HANDYMAN' | 'LICENSED_CONTRACTOR';
export type Permit = 'NONE' | 'LIKELY' | 'REQUIRED' | 'UNKNOWN';

export interface ArtifactInput {
  project: {
    name: string;
    zip: string;
    city?: string | null;
    budgetLowCents: number | null;
    budgetHighCents: number | null;
  };
  answers: { questionId: string; section: string; prompt: string; raw: string }[];
  rooms: { id: string; name: string; fixed: string[] }[];
  recs: {
    id: string;
    roomId: string | null;
    title: string;
    category: string;
    citation: string;
    preserve: string | null;
    needsProReview: boolean;
  }[];
  items: {
    id: string;
    recommendationId: string | null;
    phase: Phase;
    order: number;
    scope: string;
    why: string;
    path: Path;
    permit: Permit;
    lowCents: number | null;
    highCents: number | null;
    riskNote: string | null;
    dependsOn: { id: string; reason: string }[];
  }[];
  issuedAt: string;
}

const PHASE_LABEL: Record<Phase, string> = { QUICK_WINS: 'Quick Wins', MID_RANGE: 'Mid-Range', MAJOR: 'Major' };
const PHASES: Phase[] = ['QUICK_WINS', 'MID_RANGE', 'MAJOR'];
const PATH_LABEL: Record<Path, string> = { DIY: 'DIY', HANDYMAN: 'Handyman', LICENSED_CONTRACTOR: 'Licensed' };
const PERMIT_LABEL: Record<Permit, string> = {
  NONE: 'No Permit',
  LIKELY: 'Permit Likely',
  REQUIRED: 'Permit Required',
  UNKNOWN: 'Permit Unknown',
};

const usd = (c: number) =>
  `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const range = (lo: number | null, hi: number | null) =>
  lo === null || hi === null ? 'Not Priced' : `${usd(lo)}–${usd(hi)}`;
const mid = (i: { lowCents: number | null; highCents: number | null }) =>
  i.lowCents === null || i.highCents === null ? 0 : Math.round((i.lowCents + i.highCents) / 2);

type Item = ArtifactInput['items'][number];

function ctx(input: ArtifactInput) {
  const recById = new Map(input.recs.map((r) => [r.id, r]));
  const roomById = new Map(input.rooms.map((r) => [r.id, r]));
  const itemById = new Map(input.items.map((i) => [i.id, i]));
  const answer = (q: string) => input.answers.find((a) => a.questionId === q && a.raw.trim());
  const ordered = PHASES.flatMap((p) =>
    input.items.filter((i) => i.phase === p).sort((a, b) => a.order - b.order),
  );
  const roomOf = (i: Item) => {
    const rec = i.recommendationId ? recById.get(i.recommendationId) : undefined;
    return rec?.roomId ? roomById.get(rec.roomId) : undefined;
  };
  const preserved = Array.from(
    new Set(input.recs.map((r) => r.preserve).filter((p): p is string => !!p?.trim())),
  );
  return { recById, itemById, answer, ordered, roomOf, preserved };
}

const byPhase = (ordered: Item[], row: (i: Item) => { label: string; value: string }): Block => ({
  kind: 'lines',
  groups: PHASES.map((p) => ({
    label: PHASE_LABEL[p],
    rows: ordered.filter((i) => i.phase === p).map(row),
  })).filter((g) => g.rows.length),
});

/* -------------------------------------------------------------------------- */

function contractorBrief(input: ArtifactInput): Section[] {
  const c = ctx(input);
  const keep = c.answer('Q10');
  const deps = c.ordered.flatMap((i) =>
    i.dependsOn.map((d) => ({
      title: `${i.scope} follows ${c.itemById.get(d.id)?.scope ?? 'an earlier item'}`,
      body: d.reason,
    })),
  );
  const site = input.rooms
    .filter((r) => r.fixed.length)
    .map((r) => ({ label: r.name, rows: r.fixed.map((f) => ({ label: f, value: 'Fixed' })) }));
  const flagged = c.ordered.filter((i) => i.permit !== 'NONE');
  const risky = c.ordered.filter((i) => i.riskNote);

  return [
    {
      heading: 'Scope, In Order',
      blocks: [byPhase(c.ordered, (i) => ({
        label: `${i.order}. ${i.scope}`,
        value: `${PATH_LABEL[i.path]} · ${range(i.lowCents, i.highCents)}`,
      }))],
    },
    {
      heading: 'Do Not Touch',
      blocks: [{ kind: 'bullets', items: [...(keep ? [keep.raw] : []), ...c.preserved] }],
    },
    { heading: 'Sequencing', blocks: [{ kind: 'notes', items: deps }] },
    { heading: 'Site Constraints', blocks: [{ kind: 'lines', groups: site }] },
    {
      heading: 'Permits Flagged',
      blocks: [
        { kind: 'lines', groups: [{ rows: flagged.map((i) => ({ label: i.scope, value: PERMIT_LABEL[i.permit] })) }] },
        { kind: 'prose', text: 'Flags come from a rules table. The permitting authority decides.' },
      ],
    },
    {
      heading: 'Professional Review Required',
      blocks: [{ kind: 'notes', tone: 'danger', items: risky.map((i) => ({ title: i.scope, body: i.riskNote! })) }],
    },
  ];
}

function designerBrief(input: ArtifactInput): Section[] {
  const c = ctx(input);
  const mood = ['Q07', 'Q09', 'Q12'].map((q) => c.answer(q)).filter((a) => !!a);
  const veto = c.answer('Q11');
  const keep = c.answer('Q10');

  const rooms = new Map<string, { n: number; mid: number }>();
  for (const i of c.ordered) {
    const name = c.roomOf(i)?.name ?? 'Whole House';
    const r = rooms.get(name) ?? { n: 0, mid: 0 };
    rooms.set(name, { n: r.n + 1, mid: r.mid + mid(i) });
  }
  const priority = [...rooms.entries()].sort((a, b) => b[1].mid - a[1].mid || b[1].n - a[1].n);
  const anyPriced = c.ordered.some((i) => i.lowCents !== null);

  return [
    {
      heading: 'The Mood, In Their Words',
      blocks: [{ kind: 'quotes', items: mood.map((a) => ({ cite: a.questionId, text: a.raw })) }],
    },
    {
      heading: 'Priority Areas',
      blocks: [{
        kind: 'lines',
        groups: [{
          rows: priority.map(([name, r]) => ({
            label: name,
            value: `${r.n} ${r.n === 1 ? 'Item' : 'Items'}${anyPriced ? ` · ${usd(r.mid)} Mid` : ''}`,
          })),
        }],
      }],
    },
    {
      heading: 'Where The Money Goes',
      blocks: anyPriced
        ? [{
            kind: 'lines',
            groups: [{
              rows: PHASES.map((p) => ({
                label: PHASE_LABEL[p],
                value: `${usd(c.ordered.filter((i) => i.phase === p).reduce((n, i) => n + mid(i), 0))} Mid`,
              })),
            }],
          }]
        : [],
    },
    { heading: 'Pieces Retained', blocks: [{ kind: 'bullets', items: [...(keep ? [keep.raw] : []), ...c.preserved] }] },
    { heading: 'Avoid', blocks: veto ? [{ kind: 'quotes', items: [{ cite: veto.questionId, text: veto.raw }] }] : [] },
  ];
}

function shoppingList(input: ArtifactInput): Section[] {
  const c = ctx(input);
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const i of c.ordered) {
    const name = c.roomOf(i)?.name ?? 'Whole House';
    groups.set(name, [...(groups.get(name) ?? []), { label: i.scope, value: range(i.lowCents, i.highCents) }]);
  }
  const priced = c.ordered.filter((i) => i.lowCents !== null && i.highCents !== null);
  const { budgetLowCents: bl, budgetHighCents: bh } = input.project;
  return [
    { heading: 'By Room', blocks: [{ kind: 'lines', groups: [...groups].map(([label, rows]) => ({ label, rows })) }] },
    {
      heading: 'Budget Ranges',
      blocks: priced.length
        ? [
            {
              kind: 'lines',
              groups: [{
                rows: [
                  {
                    label: priced.length < c.ordered.length ? 'Priced Items' : 'Full Roadmap',
                    value: range(
                      priced.reduce((n, i) => n + i.lowCents!, 0),
                      priced.reduce((n, i) => n + i.highCents!, 0),
                    ),
                  },
                  ...(bl !== null && bh !== null ? [{ label: 'Stated Budget', value: range(bl, bh) }] : []),
                ],
              }],
            },
            { kind: 'prose', text: 'Specified to a range, not a SKU. Substitute inside the range.' },
          ]
        : [],
    },
  ];
}

function permitChecklist(input: ArtifactInput): Section[] {
  const c = ctx(input);
  const flagged = c.ordered.filter((i) => i.permit !== 'NONE');
  const risky = c.ordered.filter((i) => i.riskNote);
  const where = input.project.city ? `${input.project.city} (${input.project.zip})` : `zip ${input.project.zip}`;
  return [
    {
      heading: 'Flagged Items',
      blocks: [{ kind: 'lines', groups: [{ rows: flagged.map((i) => ({ label: i.scope, value: PERMIT_LABEL[i.permit] })) }] }],
    },
    {
      heading: 'Structural And Licensed Items',
      blocks: [{ kind: 'notes', tone: 'danger', items: risky.map((i) => ({ title: i.scope, body: i.riskNote! })) }],
    },
    {
      heading: 'Local Resources',
      blocks: [{
        kind: 'bullets',
        items: [
          `Permits for ${where} are set by the local building department.`,
          'Ask the department whether over-the-counter review applies to each flagged item.',
        ],
      }],
    },
    {
      heading: 'Before You File',
      blocks: [{
        kind: 'checklist',
        items: [
          'Contractor pulls the permit in their name.',
          'You get a copy of the issued permit before work starts.',
          ...(risky.some((i) => /struct|wall|opening|beam|header|load/i.test(i.scope + i.riskNote))
            ? ['A structural determination is in writing before demolition.']
            : []),
          ...(flagged.some((i) => /light|sconce|circuit|panel|electric|outlet/i.test(i.scope))
            ? ['Electrical work is done by a licensed electrician.']
            : []),
          'Inspections are scheduled before walls or floors close.',
        ],
      }],
    },
  ];
}

/** Questions keyed off what the work touches. First match per rule. */
const ASK: { re: RegExp; q: string[] }[] = [
  { re: /wall|opening|beam|header|load|partition/i, q: ['Who makes the structural call, and do I get it in writing?', 'What changes if the wall turns out to carry load?'] },
  { re: /light|sconce|circuit|panel|electric|dimmer|outlet/i, q: ['Does the panel have capacity for this, or does it need an upgrade?'] },
  { re: /plumb|water|sink|fridge|faucet|vanity|drain/i, q: ['Where does the new line tie in, and does a floor or wall have to open?'] },
  { re: /floor|oak|hardwood/i, q: ['How many days off the floor, and which finish product?'] },
  { re: /paint|limewash|plaster/i, q: ['What prep do the existing walls get, and how many coats?'] },
  { re: /cabinet|reface|counter|quartz/i, q: ['Who templates the counter, and what is the lead time?'] },
];

function contractorQuestions(input: ArtifactInput): Section[] {
  const c = ctx(input);
  const hired = c.ordered.filter((i) => i.path !== 'DIY');
  const groups = hired.map((i) => {
    const text = `${i.scope} ${i.why}`;
    const q = [
      ...ASK.filter((a) => a.re.test(text)).flatMap((a) => a.q),
      ...(i.permit !== 'NONE' ? ['Will you pull the permit, and is it in the bid?'] : []),
      ...(i.lowCents !== null ? [`Our range is ${range(i.lowCents, i.highCents)}. Where does your number land, and why?`] : []),
    ];
    return { label: i.scope, items: Array.from(new Set(q)).slice(0, 4) };
  }).filter((g) => g.items.length);

  return [
    { heading: 'By Scope Item', blocks: [{ kind: 'questions', groups }] },
    {
      heading: 'Red Flags To Listen For',
      blocks: [{
        kind: 'bullets',
        items: [
          'Asks for more than a third up front.',
          'Says structural or electrical work needs no permit.',
          'Won’t put the scope in writing.',
          'No license number on the bid.',
          'Can start tomorrow on licensed work.',
        ],
      }],
    },
  ];
}

const BUILDERS: Record<ArtifactType, (i: ArtifactInput) => Section[]> = {
  CONTRACTOR_BRIEF: contractorBrief,
  DESIGNER_BRIEF: designerBrief,
  SHOPPING_LIST: shoppingList,
  PERMIT_CHECKLIST: permitChecklist,
  CONTRACTOR_QUESTIONS: contractorQuestions,
};

function isEmpty(b: Block): boolean {
  switch (b.kind) {
    case 'prose':
      return !b.text;
    case 'lines':
      return !b.groups.some((g) => g.rows.length);
    case 'questions':
      return !b.groups.some((g) => g.items.length);
    default:
      return !b.items.length;
  }
}

/** Builds one document. Sections with nothing to say are left out. */
export function buildArtifact(type: ArtifactType, input: ArtifactInput): ArtifactDoc {
  const sections = BUILDERS[type](input)
    .map((s) => ({ ...s, blocks: s.blocks.filter((b) => !isEmpty(b)) }))
    .filter((s) => s.blocks.some((b) => b.kind !== 'prose'));
  return {
    type,
    title: TITLES[type],
    projectName: input.project.name,
    location: input.project.city ? `${input.project.city} ${input.project.zip}` : input.project.zip,
    issuedAt: input.issuedAt,
    sections,
  };
}
