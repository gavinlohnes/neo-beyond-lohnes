import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { formatLocalDate } from "../engine/scheduledContext";
import { getUndoneSetIds } from "./trainQueries";
import { getAllRecords } from "./personalRecordQueries";

/**
 * VIEWS-001 (owner brief 2026-10-05): read-only data views that open from a
 * tap — a lift's strength curve, and Weekly's 12-week training grid. Nothing
 * is stored and nothing here reaches the Engine.
 */

export interface StrengthPoint {
  sessionId: string;
  /** The session's start, ISO. */
  at: string;
  /** The heaviest counted set of this lift in that session. */
  topWeight: number;
  /** A personal record was set on this lift in that session (the RECORDS rule). */
  pr: boolean;
}

async function finishedSessions() {
  return (await db.workoutSessions.toArray())
    .filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** One point per finished session that trained this lift, oldest first. */
export async function getStrengthCurve(exerciseId: string): Promise<StrengthPoint[]> {
  const [sessions, undone, records] = await Promise.all([finishedSessions(), getUndoneSetIds(), getAllRecords()]);
  const prSessions = new Set(records.filter((r) => r.exerciseId === exerciseId).map((r) => r.sessionId));
  const sets = ((await db.performedSets.where("exerciseId").equals(exerciseId).toArray()) as unknown as PerformedSet[]).filter(
    // Counted sets only, as RECORDS counts them: a substitute is a different lift in the same slot.
    (s) => !undone.has(s.id) && !s.skipped && s.reps > 0 && !s.substitutedName,
  );
  const points: StrengthPoint[] = [];
  for (const session of sessions) {
    const mine = sets.filter((s) => s.sessionId === session.id);
    if (mine.length === 0) continue;
    points.push({
      sessionId: session.id,
      at: session.startedAt,
      topWeight: Math.max(...mine.map((s) => s.weight)),
      pr: prSessions.has(session.id),
    });
  }
  return points;
}

export type TrainingDayKind = "STRENGTH" | "RECOVERY" | "NONE";

export interface TrainingDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  kind: TrainingDayKind;
}

export const HEAT_GRID_WEEKS = 12;

/**
 * The last 12 weeks (84 calendar days ending today), one entry per day, oldest
 * first: STRENGTH when a finished strength session started that day,
 * RECOVERY when only a finished recovery session did, NONE otherwise.
 */
export async function getTrainingGrid(now: Date = new Date()): Promise<TrainingDay[]> {
  const byDate = new Map<string, TrainingDayKind>();
  for (const session of await finishedSessions()) {
    const date = formatLocalDate(new Date(session.startedAt));
    const kind: TrainingDayKind = session.sessionType === "RECOVERY" ? "RECOVERY" : "STRENGTH";
    if (byDate.get(date) !== "STRENGTH") byDate.set(date, kind);
  }
  const days: TrainingDay[] = [];
  for (let offset = HEAT_GRID_WEEKS * 7 - 1; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const date = formatLocalDate(d);
    days.push({ date, kind: byDate.get(date) ?? "NONE" });
  }
  return days;
}
