import type { PeriodValue } from "./measuredSeries";

/**
 * ROTATION-002 / DELTA-ADVANCED item 3 (owner approval 2026-10-27): "unusual for you". Speaks only when
 * the last UNUSUAL_RUN finished lived days are all outside the operator's own usual range, on the same
 * side. The range is the 10th–90th percentile of the measured days before them (never including the
 * judged days), widened to a minimum width so ordinary noise stays quiet. A reading, never an Engine
 * input, a diagnosis or a cause. Pure.
 */
export const UNUSUAL_RUN = 3;
/** Longest streak reported; beyond it the wording stays "N days" without reaching further back. */
export const UNUSUAL_MAX_RUN = 14;
export const UNUSUAL_LOW_QUANTILE = 0.1;
export const UNUSUAL_HIGH_QUANTILE = 0.9;

export interface UnusualSpec {
  /** Measured periods before the judged days that form the range. */
  baselinePeriods: number;
  /** A range needs at least this many measured periods (of the same day kind, when split). */
  minSamples: number;
  /** The narrowest range, centered on the median. */
  minWidth: number;
  /** Bounds round outward to this step, so the shown range is the one judged. */
  roundTo: number;
}
export const UNUSUAL_SPECS = {
  resting: { baselinePeriods: 28, minSamples: 14, minWidth: 6, roundTo: 1 },
  sleep: { baselinePeriods: 28, minSamples: 14, minWidth: 60, roundTo: 5 },
  steps: { baselinePeriods: 56, minSamples: 10, minWidth: 2000, roundTo: 100 },
} as const satisfies Record<string, UnusualSpec>;

export type DayKind = "WORK" | "OFF";
export interface UnusualReading {
  direction: "ABOVE" | "BELOW";
  /** Consecutive finished days outside the range, newest last. */
  days: { from: number; value: number; kind: DayKind | null; low: number; high: number }[];
  /** Measured periods behind the newest day's range. */
  samples: number;
}

function quantile(sorted: readonly number[], p: number): number {
  const h = (sorted.length - 1) * p, lo = Math.floor(h), hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}

/** The usual range from values, or null below the sample floor. */
export function usualRange(values: readonly number[], spec: UnusualSpec): { low: number; high: number; samples: number } | null {
  if (values.length < spec.minSamples) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let low = quantile(sorted, UNUSUAL_LOW_QUANTILE), high = quantile(sorted, UNUSUAL_HIGH_QUANTILE);
  if (high - low < spec.minWidth) { const mid = quantile(sorted, 0.5); low = mid - spec.minWidth / 2; high = mid + spec.minWidth / 2; }
  return { low: Math.max(0, Math.floor(low / spec.roundTo) * spec.roundTo), high: Math.ceil(high / spec.roundTo) * spec.roundTo, samples: values.length };
}

/**
 * The newest streak of at least UNUSUAL_RUN finished days outside the usual range, or null. Each judged
 * day is compared with the range from the periods before the whole streak; with `kindOf`, only periods of
 * the same day kind count, and a day of unknown kind ends the reading. A missing day ends it too.
 */
export function unusualStreak(series: readonly PeriodValue[], spec: UnusualSpec, kindOf?: (period: PeriodValue) => DayKind | null): UnusualReading | null {
  const finished = series.filter((period) => !period.partial);
  let best: UnusualReading | null = null;
  for (let length = UNUSUAL_RUN; length <= Math.min(UNUSUAL_MAX_RUN, finished.length); length++) {
    const judged = finished.slice(-length), before = finished.slice(0, -length).slice(-spec.baselinePeriods);
    const days: UnusualReading["days"] = [];
    let direction: UnusualReading["direction"] | null = null, samples = 0;
    for (const period of judged) {
      const kind = kindOf ? kindOf(period) : null;
      if (period.value === null || (kindOf && kind === null)) return best;
      const range = usualRange(before.flatMap((candidate) => candidate.value !== null && (!kindOf || kindOf(candidate) === kind) ? [candidate.value] : []), spec);
      if (!range) return best;
      const side = period.value > range.high ? "ABOVE" : period.value < range.low ? "BELOW" : null;
      if (!side || (direction && side !== direction)) return best;
      direction = side; samples = range.samples;
      days.push({ from: period.from, value: period.value, kind, low: range.low, high: range.high });
    }
    best = { direction: direction!, days, samples };
  }
  return best;
}
