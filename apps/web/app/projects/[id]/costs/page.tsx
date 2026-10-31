import { sampleOnly } from '@/lib/sample-only';
import { money, MoneyRange, RangeBar } from '@foyer/ui';
import { PHASES, project, roadmap, totals } from '@/lib/mock';

export default async function CostsPage({ params }: { params: Promise<{ id: string }> }) {
  await sampleOnly(params);
  const scaleMax = Math.max(totals.highCents, project.budgetHighCents);
  const pct = (c: number) => `${(c / scaleMax) * 100}%`;

  /* How far down the roadmap the stated band actually reaches. */
  let run = 0;
  let reach = '';
  for (const p of PHASES) {
    run += roadmap.filter((r) => r.phase === p.key).reduce((n, r) => n + r.midCents, 0);
    if (run <= project.budgetHighCents) reach = p.label;
  }
  const fits = run <= project.budgetHighCents;

  const itemMax = Math.max(...roadmap.map((r) => r.highCents));

  return (
    <article>
      <header>
        <h2 className="text-[clamp(2.75rem,5vw,4rem)]">Costs</h2>
        <p className="lede mt-3">Ranges for zip {project.zip}. Never a quote.</p>
      </header>

      {/* Band versus plan, on the dark ground so the two ranges carry the page. */}
      <section className="mt-12 rounded-lg bg-espresso p-8 text-ink-inverse lg:p-10">
        <dl className="grid gap-8 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-inverse-muted">Budget</dt>
            <dd className="mt-1">
              <MoneyRange
                lowCents={project.budgetLowCents}
                highCents={project.budgetHighCents}
                className="font-display text-3xl"
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-inverse-muted">Full Plan</dt>
            <dd className="mt-1">
              <MoneyRange
                lowCents={totals.lowCents}
                highCents={totals.highCents}
                className="font-display text-3xl"
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-inverse-muted">Midpoint</dt>
            <dd className="mt-1 font-display text-3xl text-[#e3c98a]">{money(totals.midCents)}</dd>
          </div>
        </dl>

        <div className="relative mt-10 h-10">
          <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-espresso-soft" />
          <div
            className="absolute top-4 h-2 rounded-full bg-[#c9a95e]/60"
            style={{ left: pct(totals.lowCents), right: `calc(100% - ${pct(totals.highCents)})` }}
          />
          <div
            className="absolute top-2.5 h-5 w-0.5 rounded-full bg-[#e3c98a]"
            style={{ left: pct(totals.midCents) }}
            aria-hidden
          />
          <div
            className="absolute top-0 bottom-0 rounded-sm border border-dashed border-[#e08a62] bg-[#e08a62]/12"
            style={{
              left: pct(project.budgetLowCents),
              right: `calc(100% - ${pct(project.budgetHighCents)})`,
            }}
          />
        </div>
        <div className="mt-3 flex items-center gap-5 text-xs text-ink-inverse-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs border border-dashed border-[#e08a62]" aria-hidden />
            Budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-[#c9a95e]/60" aria-hidden />
            Plan
          </span>
        </div>

        <p className="mt-8 max-w-[44ch] font-display text-2xl leading-snug">
          {fits ? 'The full plan fits the budget.' : `Through ${reach}, the plan fits. Major breaks it.`}
        </p>
      </section>

      <section className="mt-14">
        <h3 className="text-[1.875rem]">By Item</h3>
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
              {PHASES.flatMap((p) =>
                roadmap
                  .filter((r) => r.phase === p.key)
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <tr key={item.id} className="border-t border-line align-middle">
                      <td className="px-6 py-4">
                        <span className="text-ink">{item.scope}</span>
                        <span className="mt-0.5 block text-xs text-ink-faint">{p.label}</span>
                      </td>
                      <td className="hidden w-[34%] px-4 py-4 sm:table-cell">
                        <RangeBar
                          lowCents={item.lowCents}
                          midCents={item.midCents}
                          highCents={item.highCents}
                          scaleMaxCents={itemMax}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <MoneyRange lowCents={item.lowCents} highCents={item.highCents} />
                      </td>
                    </tr>
                  )),
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong">
                <td className="px-6 py-4 font-medium text-ink">Total</td>
                <td className="hidden sm:table-cell" />
                <td className="px-6 py-4 text-right">
                  <MoneyRange
                    lowCents={totals.lowCents}
                    highCents={totals.highCents}
                    className="font-display text-xl text-brass"
                  />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-faint">
          Baseline unit costs × {project.regionFactor.toFixed(2)} region factor. Local bids will
          differ.
        </p>
      </section>
    </article>
  );
}
