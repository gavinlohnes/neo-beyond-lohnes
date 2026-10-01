import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { getUndoneSetIds } from "./trainQueries";

/**
 * DECLUTTER roadmap Drop 4 (owner approval 2026-09-30): live personal-record
 * alerts. Derived only from sets already logged — nothing new is stored, and
 * nothing here feeds the Engine or recommendations.
 *
 * A set is a record for its exercise when an earlier session logged that
 * exercise and either:
 * - HEAVIEST: its weight beats every earlier set; or
 * - REPS: no earlier set at the same or a heavier weight had as many reps.
 * The first session with an exercise never shows a record, not even for a
 * heavier later set (nothing to beat yet, and ramping up isn't a PR).
 * Skipped sets, zero-rep sets, and substituted movements are ignored on both
 * sides, since a substitute is a different lift under the same slot.
 */
export type PersonalRecordKind = "HEAVIEST" | "REPS";

export interface PersonalRecord {
  kind: PersonalRecordKind;
  weight: number;
  reps: number;
}

export interface RecordCandidateSet {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  skipped: boolean;
  substitutedName?: string;
  recordedAt: string;
  /** Tie-break for sets logged in the same millisecond. */
  setNumber?: number;
}

/** Logged order: time, then set number when two sets share a timestamp. */
export function byLoggedOrder(a: RecordCandidateSet, b: RecordCandidateSet): number {
  return a.recordedAt.localeCompare(b.recordedAt) || (a.setNumber ?? 0) - (b.setNumber ?? 0);
}

function counts(set: RecordCandidateSet): boolean {
  return !set.skipped && !set.substitutedName && set.reps > 0;
}

/**
 * Pure: which of `sessionSets` were records, judged against `history` (sets
 * from other sessions) plus the earlier sets of this same session, in the
 * order they were logged. Keyed by set id.
 */
export function findSessionRecords(
  history: readonly RecordCandidateSet[],
  sessionSets: readonly RecordCandidateSet[],
): Map<string, PersonalRecord> {
  const seen = new Map<string, { weight: number; reps: number }[]>();
  for (const set of history) {
    if (!counts(set)) continue;
    const list = seen.get(set.exerciseId) ?? [];
    list.push({ weight: set.weight, reps: set.reps });
    seen.set(set.exerciseId, list);
  }

  const hasEarlierSession = new Set(seen.keys());
  const records = new Map<string, PersonalRecord>();
  const ordered = [...sessionSets].sort(byLoggedOrder);
  for (const set of ordered) {
    if (!counts(set)) continue;
    const prior = seen.get(set.exerciseId) ?? [];
    if (hasEarlierSession.has(set.exerciseId)) {
      const heaviest = Math.max(...prior.map((p) => p.weight));
      if (set.weight > heaviest) {
        records.set(set.id, { kind: "HEAVIEST", weight: set.weight, reps: set.reps });
      } else if (prior.filter((p) => p.weight >= set.weight).every((p) => p.reps < set.reps)) {
        records.set(set.id, { kind: "REPS", weight: set.weight, reps: set.reps });
      }
    }
    prior.push({ weight: set.weight, reps: set.reps });
    seen.set(set.exerciseId, prior);
  }
  return records;
}

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
