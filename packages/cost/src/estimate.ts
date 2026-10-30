import { adapter, type BaselineLine } from './baseline';
import { regionFactor } from './region';

export interface Range {
  lowCents: number;
  midCents: number;
  highCents: number;
  zip: string;
  regionFactor: number;
  source: string;
  line: BaselineLine;
}

/** Always a range. A point estimate is a lie about precision we do not have. */
export async function estimate(
  workType: string,
  quantity: number,
  zip: string,
): Promise<Range | null> {
  const a = adapter();
  const line = await a.lookup(workType);
  if (!line) return null;
  const { factor } = regionFactor(zip);
  const scale = (c: number) => Math.round(c * quantity * factor);
  return {
    lowCents: scale(line.lowCents),
    midCents: scale(line.midCents),
    highCents: scale(line.highCents),
    zip,
    regionFactor: factor,
    source: a.source,
    line,
  };
}

/** Flywheel write. Fire and forget on every estimate, from day one. */
export interface FlywheelRow {
  zip: string;
  workType: string;
  baselineCents: number;
  quotedCents?: number;
  actualCents?: number;
  source: string;
  unit?: string;
  quantity?: number;
}

export function flywheelRow(r: Range, quantity: number): FlywheelRow {
  return {
    zip: r.zip,
    workType: r.line.workType,
    baselineCents: r.midCents,
    source: r.source,
    unit: r.line.unit,
    quantity,
  };
}
