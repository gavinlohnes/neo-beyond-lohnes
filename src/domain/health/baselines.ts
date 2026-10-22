import { periodLocator, type ActivityHour, type RestingHeartRate } from "./activityImport";
import { sleepDurations, type ExternalSleep } from "./sleepImport";

/**
 * GARMIN-003 (owner ruling 2026-10-22): advice compares against the owner's own baselines, not fixed
 * thresholds. Rolling medians over the last 28 days of measured Garmin data, by lived period (the same
 * 16:30-edged periods BODY shows). A baseline needs at least 14 measured periods; until then it is
 * null, never a guess. Nothing consumes these yet; advice wording waits for REDESIGN-001.
 */
export const BASELINE_WINDOW_DAYS = 28;
export const BASELINE_MIN_SAMPLES = 14;

export interface Baseline { value: number | null; samples: number }
export interface PersonalBaselines {
  /** Longest Garmin sleep per period, minutes (asleep when stages are complete, otherwise in bed). */
  mainSleepMinutes: Baseline;
  /** Lowest Garmin resting heart rate per period, bpm. */
  restingHeartRateBpm: Baseline;
  /** Steps per full lived day, split by the day's work context. Stretches without a BEYOND day are left out. */
  workDaySteps: Baseline;
  offDaySteps: Baseline;
}

export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}
function baseline(values: readonly number[]): Baseline {
  return { value: values.length >= BASELINE_MIN_SAMPLES ? median(values) : null, samples: values.length };
}

export function personalBaselines(input: {
  days: readonly { id: string; startedAt: string; workContext: "WORK" | "OFF" | "UNKNOWN" }[];
  sleeps: readonly ExternalSleep[]; hours: readonly ActivityHour[]; resting: readonly RestingHeartRate[]; now: number;
}): PersonalBaselines {
  const { days, sleeps, hours, resting, now } = input;
  const since = now - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const periodOf = periodLocator(days);
  const recent = (t: number) => t >= since && t < now;

  const longestSleep = new Map<number, number>();
  for (const s of sleeps) {
    const t = Date.parse(s.startTime);
    if (!recent(t)) continue;
    const { spanMinutes, asleepMinutes } = sleepDurations(s);
    const minutes = Math.round(asleepMinutes ?? spanMinutes), key = periodOf(t).from;
    longestSleep.set(key, Math.max(longestSleep.get(key) ?? 0, minutes));
  }
  const lowestResting = new Map<number, number>();
  for (const r of resting) {
    const t = Date.parse(r.time);
    if (!recent(t)) continue;
    const key = periodOf(t).from;
    lowestResting.set(key, Math.min(lowestResting.get(key) ?? Infinity, r.bpm));
  }
  // Only full, finished lived days count for steps, so a day in progress never lowers the baseline.
  const context = new Map(days.map((d) => [d.id, d.workContext]));
  const steps = new Map<string, { total: number; to: number }>();
  for (const h of hours) {
    const t = Date.parse(h.startTime);
    if (!recent(t) || h.steps === null) continue;
    const p = periodOf(t);
    if (!p.dayId) continue;
    const row = steps.get(p.dayId) ?? { total: 0, to: p.to };
    row.total += h.steps; steps.set(p.dayId, row);
  }
  const finished = [...steps.entries()].filter(([, s]) => s.to <= now);
  return {
    mainSleepMinutes: baseline([...longestSleep.values()]),
    restingHeartRateBpm: baseline([...lowestResting.values()]),
    workDaySteps: baseline(finished.filter(([id]) => context.get(id) === "WORK").map(([, s]) => s.total)),
    offDaySteps: baseline(finished.filter(([id]) => context.get(id) === "OFF").map(([, s]) => s.total)),
  };
}
