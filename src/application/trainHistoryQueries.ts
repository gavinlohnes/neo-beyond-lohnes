import { db } from "../persistence/db";
import type { WorkoutSession } from "../domain/common/types";
import type { PerformedSet, WorkoutTemplateId } from "../domain/workout/types";
import { getUndoneSetIds } from "./trainQueries";
import { byLoggedOrder, getAllRecords, type PersonalRecord } from "./personalRecordQueries";
import { getExerciseNames } from "./exerciseLibraryQueries";

/**
 * ULTIMATE-FOUNDATION-002 (Training Record, owner-approved 2026-10-17):
 * read-only views of TRAIN's own history — the session list, one session's
 * record, and a lift's recent sessions. Nothing is stored and nothing here
 * reaches the Engine; every figure is derived from performedSets and
 * SET_UNDONE events on each read, so an undo disappears on the next read.
 */

/**
 * The one volume rule: weight × reps over non-skipped sets. Callers pass
 * sets with undone sets already removed (getPerformedSets does this).
 * Substitutes count — they are work performed, even though RECORDS and the
 * strength curve treat them as a different lift.
 */
export function workoutVolumeLbs(sets: readonly Pick<PerformedSet, "weight" | "reps" | "skipped">[]): number {
  return sets.filter((s) => !s.skipped).reduce((sum, s) => sum + s.weight * s.reps, 0);
}

type StrengthSessionType = "STANDARD" | "REDUCED";
type HistoryStatus = "COMPLETED" | "PARTIAL" | "ABANDONED";

export interface TrainingHistoryEntry {
  id: string;
  beyondDayId: string;
  templateId: WorkoutTemplateId;
  sessionType: StrengthSessionType;
  /** The real status — ABANDONED is never shown as finished. */
  status: HistoryStatus;
  startedAt: string;
  /** null when endedAt is missing; never derived from "now". */
  durationMinutes: number | null;
  workingSetCount: number;
  skippedSetCount: number;
  volumeLbs: number;
  recordCount: number;
}

function isHistorySession(s: WorkoutSession): s is WorkoutSession & { sessionType: StrengthSessionType; status: HistoryStatus } {
  // The same rule as getRecentStrengthSessions: strength sessions only, ACTIVE excluded.
  return (s.sessionType === "STANDARD" || s.sessionType === "REDUCED") && s.status !== "ACTIVE";
}

function durationOf(session: WorkoutSession): number | null {
  if (!session.endedAt) return null;
  return Math.max(0, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000));
}

async function countedSetsBySession(): Promise<Map<string, PerformedSet[]>> {
  const [sets, undone] = await Promise.all([db.performedSets.toArray(), getUndoneSetIds()]);
  const bySession = new Map<string, PerformedSet[]>();
  for (const set of sets as unknown as PerformedSet[]) {
    if (undone.has(set.id)) continue;
    const list = bySession.get(set.sessionId) ?? [];
    list.push(set);
    bySession.set(set.sessionId, list);
  }
  return bySession;
}

function toEntry(session: WorkoutSession & { sessionType: StrengthSessionType; status: HistoryStatus }, sets: readonly PerformedSet[], recordCount: number): TrainingHistoryEntry {
  return {
    id: session.id,
    beyondDayId: session.beyondDayId,
    templateId: session.templateId as WorkoutTemplateId,
    sessionType: session.sessionType,
    status: session.status,
    startedAt: session.startedAt,
    durationMinutes: durationOf(session),
    workingSetCount: sets.filter((s) => !s.skipped).length,
    skippedSetCount: sets.filter((s) => s.skipped).length,
    volumeLbs: workoutVolumeLbs(sets),
    recordCount,
  };
}

/** Every strength session that is no longer in progress, newest first. */
export async function getTrainingHistory(): Promise<TrainingHistoryEntry[]> {
  const [sessions, setsBySession, records] = await Promise.all([db.workoutSessions.toArray(), countedSetsBySession(), getAllRecords()]);
  const recordCounts = new Map<string, number>();
  for (const r of records) recordCounts.set(r.sessionId, (recordCounts.get(r.sessionId) ?? 0) + 1);
  return sessions
    .filter(isHistorySession)
    .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt))
    .map((s) => toEntry(s, setsBySession.get(s.id) ?? [], recordCounts.get(s.id) ?? 0));
}

export interface SessionRecordSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  skipped: boolean;
  substitutedName?: string;
  record?: PersonalRecord;
}

export interface SessionRecordExercise {
  exerciseId: string;
  name: string;
  sets: SessionRecordSet[];
}

export interface WorkoutSessionRecord {
  entry: TrainingHistoryEntry;
  /** In the order each exercise was first logged; sets within it by set number. */
  exercises: SessionRecordExercise[];
}

/** One history session's sets, records and volume; null when it isn't a history session. */
export async function getWorkoutSessionRecord(sessionId: string): Promise<WorkoutSessionRecord | null> {
  const session = await db.workoutSessions.get(sessionId);
  if (!session || !isHistorySession(session)) return null;
  const [setsBySession, records, names] = await Promise.all([countedSetsBySession(), getAllRecords(), getExerciseNames()]);
  const sets = [...(setsBySession.get(sessionId) ?? [])].sort(byLoggedOrder);
  const recordBySet = new Map(records.filter((r) => r.sessionId === sessionId).map((r) => [r.setId, r.record]));

  const exercises = new Map<string, SessionRecordExercise>();
  for (const set of sets) {
    const exercise = exercises.get(set.exerciseId) ?? { exerciseId: set.exerciseId, name: names[set.exerciseId] ?? set.exerciseId, sets: [] };
    const record = recordBySet.get(set.id);
    exercise.sets.push({
      id: set.id,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      skipped: set.skipped,
      ...(set.substitutedName ? { substitutedName: set.substitutedName } : {}),
      ...(record ? { record } : {}),
    });
    exercises.set(set.exerciseId, exercise);
  }
  for (const exercise of exercises.values()) exercise.sets.sort((a, b) => a.setNumber - b.setNumber);

  return { entry: toEntry(session, sets, recordBySet.size), exercises: [...exercises.values()] };
}

export interface LiftSession {
  sessionId: string;
  startedAt: string;
  templateId: WorkoutTemplateId;
  sessionType: string;
  /** Working sets of this lift, by set number. */
  sets: { weight: number; reps: number }[];
}

/**
 * A lift's most recent finished sessions, newest first — the same counted
 * sets the strength curve and RECORDS use: finished sessions only, no
 * skipped or zero-rep sets, and no substitutes (a different lift in the
 * same slot). The in-progress session is never included.
 */
export async function getLiftRecentSessions(exerciseId: string, limit = 3): Promise<LiftSession[]> {
  const [sessions, undone, sets] = await Promise.all([
    db.workoutSessions.toArray(),
    getUndoneSetIds(),
    db.performedSets.where("exerciseId").equals(exerciseId).toArray(),
  ]);
  const counted = (sets as unknown as PerformedSet[]).filter((s) => !undone.has(s.id) && !s.skipped && s.reps > 0 && !s.substitutedName);
  const result: LiftSession[] = [];
  const finished = sessions
    .filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const session of finished) {
    const mine = counted.filter((s) => s.sessionId === session.id).sort((a, b) => a.setNumber - b.setNumber);
    if (mine.length === 0) continue;
    result.push({
      sessionId: session.id,
      startedAt: session.startedAt,
      templateId: session.templateId as WorkoutTemplateId,
      sessionType: session.sessionType,
      sets: mine.map((s) => ({ weight: s.weight, reps: s.reps })),
    });
    if (result.length >= limit) break;
  }
  return result;
}
