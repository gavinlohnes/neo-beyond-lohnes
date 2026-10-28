import { db } from "../persistence/db";
import type { Period } from "../domain/health/activityImport";
import { BASELINE_MIN_SAMPLES, median, personalBaselines, type Baseline } from "../domain/health/baselines";
import {
  burnedByPeriod, cumulativeBurned, cumulativeEaten, cumulativeSteps, eatenByPeriod, lastNight, recentPeriods, restingByPeriod, sleepByPeriod, stepsByPeriod,
  type PeriodValue,
} from "../domain/health/measuredSeries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getMealEntries } from "./nutritionQueries";
import type { ExternalSleep, ExternalSleepRevision } from "../domain/health/sleepImport";
import { unusualStreak, UNUSUAL_SPECS, type UnusualReading } from "../domain/health/unusual";

/** Enough lived days for a year of weekly bars (53 weeks). */
export const MEASURED_PERIODS = 53 * 7;

export interface MeasuredSnapshot {
  /** Any Garmin measurement at all; without one, TODAY shows no Garmin tiles. */
  any: boolean;
  readAt: number;
  current: Period;
  steps: PeriodValue[];
  resting: PeriodValue[];
  sleep: PeriodValue[];
  /** Running step total through the current lived day. */
  stepsToday: { t: number; total: number }[];
  lastNight: ExternalSleep | null;
  /** GARMIN-005: Garmin calories burned (total and active) and logged meal calories, per lived day. */
  burned: PeriodValue[];
  activeBurned: PeriodValue[];
  eaten: PeriodValue[];
  burnedToday: { t: number; total: number }[];
  eatenToday: { t: number; total: number }[];
  /** Any calorie hour at all; without one, TODAY shows no CALORIES tile. */
  anyCalories: boolean;
  /** Export that actually supplied the newest total-calorie measurement, or null. */
  caloriesAsOf: number | null;
  /** When the newest Garmin data was read on the phone (the latest export), or null. */
  garminAsOf: number | null;
  usual: {
    /** Steps baseline for the kind of day today is; null kind when today's work context is unknown. */
    steps: Baseline & { dayKind: "WORK" | "OFF" | null };
    resting: Baseline;
    sleep: Baseline;
    /** 28-day median of Garmin total burned per finished lived day. */
    burned: Baseline;
  };
  /** ROTATION-002: a streak of finished days outside your own range, or null (silence is the usual answer). */
  unusual: { resting: UnusualReading | null; sleep: UnusualReading | null; steps: UnusualReading | null };
}

/**
 * GARMIN-004 (owner approval 2026-10-22): everything TODAY's Garmin tiles and their detail sheets
 * show, read once. Display-only: no writes, no Engine input, no recommendation change.
 */
export async function getMeasuredSnapshot(now = Date.now()): Promise<MeasuredSnapshot> {
  const measured = await db.transaction("r", [db.beyondDays, db.externalActivityHours, db.externalRestingHeartRates, db.externalSleepRecords, db.externalSleepRevisions, db.healthImportReceipts], async () => {
    const [days, hours, restingRows, pointers, receipts] = await Promise.all([
      db.beyondDays.toArray(), db.externalActivityHours.toArray(), db.externalRestingHeartRates.toArray(), db.externalSleepRecords.toArray(), db.healthImportReceipts.toArray(),
    ]);
    const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
    const sleeps = revisions.flatMap((r: ExternalSleepRevision | undefined) => (r ? [r.evidence] : []));
    const periods = recentPeriods(days, now, MEASURED_PERIODS);
    const current = periods.at(-1)!;
    const baselines = personalBaselines({ days, sleeps, hours, resting: restingRows, now });
    const today = current.dayId ? days.find((d) => d.id === current.dayId) : undefined;
    const dayKind = today?.workContext === "WORK" || today?.workContext === "OFF" ? today.workContext : null;
    const burned = burnedByPeriod(periods, hours, now);
    const steps = stepsByPeriod(periods, hours, now), resting = restingByPeriod(periods, restingRows, now), sleep = sleepByPeriod(periods, sleeps, now);
    const contextOf = new Map(days.map((d) => [d.id, d.workContext]));
    const kindOf = (period: { dayId: string | null }) => { const kind = period.dayId ? contextOf.get(period.dayId) : undefined; return kind === "WORK" || kind === "OFF" ? kind : null; };
    const exports = [...receipts.map((r) => Date.parse(r.exportedAt)), ...hours.map((h) => Date.parse(h.exportedAt))].filter(Number.isFinite);
    const calorieExports = hours.flatMap((h) => h.totalCaloriesKcal == null ? []
      : [Date.parse(h.totalCaloriesExportedAt ?? h.exportedAt)]).filter(Number.isFinite);
    // Only finished days count toward the usual, so a day in progress never lowers it.
    const finishedBurned = burned.filter((p) => !p.partial && p.value !== null && p.from >= now - 28 * 24 * 3600_000).map((p) => p.value!);
    return {
      periods, days, hours, burned,
      any: hours.length > 0 || restingRows.length > 0 || sleeps.length > 0,
      readAt: now,
      current,
      steps, resting, sleep,
      unusual: {
        resting: unusualStreak(resting, UNUSUAL_SPECS.resting),
        sleep: unusualStreak(sleep, UNUSUAL_SPECS.sleep),
        steps: unusualStreak(steps, UNUSUAL_SPECS.steps, kindOf),
      },
      stepsToday: cumulativeSteps(current, hours, now),
      lastNight: lastNight(sleeps, now),
      activeBurned: burnedByPeriod(periods, hours, now, "active"),
      burnedToday: cumulativeBurned(current, hours, now),
      anyCalories: hours.some((h) => h.totalCaloriesKcal != null),
      caloriesAsOf: calorieExports.length ? Math.max(...calorieExports) : null,
      garminAsOf: exports.length ? Math.max(...exports) : null,
      usual: {
        steps: dayKind === "OFF" ? { ...baselines.offDaySteps, dayKind } : dayKind === "WORK" ? { ...baselines.workDaySteps, dayKind } : { value: null, samples: 0, dayKind: null },
        resting: baselines.restingHeartRateBpm,
        sleep: baselines.mainSleepMinutes,
        burned: { value: finishedBurned.length >= BASELINE_MIN_SAMPLES ? median(finishedBurned) : null, samples: finishedBurned.length },
      },
    };
  });
  // Meal calories come from BEYOND's own day ledger, read outside the Garmin transaction.
  const [summaries, meals] = await Promise.all([
    measured.anyCalories ? getDaySummaries() : Promise.resolve([]),
    measured.anyCalories && measured.current.dayId ? getMealEntries(measured.current.dayId) : Promise.resolve([]),
  ]);
  const kcalByDay = new Map(summaries.flatMap((d) => (d.kcal === undefined ? [] : [[d.beyondDayId, d.kcal] as const])));
  const { periods, days: _days, hours: _hours, ...snapshot } = measured;
  return {
    ...snapshot,
    eaten: eatenByPeriod(periods, kcalByDay, now),
    eatenToday: cumulativeEaten(measured.current, meals.map((m) => ({ recordedAt: m.at, calories: m.effectiveCalories })), now),
  };
}
