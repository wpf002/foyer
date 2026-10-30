import { cx } from './cx';

/* -------------------------------------------------------------------------- */
/* Money — ranges only. A point estimate claims precision we do not have.     */
/* -------------------------------------------------------------------------- */

export function money(cents: number): string {
  const d = cents / 100;
  if (d >= 10_000) return `$${Math.round(d / 1000)}k`;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${Math.round(d).toLocaleString('en-US')}`;
}

export function MoneyRange({
  lowCents,
  highCents,
  className,
}: {
  lowCents: number;
  highCents: number;
  className?: string;
}) {
  return (
    <span className={cx('whitespace-nowrap tabular-nums', className)}>
      {money(lowCents)}
      <span className="mx-0.5 opacity-50">–</span>
      {money(highCents)}
    </span>
  );
}

/**
 * Range bar on a scale shared across every item in a list, so the eye reads
 * relative weight before it reads the numbers.
 */
export function RangeBar({
  lowCents,
  midCents,
  highCents,
  scaleMaxCents,
}: {
  lowCents: number;
  midCents: number;
  highCents: number;
  scaleMaxCents: number;
}) {
  const pct = (c: number) => `${Math.min(100, (c / scaleMaxCents) * 100)}%`;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-2 flex-1 rounded-full bg-sunken">
        <div
          className="absolute inset-y-0 rounded-full bg-brass/40"
          style={{ left: pct(lowCents), right: `calc(100% - ${pct(highCents)})` }}
        />
        <div
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-brass"
          style={{ left: pct(midCents) }}
          aria-hidden
        />
      </div>
      <MoneyRange lowCents={lowCents} highCents={highCents} className="w-32 text-right text-xs" />
    </div>
  );
}
