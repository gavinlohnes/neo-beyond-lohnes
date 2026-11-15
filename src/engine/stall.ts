import { isWorkingSet } from "../domain/workout/types";
import type { PerformedSet } from "../domain/workout/types";
import { findSessionRecords } from "./personalRecords";

/**
 * Per-exercise session history, shared by the read-only stall finding (findings.ts) and DELOAD
 * (4.0-b slice 1, progression.ts), so both judge a stall the same way. Pure.
 */

/** A stall: this many sessions in a row of one exercise with no new record. */
export const STALL_SESSIONS = 4;
/** Stall and story only cover exercises done within this many days. */
export const RECENT_EXERCISE_DAYS = 28;
/** DELOAD: a stall counts only when every session in it was within this share of the run's heaviest top set. */
export const STEADY_FRACTION = 0.95;

const DAY_MS = 24 * 3_600_000;

export interface ExerciseSession {
  t: number;
  topWeight: number;
  /** This session set a record (heaviest or reps) for the exercise. */
  record: boolean;
}

/**
 * Every finished session's top set per exercise, oldest first, judged for records the way the ledger judges PRs.
 * `sessions` are finished (COMPLETED or PARTIAL) sessions; `sets` have undone sets already removed.
 */
export function buildExerciseHistories(
  sessions: readonly { sessionId: string; startedAt: string }[],
  sets: readonly PerformedSet[],
): Map<string, ExerciseSession[]> {
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const setsBySession = new Map<string, PerformedSet[]>();
  for (const set of sets) {
    const list = setsBySession.get(set.sessionId) ?? [];
    list.push(set);
    setsBySession.set(set.sessionId, list);
  }

  const history = new Map<string, ExerciseSession[]>();
  const prior: PerformedSet[] = [];
  for (const session of ordered) {
    const sessionSets = setsBySession.get(session.sessionId) ?? [];
    const records = findSessionRecords(prior, sessionSets);
    const counted = sessionSets.filter((s) => isWorkingSet(s) && !s.substitutedName && s.reps > 0);
    const byExercise = new Map<string, PerformedSet[]>();
    for (const set of counted) {
      const list = byExercise.get(set.exerciseId) ?? [];
      list.push(set);
      byExercise.set(set.exerciseId, list);
    }
    for (const [exerciseId, exSets] of byExercise) {
      const list = history.get(exerciseId) ?? [];
      list.push({
        t: new Date(session.startedAt).getTime(),
        topWeight: Math.max(...exSets.map((s) => s.weight)),
        record: exSets.some((s) => records.has(s.id)),
      });
      history.set(exerciseId, list);
    }
    prior.push(...sessionSets);
  }
  return history;
}

/** The stall finding's test: the last STALL_SESSIONS sessions set no record (the first session can't, so one more is needed). */
export function isStalled(history: readonly ExerciseSession[]): boolean {
  if (history.length < STALL_SESSIONS + 1) return false;
  return !history.slice(-STALL_SESSIONS).some((s) => s.record);
}

export interface DeloadStall {
  sessions: number;
  /** The run's top-set weights, oldest first. */
  topWeights: number[];
}

/**
 * DELOAD's stall (Gavin, 2026-11-15: "I approve the [deload] rule"): stalled as above, the last session within
 * RECENT_EXERCISE_DAYS, and steady: every top set in the run within STEADY_FRACTION of its heaviest. A lighter
 * session in the run (a deload already done, or a build back) means it isn't a plain stall, so DELOAD can only
 * come back after STALL_SESSIONS new sessions without a record.
 */
export function deloadStall(history: readonly ExerciseSession[], now: Date): DeloadStall | undefined {
  if (!isStalled(history)) return undefined;
  if (history[history.length - 1]!.t <= now.getTime() - RECENT_EXERCISE_DAYS * DAY_MS) return undefined;
  const tops = history.slice(-STALL_SESSIONS).map((s) => s.topWeight);
  const max = Math.max(...tops);
  if (max <= 0 || tops.some((w) => w < max * STEADY_FRACTION)) return undefined;
  return { sessions: STALL_SESSIONS, topWeights: tops };
}
