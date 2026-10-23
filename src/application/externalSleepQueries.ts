import { db } from "../persistence/db";
import { compareSleepInstants } from "../domain/health/sleepImport";
import { classifyGarminSleep, type ExternalSleepRevision, type GarminSleepUnfiled } from "../domain/health/sleepImport";
import { getWorkedShiftWindows } from "./garminSleep";

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
    .sort((a, b) => compareSleepInstants(b.sourceVersion, a.sourceVersion));
}
/** Only existing days are offered. Importing never creates a lived day. */
export async function getSleepImportDays() {
  return (await db.beyondDays.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
/**
 * SLEEP-FILING-001: which imported Garmin sleeps are not counted as sleep, and why, by record key. A
 * sleep that still has an active Garmin-filled entry (for example one you corrected) counts and isn't
 * listed, so the note never contradicts what is logged.
 */
export async function getUnfiledGarminSleep(): Promise<Map<string, GarminSleepUnfiled>> {
  return db.transaction("r", [db.beyondDays, db.externalSleepRecords, db.externalSleepRevisions, db.schedulePatterns, db.events], async () => {
    const [days, pointers, sleepEvents] = await Promise.all([db.beyondDays.toArray(), db.externalSleepRecords.toArray(),
      db.events.where("type").anyOf(["SLEEP_LOGGED", "SLEEP_LOG_VOIDED"]).toArray()]);
    const voided = new Set(sleepEvents.filter((e) => e.type === "SLEEP_LOG_VOIDED").map((e) => (e.payload as { loggedEventId: string }).loggedEventId));
    const counted = new Set(sleepEvents.flatMap((e) => {
      const source = (e.payload as { source?: { kind: string; recordKey: string } }).source;
      return e.type === "SLEEP_LOGGED" && source?.kind === "GARMIN" && !voided.has(e.id) ? [source.recordKey] : [];
    }));
    const revisions = await db.externalSleepRevisions.bulkGet(pointers.map((p) => p.revisionId));
    const records = revisions.flatMap((r) => (r ? [{ recordKey: r.recordKey, sourceVersion: r.sourceVersion, evidence: r.evidence, associatedDayId: r.associatedDayId }] : []));
    const { unfiled } = classifyGarminSleep(days, records, await getWorkedShiftWindows(days));
    return new Map(unfiled.filter((u) => !counted.has(u.recordKey)).map((u) => [u.recordKey, u]));
  });
}

