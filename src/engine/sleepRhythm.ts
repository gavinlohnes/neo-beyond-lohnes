import type { ExternalSleep } from "../domain/health/sleepImport";
import { sleepMinutes } from "../domain/health/measuredSeries";
import type { DaySummary } from "./dayLedger";
import { mostRecentBoundaryAtOrBefore } from "./dayRollover";
import { groupLivedDays, type DayKind } from "./livedDaySeries";

/**
 * SLEEP-RHYTHM-001: when you sleep, not just how long — work days next to days off, from Garmin's measured
 * sleep times over the last four weeks. Clock times wrap at midnight, so averages and spreads use circular
 * statistics (the standard way to average times of day). Pure and read only: it describes, it never
 * judges, scores or feeds the Engine's advice. Missing stays missing: logged sleep without times and
 * nights Garmin didn't measure are simply absent.
 */
export const RHYTHM_WINDOW_DAYS = 28;
/** Shorter sessions are naps; a lived day's main sleep is its longest session of at least this. */
export const MAIN_SLEEP_MIN_MINUTES = 180;
/** Fewer nights than this in a group and its typical times aren't stated. */
export const RHYTHM_MIN_NIGHTS = 3;

const DAY = 1440;

export interface RhythmNight {
  livedDayStart: string;
  kind: DayKind | "UNKNOWN";
  /** Local clock minutes after midnight, 0–1439. */
  start: number;
  end: number;
  asleepMinutes: number;
}

export interface RhythmGroup {
  kind: DayKind;
  nights: number;
  /** Typical (circular mean) local clock times, minutes after midnight. */
  start: number;
  end: number;
  midpoint: number;
  /** Half the nights' midpoints sit within this many minutes of the typical midpoint. */
  spread: number;
}

export interface SleepRhythm {
  /** Main sleeps in the window, newest first. */
  nights: RhythmNight[];
  groups: RhythmGroup[];
  /**
   * Days off minus work days, by typical sleep midpoint: positive means later on days off. Null unless
   * both groups have enough nights.
   */
  offMinusWork: number | null;
  /** Where a 24-hour chart axis starts so the typical night sits mid-chart instead of wrapping. */
  axisStart: number;
}

/** Local clock minutes of an instant, using the record's own zone offset when Garmin sent one. */
export function clockMinutes(iso: string, offsetSeconds: number | null): number {
  const ms = Date.parse(iso);
  const minutes = offsetSeconds === null
    ? new Date(ms).getHours() * 60 + new Date(ms).getMinutes()
    : Math.floor(ms / 60_000 + offsetSeconds / 60);
  return ((minutes % DAY) + DAY) % DAY;
}

/** Signed shortest difference b − a on the 24-hour clock, −720…720. */
export function clockDifference(a: number, b: number): number {
  const d = (((b - a) % DAY) + DAY) % DAY;
  return d > DAY / 2 ? d - DAY : d;
}

/** Circular mean of clock minutes; null when the times cancel out (no meaningful average). */
export function circularMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sin = 0, cos = 0;
  for (const v of values) { const a = (v / DAY) * 2 * Math.PI; sin += Math.sin(a); cos += Math.cos(a); }
  if (Math.hypot(sin, cos) / values.length < 1e-6) return null;
  const mean = Math.round((Math.atan2(sin, cos) / (2 * Math.PI)) * DAY);
  return ((mean % DAY) + DAY) % DAY;
}

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
};

function midpointOf(night: RhythmNight): number {
  const span = (((night.end - night.start) % DAY) + DAY) % DAY;
  return (night.start + Math.round(span / 2)) % DAY;
}

function group(kind: DayKind, nights: readonly RhythmNight[]): RhythmGroup | null {
  const own = nights.filter((n) => n.kind === kind);
  if (own.length < RHYTHM_MIN_NIGHTS) return null;
  const start = circularMean(own.map((n) => n.start)), end = circularMean(own.map((n) => n.end));
  const midpoints = own.map(midpointOf), midpoint = circularMean(midpoints);
  if (start === null || end === null || midpoint === null) return null;
  return { kind, nights: own.length, start, end, midpoint, spread: median(midpoints.map((m) => Math.abs(clockDifference(midpoint, m)))) };
}

export function deriveSleepRhythm(sleeps: readonly ExternalSleep[], summaries: readonly DaySummary[], now: Date, windowDays = RHYTHM_WINDOW_DAYS): SleepRhythm {
  const since = now.getTime() - windowDays * DAY * 60_000;
  const kinds = groupLivedDays(summaries);
  const longest = new Map<string, { sleep: ExternalSleep; minutes: number }>();
  for (const sleep of sleeps) {
    const begin = Date.parse(sleep.startTime);
    if (!(begin >= since && begin <= now.getTime())) continue;
    const minutes = sleepMinutes(sleep);
    if (minutes < MAIN_SLEEP_MIN_MINUTES) continue;
    const livedDayStart = mostRecentBoundaryAtOrBefore(new Date(begin)).toISOString();
    if ((longest.get(livedDayStart)?.minutes ?? -1) < minutes) longest.set(livedDayStart, { sleep, minutes });
  }
  const nights: RhythmNight[] = [...longest.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([livedDayStart, { sleep, minutes }]) => ({
      livedDayStart,
      kind: kinds.get(livedDayStart)?.kind ?? "UNKNOWN",
      start: clockMinutes(sleep.startTime, sleep.startZoneOffsetSeconds),
      end: clockMinutes(sleep.endTime, sleep.endZoneOffsetSeconds ?? sleep.startZoneOffsetSeconds),
      asleepMinutes: minutes,
    }));
  const groups = (["WORK", "OFF"] as const).flatMap((k) => { const g = group(k, nights); return g ? [g] : []; });
  const work = groups.find((g) => g.kind === "WORK"), off = groups.find((g) => g.kind === "OFF");
  const overall = circularMean(nights.map(midpointOf));
  return {
    nights,
    groups,
    offMinusWork: work && off ? clockDifference(work.midpoint, off.midpoint) : null,
    // Rounded to the hour so the chart's clock labels read cleanly.
    axisStart: overall === null ? 12 * 60 : (Math.round(((overall + DAY / 2) % DAY) / 60) * 60) % DAY,
  };
}
