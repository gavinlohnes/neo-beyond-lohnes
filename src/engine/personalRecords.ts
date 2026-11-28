import { compareSetOrder, countsTowardBest } from "../domain/workout/types";
/**
 * Moved here unchanged from application/personalRecordQueries.ts (Drop 1,
 * Day Ledger, 2026-10-03) so the pure Day Ledger can count each session's
 * PRs; application/personalRecordQueries.ts re-exports everything below, so
 * existing callers are untouched.
 *
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
 * GRAYSON-SET-TYPES-001: a timed set (durationSec) is a record when no earlier timed set at the same or a heavier
 * weight was held as long (TIME). Drop and warm-up sets are never records.
 * Skipped sets, zero-rep sets, and substituted movements are ignored on both
 * sides, since a substitute is a different lift under the same slot.
 */
export type PersonalRecordKind = "HEAVIEST" | "REPS" | "TIME";

export interface PersonalRecord {
  kind: PersonalRecordKind;
  weight: number;
  reps: number;
  /** TIME only (GRAYSON-SET-TYPES-001): the hold, in seconds. */
  durationSec?: number;
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
  setKind?: string;
  seq?: number;
  /** GRAYSON-SET-TYPES-001: a timed set's hold. */
  durationSec?: number;
}

/** Logged order: time, then set number when two sets share a timestamp. */
export function byLoggedOrder(a: RecordCandidateSet, b: RecordCandidateSet): number {
  return compareSetOrder(a, b);
}

function counts(set: RecordCandidateSet): boolean {
  // GRAYSON-SET-TYPES-001: drop sets never set a best.
  return countsTowardBest(set) && !set.substitutedName && set.reps > 0 && set.durationSec === undefined;
}

/** GRAYSON-SET-TYPES-001: a timed set is judged by how long it was held, per weight. Drop sets still never count. */
function countsTimed(set: RecordCandidateSet): boolean {
  return countsTowardBest(set) && !set.substitutedName && set.durationSec !== undefined && set.durationSec > 0;
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

  const held = new Map<string, { weight: number; durationSec: number }[]>();
  for (const set of history) {
    if (!countsTimed(set)) continue;
    held.set(set.exerciseId, [...(held.get(set.exerciseId) ?? []), { weight: set.weight, durationSec: set.durationSec! }]);
  }

  const hasEarlierSession = new Set(seen.keys());
  const hasEarlierHold = new Set(held.keys());
  const records = new Map<string, PersonalRecord>();
  const ordered = [...sessionSets].sort(byLoggedOrder);
  for (const set of ordered) {
    if (countsTimed(set)) {
      // Longest hold at this weight or heavier; the first session with the exercise sets nothing, like reps.
      const prior = held.get(set.exerciseId) ?? [];
      if (hasEarlierHold.has(set.exerciseId) && prior.filter((p) => p.weight >= set.weight).every((p) => p.durationSec < set.durationSec!)) {
        records.set(set.id, { kind: "TIME", weight: set.weight, reps: set.reps, durationSec: set.durationSec! });
      }
      prior.push({ weight: set.weight, durationSec: set.durationSec! });
      held.set(set.exerciseId, prior);
      continue;
    }
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
