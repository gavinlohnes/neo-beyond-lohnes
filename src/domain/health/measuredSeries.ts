import { periodLocator, type ActivityHour, type Period, type RestingHeartRate } from "./activityImport";
import { sleepDurations, type ExternalSleep } from "./sleepImport";

/**
 * GARMIN-004 (owner approval 2026-10-22): the measured series behind TODAY's Garmin tiles and their
 * detail sheets. Pure and display-only: nothing here feeds the Engine, a target or a recommendation.
 * Periods are the same lived days (16:30 edges, at most 24 hours) BODY and the baselines use. A
 * period with no measurement is missing (null), never zero.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PeriodValue extends Period {
  value: number | null;
  /** The period is still running (it contains `now`), so its value is "so far". */
  partial: boolean;
}

/** The last `count` periods ending with the one containing `now`, oldest first. */
export function recentPeriods(days: readonly { id: string; startedAt: string }[], now: number, count: number): Period[] {
  const periodOf = periodLocator(days);
  const periods: Period[] = [];
  let t = now;
  for (let i = 0; i < count; i++) {
    const p = periodOf(t);
    periods.unshift(p);
    t = p.from - 1;
  }
  return periods;
}

function bucket<T>(periods: readonly Period[], items: readonly T[], at: (item: T) => number): T[][] {
  const buckets = periods.map(() => [] as T[]);
  for (const item of items) {
    const t = at(item);
    // Periods are contiguous and ordered, so a binary search finds the owner.
    let lo = 0, hi = periods.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, p = periods[mid]!;
      if (t < p.from) hi = mid - 1;
      else if (t >= p.to) lo = mid + 1;
      else { buckets[mid]!.push(item); break; }
    }
  }
  return buckets;
}

const withValue = (periods: readonly Period[], now: number, value: (i: number) => number | null): PeriodValue[] =>
  periods.map((p, i) => ({ ...p, value: value(i), partial: now >= p.from && now < p.to }));

/** Measured steps per period. Hours without a step count stay out; a period with none is null. */
export function stepsByPeriod(periods: readonly Period[], hours: readonly ActivityHour[], now: number): PeriodValue[] {
  const buckets = bucket(periods, hours.filter((h) => h.steps !== null), (h) => Date.parse(h.startTime));
  return withValue(periods, now, (i) => buckets[i]!.length ? buckets[i]!.reduce((sum, h) => sum + h.steps!, 0) : null);
}

/** Lowest Garmin resting heart rate per period (the baseline's own measure). */
export function restingByPeriod(periods: readonly Period[], resting: readonly RestingHeartRate[], now: number): PeriodValue[] {
  const buckets = bucket(periods, resting, (r) => Date.parse(r.time));
  return withValue(periods, now, (i) => buckets[i]!.length ? Math.min(...buckets[i]!.map((r) => r.bpm)) : null);
}

/** Minutes asleep when the stages are complete, otherwise the session span (the baseline's rule). */
export function sleepMinutes(sleep: ExternalSleep): number {
  const { spanMinutes, asleepMinutes } = sleepDurations(sleep);
  return Math.round(asleepMinutes ?? spanMinutes);
}

/** The longest Garmin sleep starting in each period, minutes. */
export function sleepByPeriod(periods: readonly Period[], sleeps: readonly ExternalSleep[], now: number): PeriodValue[] {
  const buckets = bucket(periods, sleeps, (s) => Date.parse(s.startTime));
  return withValue(periods, now, (i) => buckets[i]!.length ? Math.max(...buckets[i]!.map(sleepMinutes)) : null);
}

/** Seven-period sums (steps) or means (heart rate, sleep), oldest first; the last group may be short. */
export function weekly(values: readonly PeriodValue[], mode: "sum" | "mean"): PeriodValue[] {
  const groups: PeriodValue[][] = [];
  for (let end = values.length; end > 0; end -= 7) groups.unshift(values.slice(Math.max(0, end - 7), end));
  return groups.map((group) => {
    const present = group.flatMap((v) => (v.value === null ? [] : [v.value]));
    const value = !present.length ? null : mode === "sum" ? present.reduce((a, b) => a + b, 0) : Math.round(present.reduce((a, b) => a + b, 0) / present.length);
    return { dayId: null, from: group[0]!.from, to: group.at(-1)!.to, value, partial: group.some((v) => v.partial) };
  });
}

/** Mean of the measured values, or null when none were measured. */
export function average(values: readonly PeriodValue[]): number | null {
  const present = values.flatMap((v) => (v.value === null ? [] : [v.value]));
  return present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : null;
}

/** Running step total through one period, one point per measured hour (at the hour's end). */
export function cumulativeSteps(period: Period, hours: readonly ActivityHour[], now: number): { t: number; total: number }[] {
  const inside = hours.filter((h) => { const t = Date.parse(h.startTime); return h.steps !== null && t >= period.from && t < Math.min(period.to, now); })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  let total = 0;
  return [{ t: period.from, total: 0 }, ...inside.map((h) => ({ t: Math.min(Date.parse(h.endTime), now), total: (total += h.steps!) }))];
}

export type StageName = "AWAKE" | "REM" | "LIGHT" | "DEEP";
export const STAGE_ORDER: readonly StageName[] = ["AWAKE", "REM", "LIGHT", "DEEP"];
const STAGE_OF: Partial<Record<ExternalSleep["stages"][number]["type"], StageName>> = {
  AWAKE: "AWAKE", AWAKE_IN_BED: "AWAKE", OUT_OF_BED: "AWAKE", REM: "REM", LIGHT: "LIGHT", DEEP: "DEEP",
};

/**
 * Minutes per stage. A stage Garmin never reported is null ("not recorded"), not zero. Generic
 * SLEEPING and UNKNOWN stages have no depth, so they are left out of every stage.
 */
export function stageMinutes(sleep: ExternalSleep): Record<StageName, number | null> {
  const minutes: Record<StageName, number | null> = { AWAKE: null, REM: null, LIGHT: null, DEEP: null };
  for (const stage of sleep.stages) {
    const name = STAGE_OF[stage.type];
    if (!name) continue;
    minutes[name] = (minutes[name] ?? 0) + (Date.parse(stage.endTime) - Date.parse(stage.startTime)) / 60000;
  }
  for (const name of STAGE_ORDER) if (minutes[name] !== null) minutes[name] = Math.round(minutes[name]!);
  return minutes;
}

/** Stage intervals for a hypnogram, in time order; depth-less stages are omitted. */
export function hypnogram(sleep: ExternalSleep): { from: number; to: number; stage: StageName }[] {
  return sleep.stages.flatMap((s) => {
    const stage = STAGE_OF[s.type];
    return stage ? [{ from: Date.parse(s.startTime), to: Date.parse(s.endTime), stage }] : [];
  }).sort((a, b) => a.from - b.from);
}

/** The latest Garmin sleep that ended within the last 24 hours of `now`, if any. */
export function lastNight(sleeps: readonly ExternalSleep[], now: number): ExternalSleep | null {
  const recent = sleeps.filter((s) => { const end = Date.parse(s.endTime); return end <= now && end > now - DAY_MS; });
  if (!recent.length) return null;
  // The main sleep: the longest of the recent sessions, so a nap never replaces the night.
  return recent.reduce((best, s) => (sleepMinutes(s) > sleepMinutes(best) ? s : best));
}

/**
 * GARMIN-005: calories burned per period from hourly Garmin energy — "total" (resting + active, what
 * the watch calls calories burned) or "active". A period without any calorie hour is null.
 */
export function burnedByPeriod(periods: readonly Period[], hours: readonly ActivityHour[], now: number, kind: "total" | "active" = "total"): PeriodValue[] {
  const field = kind === "total" ? "totalCaloriesKcal" : "activeCaloriesKcal";
  const buckets = bucket(periods, hours.filter((h) => h[field] != null), (h) => Date.parse(h.startTime));
  return withValue(periods, now, (i) => buckets[i]!.length ? buckets[i]!.reduce((sum, h) => sum + h[field]!, 0) : null);
}

/** Running Garmin total burned through one period, one point per measured hour. */
export function cumulativeBurned(period: Period, hours: readonly ActivityHour[], now: number): { t: number; total: number }[] {
  const inside = hours.filter((h) => { const t = Date.parse(h.startTime); return h.totalCaloriesKcal != null && t >= period.from && t < Math.min(period.to, now); })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  let total = 0;
  return [{ t: period.from, total: 0 }, ...inside.map((h) => ({ t: Math.min(Date.parse(h.endTime), now), total: (total += h.totalCaloriesKcal!) }))];
}

/**
 * Logged meal calories per period, from each BEYOND day's own ledger. A period with no BEYOND day, or
 * a day with no meal logged, is null ("not logged"), never zero eaten.
 */
export function eatenByPeriod(periods: readonly Period[], kcalByDay: ReadonlyMap<string, number>, now: number): PeriodValue[] {
  return withValue(periods, now, (i) => { const id = periods[i]!.dayId; return id && kcalByDay.has(id) ? kcalByDay.get(id)! : null; });
}

/** Running logged-meal total through one period, stepping at each meal's logged time. */
export function cumulativeEaten(period: Period, meals: readonly { recordedAt: string; calories: number }[], now: number): { t: number; total: number }[] {
  let total = 0;
  const inside = meals.filter((m) => { const t = Date.parse(m.recordedAt); return t >= period.from && t <= now; })
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  return [{ t: period.from, total: 0 }, ...inside.map((m) => ({ t: Date.parse(m.recordedAt), total: (total += m.calories) }))];
}
