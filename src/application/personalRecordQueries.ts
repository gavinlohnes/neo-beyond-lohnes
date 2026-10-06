import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";
import { getUndoneSetIds } from "./trainQueries";
import { getCustomExercises } from "./exerciseLibraryQueries";

export {
  byLoggedOrder,
  findSessionRecords,
  type PersonalRecord,
  type PersonalRecordKind,
  type RecordCandidateSet,
} from "../engine/personalRecords";
import { byLoggedOrder, findSessionRecords, type PersonalRecord } from "../engine/personalRecords";

/** Every counted set logged outside `sessionId` (undone sets excluded) — the history records are judged against. */
export async function getRecordHistory(sessionId: string): Promise<PerformedSet[]> {
  const [sets, undoneIds] = await Promise.all([db.performedSets.toArray(), getUndoneSetIds()]);
  return (sets as unknown as PerformedSet[]).filter((s) => s.sessionId !== sessionId && !undoneIds.has(s.id));
}

export function describePersonalRecord(record: PersonalRecord): string {
  return record.kind === "HEAVIEST"
    ? `NEW PR — heaviest yet (${record.weight} lb)`
    : `NEW PR — most reps at ${record.weight} lb (${record.reps})`;
}

export interface RecordCard {
  setId: string;
  /** VIEWS-001: which lift and which session, so a card can open that lift's curve. */
  exerciseId: string;
  sessionId: string;
  exerciseName: string;
  record: PersonalRecord;
  recordedAt: string;
}

/**
 * PR-CARDS-001 (owner brief 2026-10-04): every personal record from finished
 * workouts, newest first, for TRAIN → RECORDS. The same rule as the finish
 * summary and Weekly (findSessionRecords), walked session by session in
 * order, each judged against the finished sessions before it; undone sets
 * are left out, so an undone PR disappears. Nothing is stored.
 */
export async function getAllRecords(): Promise<RecordCard[]> {
  const sessions = (await db.workoutSessions.toArray())
    .filter((s) => s.status === "COMPLETED" || s.status === "PARTIAL")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const undone = await getUndoneSetIds();
  const allSets = ((await db.performedSets.toArray()) as unknown as PerformedSet[]).filter((s) => !undone.has(s.id));
  const setsBySession = new Map<string, PerformedSet[]>();
  for (const set of allSets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }
  const names = new Map<string, string>();
  for (const template of Object.values(WORKOUT_TEMPLATES)) {
    for (const ex of template.exercises) names.set(ex.exerciseId, ex.name);
  }
  for (const ex of await getCustomExercises({ includeArchived: true })) names.set(ex.id, ex.name);

  const priorSets: PerformedSet[] = [];
  const cards: RecordCard[] = [];
  for (const session of sessions) {
    const sets = setsBySession.get(session.id) ?? [];
    const found = findSessionRecords(priorSets, sets);
    for (const set of [...sets].sort(byLoggedOrder)) {
      const record = found.get(set.id);
      if (record) {
        cards.push({
          setId: set.id,
          exerciseId: set.exerciseId,
          sessionId: set.sessionId,
          exerciseName: names.get(set.exerciseId) ?? set.exerciseId,
          record,
          recordedAt: set.recordedAt,
        });
      }
    }
    priorSets.push(...sets);
  }
  return cards.reverse();
}

/** A record card's line: "Heaviest: 145 lb × 8" or "Most reps at 135 lb: 12". */
export function describeRecordCard(record: PersonalRecord): string {
  return record.kind === "HEAVIEST"
    ? `Heaviest: ${record.weight} lb × ${record.reps}`
    : `Most reps at ${record.weight} lb: ${record.reps}`;
}
