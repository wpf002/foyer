import { notFound } from 'next/navigation';
import { Chip, MoneyRange, type Tone } from '@foyer/ui';
import { BuildRoadmap } from '@/components/roadmap-tools';
import { api, isSample, type ApiProject } from '@/lib/api';
import {
  EFFORT_LABEL,
  PATH_LABEL,
  PERMIT_LABEL,
  PHASES,
  roadmap,
  type Effort,
  type Path,
  type Permit,
  type Phase,
} from '@/lib/mock';

const PERMIT_TONE: Record<Permit, Tone> = {
  NONE: 'neutral',
  LIKELY: 'brass',
  REQUIRED: 'danger',
  UNKNOWN: 'brass',
};

interface Item {
  id: string;
  phase: Phase;
  order: number;
  scope: string;
  why: string;
  path: Path;
  permit: Permit;
  effort: Effort;
  lowCents: number | null;
  highCents: number | null;
  riskNote: string | null;
  dependsOn: { id: string; reason: string }[];
}

const sampleItems = (): Item[] =>
  roadmap.map((r) => ({
    ...r,
    riskNote: r.riskNote ?? null,
    dependsOn: r.dependsOn ? [r.dependsOn] : [],
  }));

const liveItems = (p: ApiProject): Item[] =>
  p.roadmapItems.map((r) => ({
    ...r,
    dependsOn: r.dependsOn.map((d) => ({ id: d.prerequisiteId, reason: d.reason })),
  }));

const hasCost = (i: Item): i is Item & { lowCents: number; highCents: number } =>
  i.lowCents !== null && i.highCents !== null;

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let items: Item[];
  let live: { projectId: string; recs: number } | null = null;
  if (isSample(id)) items = sampleItems();
  else {
    const p = await api<ApiProject>(`/projects/${id}`);
    if (!p) notFound();
    items = liveItems(p);
    live = { projectId: p.id, recs: p.rooms.reduce((n, r) => n + r.recommendations.length, 0) };
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const phases = PHASES.map((ph) => ({
    ...ph,
    items: items.filter((r) => r.phase === ph.key).sort((a, b) => a.order - b.order),
  })).filter((ph) => ph.items.length);

  return (
    <article>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Roadmap</h2>
          <p className="lede mt-3">
            {items.length ? `${phases.length} phases. Each waits on the one before.` : 'Not Built Yet'}
          </p>
        </div>
        {live && live.recs ? <BuildRoadmap projectId={live.projectId} built={items.length > 0} /> : null}
      </header>

      {live && !live.recs ? <p className="mt-10 text-ink-muted">Critique a room first.</p> : null}

      {phases.map((phase) => {
        const priced = phase.items.filter(hasCost);
        return (
          <section key={phase.key} className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-5xl leading-none text-clay/70">{phase.n}</span>
                <div>
                  <h3 className="text-[2rem]">{phase.label}</h3>
                  <p className="mt-1 text-sm text-ink-faint">{phase.band}</p>
                </div>
              </div>
              {priced.length === phase.items.length ? (
                <MoneyRange
                  lowCents={priced.reduce((n, r) => n + r.lowCents, 0)}
                  highCents={priced.reduce((n, r) => n + r.highCents, 0)}
                  className="font-display text-2xl text-brass"
                />
              ) : null}
            </div>

            <ol className="mt-6 space-y-4">
              {phase.items.map((item) => (
                <li key={item.id}>
                  {item.dependsOn.map((d) => {
                    const dep = byId.get(d.id);
                    return dep ? (
                      <p
                        key={d.id}
                        className="mb-3 ml-6 max-w-[62ch] border-l-2 border-line-strong pl-4 text-sm text-ink-muted"
                      >
                        <span className="font-medium text-ink">After {dep.scope}. </span>
                        {d.reason}
                      </p>
                    ) : null;
                  })}
                  <div className="card grid gap-4 p-6 sm:grid-cols-[2.75rem_1fr]">
                    <span className="flex size-11 items-center justify-center rounded-full bg-sunken font-display text-xl text-ink">
                      {item.order}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <h4 className="font-display text-[1.6rem] leading-tight text-ink">{item.scope}</h4>
                        {hasCost(item) ? (
                          <MoneyRange lowCents={item.lowCents} highCents={item.highCents} className="text-brass" />
                        ) : null}
                      </div>
                      <p className="mt-1.5 max-w-[60ch] text-ink-muted">{item.why}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        <Chip>{PATH_LABEL[item.path]}</Chip>
                        <Chip tone={PERMIT_TONE[item.permit]}>{PERMIT_LABEL[item.permit]}</Chip>
                        <Chip>{EFFORT_LABEL[item.effort]}</Chip>
                      </div>
                      {item.riskNote ? (
                        <div className="mt-5 rounded-sm bg-danger-soft px-4 py-3">
                          <p className="text-sm font-medium text-danger">Consult A Licensed Professional</p>
                          <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">{item.riskNote}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </article>
  );
}
