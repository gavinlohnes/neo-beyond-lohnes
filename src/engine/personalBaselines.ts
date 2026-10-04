import type { DaySummary } from "./dayLedger";
import {
  MEASURES,
  finishedLivedDays,
  groupLivedDays,
  quantile,
  series,
  type DayKind,
  type MeasureId,
} from "./livedDaySeries";

/**
 * PERSONAL BASELINES (FOUNDATION-A-F1, owner approval 2026-10-04): the first
 * use of the lived-day series, shown read-only in Weekly. For each measure
 * and kind of lived day: Gavin's usual range over the 56 lived days before
 * the last 7, and where the last 7 sit against it. Pure, derived on read,
 * never stored, never fed to the Engine — a comparison, not a target, a
 * score or a rule.
 *
 * NO_FAKE_PRECISION: with too few comparable days it says it's still
 * learning and shows no range. The judged week is never part of its own
 * baseline. The verdict uses the same rounded numbers the screen shows.
 */

/** The judged period: the last PERIOD_DAYS finished lived days. */
export const PERIOD_DAYS = 7;
/** The baseline: the BASELINE_DAYS lived days before the period (no overlap). */
export const BASELINE_DAYS = 56;
/** A usual range needs at least this many qualifying days of the kind in the baseline. */
export const MIN_BASELINE_DAYS = 10;
/** A comparison needs at least this many qualifying days of the kind in the period. */
export const MIN_PERIOD_DAYS = 2;
/** The usual range is the middle half of the baseline days. */
export const BAND_LOW_QUANTILE = 0.25;
export const BAND_HIGH_QUANTILE = 0.75;

/** Per measure: the narrowest usual range shown (centered on the median), and the step values round to. */
export const BASELINE_SPECS: Record<MeasureId, { minWidth: number; roundTo: number }> = {
  MAIN_SLEEP: { minWidth: 30, roundTo: 5 }, // minutes
  WATER: { minWidth: 8, roundTo: 1 }, // oz
  PROTEIN: { minWidth: 10, roundTo: 1 }, // g
};

/** Display order: sleep, water, protein; work days before days off. */
export const BASELINE_ORDER: readonly [MeasureId, DayKind][] = [
  ["MAIN_SLEEP", "WORK"],
  ["MAIN_SLEEP", "OFF"],
  ["WATER", "WORK"],
  ["WATER", "OFF"],
  ["PROTEIN", "WORK"],
  ["PROTEIN", "OFF"],
];

export type BaselineVerdict = "BELOW" | "INSIDE" | "ABOVE";

export type PersonalBaseline =
  | {
      kind: "COMPARED";
      measure: MeasureId;
      dayKind: DayKind;
      low: number;
      high: number;
      /** Median of the period's qualifying days, rounded like the range. */
      period: number;
      verdict: BaselineVerdict;
      periodDays: number;
      baselineDays: number;
    }
  | {
      /** A usual range exists, but the period has too few days of this kind to compare. */
      kind: "NOT_THIS_WEEK";
      measure: MeasureId;
      dayKind: DayKind;
      low: number;
      high: number;
      periodDays: number;
      baselineDays: number;
    }
  | {
      /** Too few comparable days for a usual range yet. */
      kind: "LEARNING";
      measure: MeasureId;
      dayKind: DayKind;
      have: number;
      need: number;
    };

function sortedValues(points: readonly { value: number }[]): number[] {
  return points.map((p) => p.value).sort((a, b) => a - b);
}

function roundNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function projectPersonalBaselines(summaries: readonly DaySummary[], now: Date): PersonalBaseline[] {
  const days = groupLivedDays(summaries);
  const periodWindow = finishedLivedDays(now, 0, PERIOD_DAYS);
  const baselineWindow = finishedLivedDays(now, PERIOD_DAYS, BASELINE_DAYS);

  return BASELINE_ORDER.map(([measureId, dayKind]): PersonalBaseline => {
    const measure = MEASURES[measureId];
    const { minWidth, roundTo } = BASELINE_SPECS[measureId];
    const baseline = sortedValues(series(days, measure, baselineWindow, dayKind));
    if (baseline.length < MIN_BASELINE_DAYS) {
      return { kind: "LEARNING", measure: measureId, dayKind, have: baseline.length, need: MIN_BASELINE_DAYS };
    }

    let low = quantile(baseline, BAND_LOW_QUANTILE);
    let high = quantile(baseline, BAND_HIGH_QUANTILE);
    if (high - low < minWidth) {
      const mid = quantile(baseline, 0.5);
      low = mid - minWidth / 2;
      high = mid + minWidth / 2;
    }
    // Rounded outward, whole steps first so floating-point dust never moves a bound.
    const lowShown = Math.max(0, Math.floor(Math.round(low * 1000) / 1000 / roundTo) * roundTo);
    const highShown = Math.ceil(Math.round(high * 1000) / 1000 / roundTo) * roundTo;

    const period = sortedValues(series(days, measure, periodWindow, dayKind));
    if (period.length < MIN_PERIOD_DAYS) {
      return {
        kind: "NOT_THIS_WEEK",
        measure: measureId,
        dayKind,
        low: lowShown,
        high: highShown,
        periodDays: period.length,
        baselineDays: baseline.length,
      };
    }
    const periodShown = roundNearest(quantile(period, 0.5), roundTo);
    const verdict: BaselineVerdict = periodShown < lowShown ? "BELOW" : periodShown > highShown ? "ABOVE" : "INSIDE";
    return {
      kind: "COMPARED",
      measure: measureId,
      dayKind,
      low: lowShown,
      high: highShown,
      period: periodShown,
      verdict,
      periodDays: period.length,
      baselineDays: baseline.length,
    };
  });
}
