import { db } from "../persistence/db";
import type { ExternalSleepRevision } from "../domain/health/sleepImport";

export async function getImportedSleep(): Promise<ExternalSleepRevision[]> {
  return db.transaction("r", [db.externalSleepRecords, db.externalSleepRevisions], async () => {
    const pointers = await db.externalSleepRecords.orderBy("startTime").reverse().toArray();
    const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
    if (revisions.some((r) => !r)) throw new Error("Imported sleep history could not be read.");
    return revisions as ExternalSleepRevision[];
  });
}
export async function getSleepRevisionHistory(recordKey: string): Promise<ExternalSleepRevision[]> {
  return (await db.externalSleepRevisions.where("recordKey").equals(recordKey).toArray())
    .sort((a, b) => Date.parse(b.sourceVersion) - Date.parse(a.sourceVersion));
}
/** Only existing days are offered. Importing never creates a lived day. */
export async function getSleepImportDays() {
  return (await db.beyondDays.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
