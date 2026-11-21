import { weekly, type PeriodValue } from "../domain/health/measuredSeries";
import { BASELINE_MIN_SAMPLES, median } from "../domain/health/baselines";

/**
 * METRIC-PAGE-001 (pilot, Gavin 2026-11-14): the pure parts of one metric-detail page, shared by every metric.
 * Lived days are BEYOND's 16:30 periods (`recentPeriods`); a period with no record stays `null` (missing, never 0).
 * Each metric keeps its own semantics: how a week is summarised, what its source is, what "usual" means.
 */
export type DetailMetric = "water" | "steps" | "resting" | "calories" | "weight" | "protein" | "workouts";
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
 * days that have a record (as GARMIN-005); weight and protein (METRIC-PAGE-002) as the average of their logged days;
 * finished workouts (METRIC-PAGE-002 slice 3) as the week's total.
 */
export const WEEK_MODE: Record<DetailMetric, "mean" | "sum"> = { water: "mean", steps: "sum", resting: "mean", calories: "mean", weight: "mean", protein: "mean", workouts: "sum" };
/** Decimal places a metric's averages keep: weight keeps a tenth of a pound, everything else is whole. */
export const DIGITS: Record<DetailMetric, number> = { water: 0, steps: 0, resting: 0, calories: 0, weight: 1, protein: 0, workouts: 0 };
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

/**
 * METRIC-CHANGE-001 (Gavin, 2026-11-19, "3C"): this lived week against last week, in one plain sentence. Weeks run
 * Monday to Sunday by lived day (Habits' convention). This week counts only its finished lived days, so the day in
 * progress never drags it down; each side is the average of its recorded days (a day per day, for steps too, so a part
 * week compares fairly). Quiet until both weeks have at least WEEK_MIN_DAYS recorded days. Never a score or advice:
 * "up" and "down" are just directions, judged with the same "about the same" floors as the 90-day line.
 */
export const WEEK_MIN_DAYS = 2;
export interface WeekCompare { thisWeek: number; lastWeek: number; thisDays: number; lastDays: number; way: "HIGHER" | "LOWER" | "SAME" }
const mondayOf = (t: number) => { const d = new Date(t); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); };
export function weekCompare(series: readonly PeriodValue[], sameFloor = 1, sameShare = DIRECTION_SAME_SHARE, digits = 0): WeekCompare | null {
  const last = series.at(-1);
  if (!last) return null;
  const thisMonday = mondayOf(last.from);
  const p = new Date(thisMonday); p.setHours(12); p.setDate(p.getDate() - 7);
  const prior = p.toDateString(); // by calendar date, so a daylight-saving change never shifts the week
  const recorded = (monday: string) => series.filter((v) => !v.partial && v.value !== null && mondayOf(v.from) === monday).map((v) => v.value!);
  const now = recorded(thisMonday), before = recorded(prior);
  if (now.length < WEEK_MIN_DAYS || before.length < WEEK_MIN_DAYS) return null;
  const mean = (xs: number[]) => roundTo(xs.reduce((a, b) => a + b, 0) / xs.length, digits);
  const t = mean(now), l = mean(before);
  const way = Math.abs(t - l) < Math.max(sameFloor, Math.abs(l) * sameShare) ? "SAME" : t > l ? "HIGHER" : "LOWER";
  return { thisWeek: t, lastWeek: l, thisDays: now.length, lastDays: before.length, way };
}

/**
 * METRIC-PAGE-002 slice 3: finished workouts are a count, mostly 0 or 1 a day, so a day's median says nothing. Their
 * usual is a week's: the median total of the last 8 finished weeks (1Y's own 7-day groups), once there are 4 of them.
 */
export const WORKOUT_USUAL_WEEKS = 8, WORKOUT_USUAL_MIN_WEEKS = 4;
export function weeklyUsual(series: readonly PeriodValue[]): DetailUsual {
  const weeks = weekly(series.slice(-52 * 7), "sum").filter((w) => !w.partial).slice(-WORKOUT_USUAL_WEEKS).flatMap((w) => (w.value === null ? [] : [w.value]));
  return { value: weeks.length >= WORKOUT_USUAL_MIN_WEEKS ? median(weeks) : null, samples: weeks.length, need: WORKOUT_USUAL_MIN_WEEKS };
}

/**
 * Finished workouts, work days against days off: of the last 56 finished lived days BEYOND has a record of, how many
 * of each kind had at least one finished workout. A count of days, never a score.
 */
export interface TrainedSide { days: number; trained: number }
export function trainedSplit(series: readonly PeriodValue[], contextOf: (dayId: string) => "WORK" | "OFF" | "UNKNOWN" | undefined): { work: TrainedSide; off: TrainedSide } {
  const recent = series.filter((v) => !v.partial).slice(-56);
  const side = (kind: "WORK" | "OFF"): TrainedSide => {
    const values = recent.flatMap((v) => (v.value !== null && v.dayId && contextOf(v.dayId) === kind ? [v.value] : []));
    return { days: values.length, trained: values.filter((n) => n > 0).length };
  };
  return { work: side("WORK"), off: side("OFF") };
}

/**
 * This lived week so far and last week, as plain totals (Monday to Sunday by lived day, METRIC-CHANGE-001's weeks).
 * A count, so the day in progress is included ("so far"). Quiet until last week has a lived day BEYOND recorded.
 */
export function weekTotals(series: readonly PeriodValue[]): { thisWeek: number; lastWeek: number } | null {
  const last = series.at(-1);
  if (!last) return null;
  const thisMonday = mondayOf(last.from);
  const p = new Date(thisMonday); p.setHours(12); p.setDate(p.getDate() - 7);
  const prior = p.toDateString();
  const of = (monday: string) => series.filter((v) => v.value !== null && mondayOf(v.from) === monday).map((v) => v.value!);
  const now = of(thisMonday), before = of(prior);
  if (!now.length || !before.length) return null;
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return { thisWeek: total(now), lastWeek: total(before) };
}
