/* Money: ranges only. A point estimate claims precision we do not have. */

export function money(cents: number): string {
  const d = cents / 100;
  if (d >= 10_000) return `$${Math.round(d / 1000)}k`;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${Math.round(d).toLocaleString('en-US')}`;
}

/** A budget band. Open-ended bands read as "Under $10k" or "$50k+" rather than a fake range. */
export function budgetLabel(lowCents: number | null, highCents: number | null): string | undefined {
  if (lowCents && highCents) return `${money(lowCents)}–${money(highCents)}`;
  if (highCents) return `Under ${money(highCents)}`;
  if (lowCents) return `${money(lowCents)}+`;
  return undefined;
}
