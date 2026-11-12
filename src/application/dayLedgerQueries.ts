import Dexie from "dexie";
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
// PERF-001: one screen often asks for the summaries several times at once (REVIEW opens five readers). Callers that
// arrive while a read is running share it. Nothing is kept once it resolves, any committed write drops the shared
// read (Dexie's storagemutated), and a call inside a transaction always reads in that transaction.
let shared: Promise<DaySummary[]> | null = null;
Dexie.on("storagemutated", () => { shared = null; });

export function getDaySummaries(): Promise<DaySummary[]> {
  if (Dexie.currentTransaction) return readDaySummaries();
  if (shared) return shared;
  const read = readDaySummaries().finally(() => { if (shared === read) shared = null; });
  shared = read;
  return read;
}

async function readDaySummaries(): Promise<DaySummary[]> {
  const [days, events, workoutSessions, performedSets, schedule] = await Promise.all([
    db.beyondDays.toArray() as Promise<BeyondDay[]>,
    db.events.toArray() as Promise<DomainEvent[]>,
    db.workoutSessions.toArray() as Promise<WorkoutSession[]>,
    db.performedSets.toArray() as unknown as Promise<PerformedSet[]>,
    getSchedulePattern(),
  ]);
  return projectDaySummaries({ days, events, workoutSessions, performedSets, schedule });
}
