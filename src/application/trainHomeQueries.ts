import type { BeyondDay, SchedulePattern } from "../domain/common/types";
import { getAllRecords, type RecordCard } from "./personalRecordQueries";
import { getActiveDay, getSchedulePattern } from "./queries";
import { getTrainingHistory } from "./trainHistoryQueries";
import { trainingWeeks, type TrainWeek } from "./trainHome";

/**
 * VISUAL-FOUNDATION-002: what TRAIN's first view reads beyond its workout: the lived day and saved schedule (for the
 * command bar), the last eight weeks of finished sessions, and the newest personal record. Each from its existing
 * query; read only. A part that can't be read is null, never a guess.
 */
export interface TrainHome {
  day: BeyondDay | null;
  schedule: SchedulePattern | null;
  weeks: TrainWeek[] | null;
  /** True when any finished strength session with a working set exists, in any week. */
  anyTraining: boolean;
  newestRecord: RecordCard | null;
}

export async function getTrainHome(now: Date = new Date()): Promise<TrainHome> {
  const [day, schedule, history, records] = await Promise.all([
    getActiveDay().catch(() => null),
    getSchedulePattern().catch(() => null),
    getTrainingHistory().catch(() => null),
    getAllRecords().catch(() => null),
  ]);
  return {
    day: day ?? null,
    schedule,
    weeks: history ? trainingWeeks(history, now) : null,
    anyTraining: !!history?.some((e) => (e.status === "COMPLETED" || e.status === "PARTIAL") && e.workingSetCount > 0),
    newestRecord: records?.length ? records.reduce((a, b) => (b.recordedAt > a.recordedAt ? b : a)) : null,
  };
}
