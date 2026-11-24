import type { WeighIn } from "./bodyTrendQueries";
import {
  readWeightTrendPreference as readPreference,
  writeWeightTrendPreference as writePreference,
  type WeightTrendPreference,
  type WeightTrendSmoothing,
} from "../persistence/weightTrendPreference";

/**
 * GRAYSON-WEIGHT-TREND-001 (Gavin, 2026-11-24, backlog B8): a smoothed trend weight beside the scale weight, so a
 * salty dinner or a night shift barely moves it. Pure: it reads the weigh-ins BODY already has (corrected, removals
 * left out) and never touches the database. Nothing else reads it: best-since, milestones, the goal projection,
 * expenditure, Weekly and the Engine keep their own inputs.
 *
 * The rule is the exponential moving average from The Hacker's Diet (John Walker), the source
 * engine/expenditure.ts already credits. It works on elapsed time, not calendar days, so after a gap of g days the
 * new weigh-in counts 1 − (1 − alpha)^g. When he weighs more than once in a local day, the last one counts.
 */

export const TREND_ALPHA: Record<WeightTrendSmoothing, number> = { STEADY: 0.1, QUICKER: 0.2 };
export const TREND_MIN_WEIGH_INS = 5;
export const TREND_MIN_SPAN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrendPoint { recordedAt: string; trendLbs: number }
export type LatestTrend = { trendLbs: number; scaleLbs: number; scaleAt: string } | { waiting: true };

function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole local calendar days from `a` to `b` (YYYY-MM-DD), immune to daylight-saving hours. */
function calendarDaysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number) as [number, number, number];
  const [by, bm, bd] = b.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** One weigh-in per local day (the last), oldest first. Unusable rows are skipped. */
function dailyWeighIns(history: readonly WeighIn[]): WeighIn[] {
  const byDay = new Map<string, WeighIn>();
  const usable = history
    .filter((w) => Number.isFinite(Date.parse(w.recordedAt)) && Number.isFinite(w.weightLbs) && w.weightLbs > 0)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  for (const w of usable) byDay.set(localDate(w.recordedAt), w);
  return [...byDay.values()];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Whether there's enough to show a trend: 5 weigh-ins (one per local day) spread over at least 7 days. */
export function trendReady(history: readonly WeighIn[]): boolean {
  const daily = dailyWeighIns(history);
  if (daily.length < TREND_MIN_WEIGH_INS) return false;
  return calendarDaysBetween(localDate(daily[0]!.recordedAt), localDate(daily.at(-1)!.recordedAt)) >= TREND_MIN_SPAN_DAYS;
}

/** The trend at each daily weigh-in, to one decimal; empty until trendReady. Starts from his first weigh-in. */
export function smoothWeights(history: readonly WeighIn[], { alpha }: { alpha: number }): TrendPoint[] {
  if (!(alpha > 0 && alpha <= 1) || !trendReady(history)) return [];
  const daily = dailyWeighIns(history);
  let trend = daily[0]!.weightLbs;
  let previousMs = Date.parse(daily[0]!.recordedAt);
  return daily.map((w, index) => {
    if (index > 0) {
      const ms = Date.parse(w.recordedAt);
      const gapDays = Math.max(0, (ms - previousMs) / DAY_MS);
      const weight = 1 - Math.pow(1 - alpha, gapDays);
      trend += weight * (w.weightLbs - trend);
      previousMs = ms;
    }
    return { recordedAt: w.recordedAt, trendLbs: round1(trend) };
  });
}

/** Today's trend beside the latest scale weight, or waiting while there isn't enough yet. */
export function latestTrend(history: readonly WeighIn[], alpha: number): LatestTrend {
  const points = smoothWeights(history, { alpha });
  const scale = dailyWeighIns(history).at(-1);
  const trend = points.at(-1);
  if (!trend || !scale) return { waiting: true };
  return { trendLbs: trend.trendLbs, scaleLbs: scale.weightLbs, scaleAt: scale.recordedAt };
}

// The display preference, read and written through the application layer (the UI never imports persistence).
export type { WeightTrendPreference, WeightTrendSmoothing };
export function readWeightTrendPreference(): WeightTrendPreference { return readPreference(); }
export function writeWeightTrendPreference(preference: WeightTrendPreference): void { writePreference(preference); }
