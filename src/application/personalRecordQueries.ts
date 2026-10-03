import { db } from "../persistence/db";
import type { PerformedSet } from "../domain/workout/types";
import { getUndoneSetIds } from "./trainQueries";

export {
  byLoggedOrder,
  findSessionRecords,
  type PersonalRecord,
  type PersonalRecordKind,
  type RecordCandidateSet,
} from "../engine/personalRecords";
import type { PersonalRecord } from "../engine/personalRecords";

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
