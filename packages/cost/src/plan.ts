export interface PlanTotal {
  lowCents: number;
  highCents: number;
  /** Items with no price yet. Excluded from the sums. */
  unpriced: number;
}

export interface PricedLine {
  lowCents: number | null;
  highCents: number | null;
}

/** Sums priced lines. A line missing either bound counts as unpriced. */
export function sumPlan(lines: PricedLine[]): PlanTotal {
  return lines.reduce<PlanTotal>(
    (total, line) =>
      line.lowCents !== null && line.highCents !== null
        ? { ...total, lowCents: total.lowCents + line.lowCents, highCents: total.highCents + line.highCents }
        : { ...total, unpriced: total.unpriced + 1 },
    { lowCents: 0, highCents: 0, unpriced: 0 },
  );
}
