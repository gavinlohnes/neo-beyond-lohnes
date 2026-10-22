import { db } from "../persistence/db";
import { compareSleepInstants } from "../domain/health/sleepImport";
import {
  MAX_ACTIVITY_FILE_BYTES, measuredPeriods, parseActivitySnapshot, restingHeartRateKey,
  type ActivitySnapshot, type ExternalActivityHour, type ExternalRestingHeartRate, type MeasuredPeriod,
} from "../domain/health/activityImport";
import type { HealthImportReceipt } from "../domain/health/sleepImport";
import type { BeyondDay } from "../domain/common/types";

export async function previewActivityImport(file: Pick<File, "size" | "text">): Promise<ActivitySnapshot> {
  if (file.size > MAX_ACTIVITY_FILE_BYTES) throw new Error("Steps and heart rate export is too large.");
  return parseActivitySnapshot(await file.text());
}

/**
 * GARMIN-002: atomic, evidence-only import. A newer export replaces the same hour's aggregate; an
 * older or repeated export is skipped. No day creation, canonical events, manual logs or Engine calls.
 */
export async function importActivitySnapshot(input: unknown): Promise<{ inserted: number; revised: number; skipped: number }> {
  const snapshot = parseActivitySnapshot(JSON.stringify(input));
  return db.transaction("rw", [db.externalActivityHours, db.externalRestingHeartRates, db.healthImportReceipts], async () => {
    const receiptId = crypto.randomUUID(), importedAt = new Date().toISOString();
    const result = { inserted: 0, revised: 0, skipped: 0 };
    // GARMIN-003: a full-history file can hold ~8,800 hours, so read and write them in bulk.
    const existingHours = await db.externalActivityHours.bulkGet(snapshot.hours.map((h) => h.startTime));
    const rows: ExternalActivityHour[] = [];
    snapshot.hours.forEach((hour, i) => {
      const existing = existingHours[i];
      if (existing && compareSleepInstants(snapshot.exportedAt, existing.exportedAt) <= 0) { result.skipped++; return; }
      // GARMIN-005: null means the helper could not read that field (including revoked permission),
      // not that an earlier measurement became zero or disappeared. Preserve each field separately
      // and retain the export that actually supplied it so stale calories never look newly refreshed.
      const total = hour.totalCaloriesKcal != null
        ? { totalCaloriesKcal: hour.totalCaloriesKcal, totalCaloriesExportedAt: snapshot.exportedAt }
        : existing?.totalCaloriesKcal != null
          ? { totalCaloriesKcal: existing.totalCaloriesKcal, totalCaloriesExportedAt: existing.totalCaloriesExportedAt ?? existing.exportedAt }
          : snapshot.schemaVersion === 2 ? { totalCaloriesKcal: null } : {};
      const active = hour.activeCaloriesKcal != null
        ? { activeCaloriesKcal: hour.activeCaloriesKcal, activeCaloriesExportedAt: snapshot.exportedAt }
        : existing?.activeCaloriesKcal != null
          ? { activeCaloriesKcal: existing.activeCaloriesKcal, activeCaloriesExportedAt: existing.activeCaloriesExportedAt ?? existing.exportedAt }
          : snapshot.schemaVersion === 2 ? { activeCaloriesKcal: null } : {};
      rows.push({ ...hour, ...total, ...active, id: hour.startTime, exportedAt: snapshot.exportedAt, receiptId });
      if (existing) result.revised++; else result.inserted++;
    });
    await db.externalActivityHours.bulkPut(rows);
    for (const reading of snapshot.restingHeartRate) {
      const key = restingHeartRateKey(reading);
      const existing = await db.externalRestingHeartRates.get(key);
      if (existing && compareSleepInstants(reading.lastModifiedTime, existing.lastModifiedTime) <= 0) { result.skipped++; continue; }
      const row: ExternalRestingHeartRate = { ...reading, key, importedAt, receiptId };
      await db.externalRestingHeartRates.put(row);
      if (existing) result.revised++; else result.inserted++;
    }
    if (result.inserted || result.revised) {
      const receipt: HealthImportReceipt = { id: receiptId, importedAt, exportedAt: snapshot.exportedAt, producerVersion: snapshot.producer.version, ...result };
      await db.healthImportReceipts.add(receipt);
    }
    return result;
  });
}

export interface MeasuredDay extends MeasuredPeriod { day: BeyondDay | null }

/**
 * Measured steps and heart rate per lived day (each capped at 24 hours), newest first. Stretches
 * with no BEYOND day are shown on their own rather than folded into the previous day.
 */
export async function getMeasuredActivityByDay(limit = 7, now = Date.now()): Promise<MeasuredDay[]> {
  return db.transaction("r", [db.beyondDays, db.externalActivityHours, db.externalRestingHeartRates], async () => {
    const [days, hours, resting] = await Promise.all([db.beyondDays.toArray(), db.externalActivityHours.toArray(), db.externalRestingHeartRates.toArray()]);
    if (!hours.length && !resting.length) return [];
    const byId = new Map(days.map((d) => [d.id, d]));
    return measuredPeriods(days, hours, resting, now).slice(0, limit)
      .map((p) => ({ ...p, day: p.dayId ? byId.get(p.dayId) ?? null : null }));
  });
}
