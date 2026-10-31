import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Chip, money, MoneyRange, RangeBar } from '@foyer/ui';
import { QuoteEntry, Reprice } from '@/components/cost-tools';
import { api, isSample, type ApiProject } from '@/lib/api';
import { PHASES, project as sample, roadmap, type Phase } from '@/lib/mock';

interface Row {
  id: string;
  phase: Phase;
  order: number;
  scope: string;
  lowCents: number | null;
  midCents: number | null;
  highCents: number | null;
  basis: string | null;
  localPoints: number;
  actualCents: number | null;
}

interface View {
  live: string | null;
  zip: string;
  budget: { low: number; high: number } | null;
  region: { factor: number; basis: 'metro' | 'state' | 'national'; state: string | null };
  rows: Row[];
}

const sampleView = (): View => ({
  live: null,
  zip: sample.zip,
  budget: { low: sample.budgetLowCents, high: sample.budgetHighCents },
  region: { factor: sample.regionFactor, basis: 'metro', state: null },
  rows: roadmap.map((r) => ({ ...r, basis: null, localPoints: 0, actualCents: null })),
});

const liveView = (p: ApiProject): View => ({
  live: p.id,
  zip: p.zip,
  budget:
    p.budgetLowCents !== null && p.budgetHighCents !== null
      ? { low: p.budgetLowCents, high: p.budgetHighCents }
      : null,
  region: p.region,
  rows: p.roadmapItems.map((r) => ({
    id: r.id,
    phase: r.phase,
    order: r.order,
    scope: r.scope,
    lowCents: r.lowCents,
    highCents: r.highCents,
    midCents: r.lowCents !== null ? (r.cost?.midCents ?? null) : null,
    basis: r.cost?.basis ?? null,
    localPoints: r.cost?.localPoints ?? 0,
    actualCents: r.cost?.actualCents ?? null,
  })),
});

type Priced<T> = T & { lowCents: number; midCents: number; highCents: number };
const isPriced = <T extends Row>(r: T): r is Priced<T> => r.lowCents !== null && r.midCents !== null && r.highCents !== null;

const REGION_LABEL = (r: View['region']) =>
  r.basis === 'metro'
    ? `Metro ×${r.factor.toFixed(2)}`
    : r.basis === 'state'
      ? `${r.state} ×${r.factor.toFixed(2)}`
      : 'National Baseline';

export default async function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let v: View;
  if (isSample(id)) v = sampleView();
  else {
    const p = await api<ApiProject>(`/projects/${id}`);
    if (!p) notFound();
    v = liveView(p);
  }

  const ordered = PHASES.flatMap((p) =>
    v.rows
      .filter((r) => r.phase === p.key)
      .sort((a, b) => a.order - b.order)
      .map((r) => ({ ...r, phaseLabel: p.label })),
  );
  const priced = ordered.filter(isPriced);
  const unpriced = ordered.filter((r) => !isPriced(r));
  const totals = priced.reduce(
    (t, r) => ({ low: t.low + r.lowCents, mid: t.mid + r.midCents, high: t.high + r.highCents }),
    { low: 0, mid: 0, high: 0 },
  );
  const quoted = priced.filter((r) => r.actualCents !== null);
  const local = priced.filter((r) => r.localPoints > 0).length;

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Costs</h2>
        <p className="lede mt-3">Ranges for zip {v.zip}. Never a quote.</p>
      </div>
      {v.live && v.rows.length ? <Reprice projectId={v.live} /> : null}
    </header>
  );

  if (!v.rows.length)
    return (
      <article>
        {header}
        <p className="mt-10 text-ink-muted">
          <Link href={`/projects/${id}/roadmap`} className="text-clay underline-offset-4 hover:underline">
            Build The Roadmap
          </Link>{' '}
          to price it.
        </p>
      </article>
    );

  const scaleMax = Math.max(totals.high, v.budget?.high ?? 0) || 1;
  const pct = (c: number) => `${(c / scaleMax) * 100}%`;

  /* How far down the roadmap the stated band reaches, by midpoint. */
  let run = 0;
  let reach: string | null = null;
  let breaks: string | null = null;
  for (const p of PHASES) {
    run += priced.filter((r) => r.phase === p.key).reduce((n, r) => n + r.midCents, 0);
    if (v.budget && run <= v.budget.high) reach = p.label;
    else if (v.budget && !breaks && priced.some((r) => r.phase === p.key)) breaks = p.label;
  }
  const fits = v.budget ? totals.mid <= v.budget.high : null;
  const itemMax = Math.max(1, ...priced.map((r) => r.highCents));

  return (
    <article>
      {header}

      <section className="mt-12 rounded-lg bg-espresso p-8 text-ink-inverse lg:p-10">
        <dl className="grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-inverse-muted">Budget</dt>
            <dd className="mt-1 font-display text-3xl">
              {v.budget ? <MoneyRange lowCents={v.budget.low} highCents={v.budget.high} /> : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-inverse-muted">{unpriced.length ? 'Priced Plan' : 'Full Plan'}</dt>
            <dd className="mt-1">
              <MoneyRange lowCents={totals.low} highCents={totals.high} className="font-display text-3xl" />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-inverse-muted">Midpoint</dt>
            <dd className="mt-1 font-display text-3xl text-brass-lit">{money(totals.mid)}</dd>
          </div>
        </dl>

        <div className="relative mt-10 h-10">
          <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-espresso-soft" />
          <div
            className="absolute top-4 h-2 rounded-full bg-brass-dim/60"
            style={{ left: pct(totals.low), right: `calc(100% - ${pct(totals.high)})` }}
          />
          <div
            className="absolute top-2.5 h-5 w-0.5 rounded-full bg-brass-lit"
            style={{ left: pct(totals.mid) }}
            aria-hidden
          />
          {v.budget ? (
            <div
              className="absolute top-0 bottom-0 rounded-sm border border-dashed border-clay-lit bg-clay-lit/12"
              style={{ left: pct(v.budget.low), right: `calc(100% - ${pct(v.budget.high)})` }}
            />
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-5 text-xs text-ink-inverse-muted">
          {v.budget ? (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-xs border border-dashed border-clay-lit" aria-hidden />
              Budget
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-brass-dim/60" aria-hidden />
            Plan
          </span>
        </div>

        {fits !== null ? (
          <p className="mt-8 max-w-[44ch] font-display text-2xl leading-snug">
            {fits
              ? 'The plan fits the budget.'
              : reach
                ? `Through ${reach}, the plan fits. ${breaks ?? 'The rest'} breaks it.`
                : 'Quick Wins alone exceed the budget.'}
          </p>
        ) : null}
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h3 className="text-[1.875rem]">By Item</h3>
          <div className="flex flex-wrap gap-1.5">
            <Chip>{REGION_LABEL(v.region)}</Chip>
            {local ? <Chip tone="olive">{local} Local</Chip> : null}
            {quoted.length ? <Chip tone="brass">{quoted.length} Quoted</Chip> : null}
          </div>
        </div>
        <div className="card mt-5 overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-sunken/60 text-sm text-ink-muted">
                <th className="px-6 py-3 font-medium">Scope</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Range</th>
                <th className="px-6 py-3 text-right font-medium">Low To High</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((item) => (
                <tr key={item.id} className="border-t border-line align-middle">
                  <td className="px-6 py-4">
                    <span className="text-ink">{item.scope}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {item.phaseLabel}
                      {item.basis ? ` · ${item.basis}` : ''}
                    </span>
                  </td>
                  <td className="hidden w-[34%] px-4 py-4 sm:table-cell">
                    {isPriced(item) ? (
                      <RangeBar
                        lowCents={item.lowCents}
                        midCents={item.midCents}
                        highCents={item.highCents}
                        scaleMaxCents={itemMax}
                      />
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isPriced(item) ? (
                      <MoneyRange lowCents={item.lowCents} highCents={item.highCents} />
                    ) : (
                      <span className="text-sm text-ink-faint">Not Priced</span>
                    )}
                    {v.live && isPriced(item) ? (
                      <div className="mt-1">
                        <QuoteEntry itemId={item.id} actualCents={item.actualCents} />
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong">
                <td className="px-6 py-4 font-medium text-ink">
                  Total
                  {unpriced.length ? (
                    <span className="ml-2 text-xs font-normal text-ink-faint">{unpriced.length} Not Priced</span>
                  ) : null}
                </td>
                <td className="hidden sm:table-cell" />
                <td className="px-6 py-4 text-right">
                  <MoneyRange
                    lowCents={totals.low}
                    highCents={totals.high}
                    className="font-display text-xl text-brass"
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </article>
  );
}
