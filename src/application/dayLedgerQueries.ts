import { db } from "../persistence/db";
import type { BeyondDay, DomainEvent, WorkoutSession } from "../domain/common/types";
import type { PerformedSet } from "../domain/workout/types";
import { projectDaySummaries, type DaySummary } from "../engine/dayLedger";
import { getSchedulePattern } from "./queries";

/**
 * DAY LEDGER (Drop 1): the I/O half — reads everything once and hands it to
 * engine/dayLedger.ts's pure projectDaySummaries. Covers all history, every
 * BeyondDay ever recorded. Read-only; nothing is stored.
 */
export async function getDaySummaries(): Promise<DaySummary[]> {
  const [days, events, workoutSessions, performedSets, schedule] = await Promise.all([
    db.beyondDays.toArray() as Promise<BeyondDay[]>,
    db.events.toArray() as Promise<DomainEvent[]>,
    db.workoutSessions.toArray() as Promise<WorkoutSession[]>,
    db.performedSets.toArray() as unknown as Promise<PerformedSet[]>,
    getSchedulePattern(),
  ]);
  return projectDaySummaries({ days, events, workoutSessions, performedSets, schedule });
}
