import { db } from "../persistence/db";
import { MAX_SLEEP_FILE_BYTES, parseSleepSnapshot, sleepRecordKey } from "../domain/health/sleepImport";
import type { ExternalSleepRevision, HealthImportReceipt, SleepSnapshot } from "../domain/health/sleepImport";

export async function previewSleepImport(file: Pick<File, "size" | "text">): Promise<SleepSnapshot> {
  if (file.size > MAX_SLEEP_FILE_BYTES) throw new Error("Sleep export is too large. Export a smaller window.");
  return parseSleepSnapshot(await file.text());
}
/** Atomic evidence-only import. No day creation, canonical events, or Engine calls. */
export async function importSleepSnapshot(input: unknown, associations: Readonly<Record<string, string | null>> = {}): Promise<{ inserted: number; revised: number; skipped: number }> {
  const snapshot = parseSleepSnapshot(JSON.stringify(input));
  return db.transaction("rw", [db.externalSleepRecords, db.externalSleepRevisions, db.healthImportReceipts, db.beyondDays], async () => {
    const receiptId = crypto.randomUUID(), importedAt = new Date().toISOString();
    const result = { inserted: 0, revised: 0, skipped: 0 };
    for (const evidence of snapshot.records) {
      const key = sleepRecordKey(evidence);
      const existing = await db.externalSleepRecords.get(key);
      const prior = existing ? await db.externalSleepRevisions.get(existing.revisionId) : undefined;
      if (existing && !prior) throw new Error("Imported sleep history is incomplete. Restore a verified backup before importing again.");
      if (prior) {
        const age = Date.parse(evidence.lastModifiedTime) - Date.parse(prior.sourceVersion);
        if (age < 0) { result.skipped++; continue; }
        if (age === 0) {
          if (JSON.stringify(prior.evidence) !== JSON.stringify(evidence)) throw new Error("A source record changed without a newer source version. Nothing was imported. Export again from Health Connect.");
          result.skipped++; continue;
        }
      }
      const associatedDayId = Object.hasOwn(associations, evidence.id) ? associations[evidence.id] : (prior?.associatedDayId ?? null);
      if (associatedDayId !== null && (typeof associatedDayId !== "string" || !(await db.beyondDays.get(associatedDayId)))) throw new Error("The selected lived day no longer exists. Preview again.");
      const revision: ExternalSleepRevision = { id: crypto.randomUUID(), recordKey: key, sourceVersion: evidence.lastModifiedTime,
        evidence, importedAt, receiptId, associatedDayId };
      await db.externalSleepRevisions.add(revision);
      await db.externalSleepRecords.put({ id: key, revisionId: revision.id, startTime: evidence.startTime, lastModifiedTime: evidence.lastModifiedTime });
      if (existing) result.revised++; else result.inserted++;
    }
    if (result.inserted || result.revised) {
      const receipt: HealthImportReceipt = { id: receiptId, importedAt, exportedAt: snapshot.exportedAt, producerVersion: snapshot.producer.version, ...result };
      await db.healthImportReceipts.add(receipt);
    }
    return result;
  });
}
