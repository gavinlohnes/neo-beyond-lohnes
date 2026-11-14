import type { PeriodValue } from "../domain/health/measuredSeries";
import { BASELINE_MIN_SAMPLES, median } from "../domain/health/baselines";

/**
 * METRIC-PAGE-001 (pilot, Gavin 2026-11-14): the pure parts of one metric-detail page, shared by every metric.
 * Lived days are BEYOND's 16:30 periods (`recentPeriods`); a period with no record stays `null` (missing, never 0).
 * Each metric keeps its own semantics: how a week is summarised, what its source is, what "usual" means.
 */
export type DetailMetric = "water" | "steps";
export type DetailRange = "today" | "7d" | "30d" | "1y";
export const DETAIL_RANGES: readonly [DetailRange, string, string][] = [
  ["today", "TODAY", "Today, this lived day"], ["7d", "7D", "Last 7 lived days"], ["30d", "30D", "Last 30 lived days"], ["1y", "1Y", "Last year, by week"],
];
/** How a week is summarised: water as the average of its logged days, steps as the week's measured total (as MeasuredSheet). */
export const WEEK_MODE: Record<DetailMetric, "mean" | "sum"> = { water: "mean", steps: "sum" };

/** One value per lived period: `valueOf(dayId)` gives the record; periods without a BEYOND day have none. */
export function dailySeries(periods: readonly { dayId: string | null; from: number; to: number }[], now: number,
  valueOf: (dayId: string) => number | undefined): PeriodValue[] {
  return periods.map((p) => {
    const v = p.dayId ? valueOf(p.dayId) : undefined;
    return { ...p, value: v === undefined ? null : v, partial: now >= p.from && now < p.to };
  });
}

/** The values for a range (oldest first). 1Y groups the year by week in the metric's own way. */
export function rangeValues(series: readonly PeriodValue[], range: Exclude<DetailRange, "today">, mode: "mean" | "sum"): PeriodValue[] {
  if (range === "7d") return series.slice(-7);
  if (range === "30d") return series.slice(-30);
  const year = series.slice(-52 * 7);
  const groups: PeriodValue[][] = [];
  for (let end = year.length; end > 0; end -= 7) groups.unshift(year.slice(Math.max(0, end - 7), end));
  return groups.map((group) => {
    const present = group.flatMap((v) => (v.value === null ? [] : [v.value]));
    const value = !present.length ? null : mode === "sum" ? present.reduce((a, b) => a + b, 0) : Math.round(present.reduce((a, b) => a + b, 0) / present.length);
    return { dayId: null, from: group[0]!.from, to: group.at(-1)!.to, value, partial: group.some((v) => v.partial) };
  });
}

/** Average of the recorded values (missing ones left out), and how many were recorded. */
export function summarise(values: readonly PeriodValue[]): { average: number | null; recorded: number; total: number } {
  const present = values.flatMap((v) => (v.value === null ? [] : [v.value]));
  return { average: present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null, recorded: present.length, total: values.length };
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
