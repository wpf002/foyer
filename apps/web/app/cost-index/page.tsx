import { Button, cx, TextInput } from '@foyer/ui';
import { api, type ApiCostIndex, type ApiIndexCell } from '@/lib/api';

export const dynamic = 'force-dynamic';

const UNIT: Record<string, string> = { sqft: 'sq ft', linear_ft: 'lin ft', each: 'ea', room: 'room', job: 'job' };

/** Per-unit prices run from cents to thousands. */
const perUnit = (cents: number) => {
  const d = cents / 100;
  return d < 10 ? `$${d.toFixed(2)}` : `$${Math.round(d).toLocaleString('en-US')}`;
};

const month = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function Delta({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  return (
    <span className={cx('tabular-nums', pct > 0 ? 'text-clay' : pct < 0 ? 'text-olive' : 'text-ink-faint')}>
      {pct > 0 ? '+' : ''}
      {pct}%
    </span>
  );
}

/** Quartile spread with the median tick, on a scale shared by the row's baseline. */
function Spread({ c }: { c: ApiIndexCell }) {
  const max = Math.max(c.p75Cents, c.baselineCents) * 1.15 || 1;
  const at = (x: number) => `${(x / max) * 100}%`;
  return (
    <div className="relative h-2 w-full min-w-[7rem] rounded-full bg-sunken" aria-hidden>
      <div className="absolute inset-y-0 rounded-full bg-brass/40" style={{ left: at(c.p25Cents), right: `calc(100% - ${at(c.p75Cents)})` }} />
      <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-brass" style={{ left: at(c.medianCents) }} />
      <div className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-faint bg-surface" style={{ left: at(c.baselineCents) }} />
    </div>
  );
}

export default async function CostIndexPage({ searchParams }: { searchParams: Promise<{ zip3?: string }> }) {
  const { zip3: raw } = await searchParams;
  const zip3 = raw && /^\d{3}$/.test(raw) ? raw : undefined;
  const q = zip3 ? `?zip3=${zip3}` : '';
  const idx = await api<ApiCostIndex>(`/cost/index${q}`);
  const cells = idx?.cells ?? [];

  const stats: [string, number][] = [
    ['Quotes', idx?.points ?? 0],
    ['Regions', idx?.regions ?? 0],
    ['Work Types', idx?.workTypes ?? 0],
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-12 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Quotes And Invoices · Last 2 Years</p>
          <h1 className="mt-2 text-[clamp(2.75rem,5vw,4rem)]">Cost Index</h1>
        </div>
        <dl className="flex gap-10 text-right">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-ink-faint">{k}</dt>
              <dd className="font-display text-3xl tabular-nums">{v.toLocaleString('en-US')}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <form className="flex items-end gap-2" action="/cost-index">
          <label>
            <span className="text-sm font-medium text-ink">Zip3</span>
            <TextInput
              name="zip3"
              defaultValue={zip3}
              inputMode="numeric"
              pattern="\d{3}"
              maxLength={3}
              placeholder="021"
              className="mt-1.5 w-28 tabular-nums"
            />
          </label>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        <div className="flex items-center gap-5 text-sm">
          {idx?.suppressed ? (
            <span className="text-ink-faint" title="Cells under 5 quotes stay private">
              {idx.suppressed} Held Back
            </span>
          ) : null}
          <a href={`/api/v1/cost/index.csv${q}`} className="text-ink-muted underline-offset-4 transition-colors hover:text-clay hover:underline">
            Download CSV
          </a>
        </div>
      </div>

      {cells.length ? (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-sunken/60 text-sm text-ink-muted">
                <th className="px-6 py-3 font-medium">Work</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 text-right font-medium">Quotes</th>
                <th className="px-4 py-3 text-right font-medium">Low</th>
                <th className="px-4 py-3 text-right font-medium">Median</th>
                <th className="px-4 py-3 text-right font-medium">High</th>
                <th className="hidden w-[18%] px-4 py-3 font-medium lg:table-cell">Spread</th>
                <th className="px-6 py-3 text-right font-medium" title="Median against the regional baseline">
                  Vs Baseline
                </th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c) => (
                <tr key={`${c.zip3}-${c.workType}`} className="border-t border-line align-middle">
                  <td className="px-6 py-4">
                    <span className="font-display text-lg text-ink">{c.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      Per {UNIT[c.unit] ?? c.unit} · {month(c.lastObserved)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-ink-muted tabular-nums">{c.zip3}xx</td>
                  <td className="px-4 py-4 text-right text-sm text-ink-muted tabular-nums" title={`${c.invoices} invoices`}>
                    {c.n}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-ink-muted tabular-nums">{perUnit(c.p25Cents)}</td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-ink tabular-nums">{perUnit(c.medianCents)}</td>
                  <td className="px-4 py-4 text-right text-sm text-ink-muted tabular-nums">{perUnit(c.p75Cents)}</td>
                  <td className="hidden px-4 py-4 lg:table-cell">
                    <Spread c={c} />
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Delta v={c.delta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-10 text-ink-muted">{zip3 ? `No published cells in ${zip3}xx.` : 'No region has 5 quotes yet.'}</p>
      )}
    </div>
  );
}
