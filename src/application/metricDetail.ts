import { weekly, type PeriodValue } from "../domain/health/measuredSeries";
import { BASELINE_MIN_SAMPLES, median } from "../domain/health/baselines";

/**
 * METRIC-PAGE-001 (pilot, Gavin 2026-11-14): the pure parts of one metric-detail page, shared by every metric.
 * Lived days are BEYOND's 16:30 periods (`recentPeriods`); a period with no record stays `null` (missing, never 0).
 * Each metric keeps its own semantics: how a week is summarised, what its source is, what "usual" means.
 */
export type DetailMetric = "water" | "steps" | "resting" | "calories" | "weight" | "protein";
export type DetailRange = "today" | "7d" | "30d" | "1y";
export const DETAIL_RANGES: readonly [DetailRange, string, string][] = [
  ["today", "TODAY", "Today, this lived day"], ["7d", "7D", "Last 7 lived days"], ["30d", "30D", "Last 30 lived days"], ["1y", "1Y", "Last year, by week"],
];
/**
 * The ranges a metric shows. Resting heart rate is one reading a day, so its first range is the latest reading.
 * METRIC-PAGE-002: weight is a few weigh-ins a week at most, so it shows the latest weigh-in, then 30D and 1Y; a week
 * of sparse weigh-ins reads as mostly gaps, so it has no 7D.
 */
export function rangesFor(metric: DetailMetric): readonly [DetailRange, string, string][] {
  if (metric === "weight") return [["today", "LATEST", "Latest weigh-in"], ...DETAIL_RANGES.slice(2)];
  return metric === "resting" ? [["today", "LATEST", "Latest reading"], ...DETAIL_RANGES.slice(1)] : DETAIL_RANGES;
}
/**
 * How a week is summarised: water as the average of its logged days, steps as the week's measured total, resting heart
 * rate as the average of its measured days (as MeasuredSheet); calories, eaten and burned alike, as the average of the
 * days that have a record (as GARMIN-005); weight and protein (METRIC-PAGE-002) as the average of their logged days.
 */
export const WEEK_MODE: Record<DetailMetric, "mean" | "sum"> = { water: "mean", steps: "sum", resting: "mean", calories: "mean", weight: "mean", protein: "mean" };
/** Decimal places a metric's averages keep: weight keeps a tenth of a pound, everything else is whole. */
export const DIGITS: Record<DetailMetric, number> = { water: 0, steps: 0, resting: 0, calories: 0, weight: 1, protein: 0 };
const roundTo = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** One value per lived period: `valueOf(dayId)` gives the record; periods without a BEYOND day have none. */
export function dailySeries(periods: readonly { dayId: string | null; from: number; to: number }[], now: number,
  valueOf: (dayId: string) => number | undefined): PeriodValue[] {
  return periods.map((p) => {
    const v = p.dayId ? valueOf(p.dayId) : undefined;
    return { ...p, value: v === undefined ? null : v, partial: now >= p.from && now < p.to };
  });
}

/** The values for a range (oldest first). 1Y groups the year by week in the metric's own way. */
export function rangeValues(series: readonly PeriodValue[], range: Exclude<DetailRange, "today">, mode: "mean" | "sum", digits = 0): PeriodValue[] {
  if (range === "7d") return series.slice(-7);
  if (range === "30d") return series.slice(-30);
  if (!digits) return weekly(series.slice(-52 * 7), mode);
  // Keep decimals (weight's tenth of a pound) through the domain's whole-number weekly mean by scaling around it.
  const k = 10 ** digits, scale = (v: PeriodValue, by: number) => ({ ...v, value: v.value === null ? null : v.value * by });
  return weekly(series.slice(-52 * 7).map((v) => scale(v, k)), mode).map((w) => scale(w, 1 / k));
}

/** Average of the recorded values (missing ones left out), and how many were recorded. */
export function summarise(values: readonly PeriodValue[], digits = 0): { average: number | null; recorded: number; total: number } {
  const present = values.flatMap((v) => (v.value === null ? [] : [v.value]));
  return { average: present.length ? roundTo(present.reduce((a, b) => a + b, 0) / present.length, digits) : null, recorded: present.length, total: values.length };
}

export interface DetailUsual { value: number | null; samples: number; need: number }
/** Your usual: the median of the last 28 finished lived days that have a record, once there are enough of them. */
export function usualOf(series: readonly PeriodValue[]): DetailUsual {
  const finished = series.filter((v) => !v.partial).slice(-28).flatMap((v) => (v.value === null ? [] : [v.value]));
  return { value: finished.length >= BASELINE_MIN_SAMPLES ? median(finished) : null, samples: finished.length, need: BASELINE_MIN_SAMPLES };
}

export interface SplitSide { median: number | null; days: number }
/** Work days against days off: medians of the last 56 finished lived days by their recorded work context. */
export const SPLIT_MIN_DAYS = 3;
export function workOffSplit(series: readonly PeriodValue[], contextOf: (dayId: string) => "WORK" | "OFF" | "UNKNOWN" | undefined): { work: SplitSide; off: SplitSide } {
  const recent = series.filter((v) => !v.partial).slice(-56);
  const side = (kind: "WORK" | "OFF"): SplitSide => {
    const values = recent.flatMap((v) => (v.value !== null && v.dayId && contextOf(v.dayId) === kind ? [v.value] : []));
    return { median: values.length >= SPLIT_MIN_DAYS ? median(values) : null, days: values.length };
  };
  return { work: side("WORK"), off: side("OFF") };
}

/**
 * DIRECTION-90-001 (Gavin, 2026-11-14: "Approved"): your last 90 finished lived days against your last year, in one
 * plain sentence on the metric page. Medians of the recorded days, so one odd day can't swing it. It stays quiet until
 * the records span 180 days and both windows have enough of them. Never a score, an arrow or a judgement: lower resting
 * heart rate and more water are both just "lower" and "higher".
 */
export const DIRECTION_RECENT_DAYS = 90, DIRECTION_YEAR_DAYS = 365, DIRECTION_SPAN_DAYS = 180;
export const DIRECTION_MIN_RECENT = 30, DIRECTION_MIN_YEAR = 90;
/**
 * Smaller differences read "about the same": a share of the year's value, or an absolute floor (1 bpm, 1 oz…). Weight
 * passes no share (0), because 5% of a body weight is several pounds: only its floor of a pound counts.
 */
export const DIRECTION_SAME_SHARE = 0.05;
export interface Direction { recent: number; year: number; way: "HIGHER" | "LOWER" | "SAME"; recentDays: number; yearDays: number }
export function direction90(series: readonly PeriodValue[], sameFloor = 1, sameShare = DIRECTION_SAME_SHARE): Direction | null {
  const finished = series.filter((v) => !v.partial);
  const year = finished.slice(-DIRECTION_YEAR_DAYS).filter((v) => v.value !== null);
  const recent = finished.slice(-DIRECTION_RECENT_DAYS).filter((v) => v.value !== null);
  const last = finished.at(-1);
  if (!last || !year.length || recent.length < DIRECTION_MIN_RECENT || year.length < DIRECTION_MIN_YEAR) return null;
  // The records must reach back 180 days, so "the last year" is more than the last 90 days again.
  if ((last.from - year[0]!.from) / 86_400_000 < DIRECTION_SPAN_DAYS - 1) return null;
  const r = median(recent.map((v) => v.value!))!, y = median(year.map((v) => v.value!))!;
  const way = Math.abs(r - y) < Math.max(sameFloor, Math.abs(y) * sameShare) ? "SAME" : r > y ? "HIGHER" : "LOWER";
  return { recent: r, year: y, way, recentDays: recent.length, yearDays: year.length };
}
