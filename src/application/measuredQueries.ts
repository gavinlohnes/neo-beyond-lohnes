import { db } from "../persistence/db";
import type { Period } from "../domain/health/activityImport";
import { personalBaselines, type Baseline } from "../domain/health/baselines";
import {
  cumulativeSteps, lastNight, recentPeriods, restingByPeriod, sleepByPeriod, stepsByPeriod,
  type PeriodValue,
} from "../domain/health/measuredSeries";
import type { ExternalSleep, ExternalSleepRevision } from "../domain/health/sleepImport";

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
  usual: {
    /** Steps baseline for the kind of day today is; null kind when today's work context is unknown. */
    steps: Baseline & { dayKind: "WORK" | "OFF" | null };
    resting: Baseline;
    sleep: Baseline;
  };
}

/**
 * GARMIN-004 (owner approval 2026-10-22): everything TODAY's Garmin tiles and their detail sheets
 * show, read once. Display-only: no writes, no Engine input, no recommendation change.
 */
export async function getMeasuredSnapshot(now = Date.now()): Promise<MeasuredSnapshot> {
  return db.transaction("r", [db.beyondDays, db.externalActivityHours, db.externalRestingHeartRates, db.externalSleepRecords, db.externalSleepRevisions], async () => {
    const [days, hours, restingRows, pointers] = await Promise.all([
      db.beyondDays.toArray(), db.externalActivityHours.toArray(), db.externalRestingHeartRates.toArray(), db.externalSleepRecords.toArray(),
    ]);
    const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
    const sleeps = revisions.flatMap((r: ExternalSleepRevision | undefined) => (r ? [r.evidence] : []));
    const periods = recentPeriods(days, now, MEASURED_PERIODS);
    const current = periods.at(-1)!;
    const baselines = personalBaselines({ days, sleeps, hours, resting: restingRows, now });
    const today = current.dayId ? days.find((d) => d.id === current.dayId) : undefined;
    const dayKind = today?.workContext === "WORK" || today?.workContext === "OFF" ? today.workContext : null;
    return {
      any: hours.length > 0 || restingRows.length > 0 || sleeps.length > 0,
      readAt: now,
      current,
      steps: stepsByPeriod(periods, hours, now),
      resting: restingByPeriod(periods, restingRows, now),
      sleep: sleepByPeriod(periods, sleeps, now),
      stepsToday: cumulativeSteps(current, hours, now),
      lastNight: lastNight(sleeps, now),
      usual: {
        steps: dayKind === "OFF" ? { ...baselines.offDaySteps, dayKind } : dayKind === "WORK" ? { ...baselines.workDaySteps, dayKind } : { value: null, samples: 0, dayKind: null },
        resting: baselines.restingHeartRateBpm,
        sleep: baselines.mainSleepMinutes,
      },
    };
  });
}
