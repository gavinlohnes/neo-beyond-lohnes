import { db } from "../persistence/db";
import { compareSleepInstants } from "../domain/health/sleepImport";
import {
  MAX_ACTIVITY_FILE_BYTES, parseActivitySnapshot, restingHeartRateKey, summarizeActivity,
  type ActivitySnapshot, type ExternalActivityHour, type ExternalRestingHeartRate, type MeasuredActivity,
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
    for (const hour of snapshot.hours) {
      const existing = await db.externalActivityHours.get(hour.startTime);
      if (existing && compareSleepInstants(snapshot.exportedAt, existing.exportedAt) <= 0) { result.skipped++; continue; }
      const row: ExternalActivityHour = { ...hour, id: hour.startTime, exportedAt: snapshot.exportedAt, receiptId };
      await db.externalActivityHours.put(row);
      if (existing) result.revised++; else result.inserted++;
    }
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

export interface MeasuredDay { day: BeyondDay; measured: MeasuredActivity; restingHeartRateBpm: number | null }

/**
 * Measured steps and heart rate per existing lived day, newest first. A day runs from its start to
 * the next day's start (or now), so a night worker's day is never split at midnight.
 */
export async function getMeasuredActivityByDay(limit = 7, now = Date.now()): Promise<MeasuredDay[]> {
  return db.transaction("r", [db.beyondDays, db.externalActivityHours, db.externalRestingHeartRates], async () => {
    const [days, hours, resting] = await Promise.all([db.beyondDays.toArray(), db.externalActivityHours.toArray(), db.externalRestingHeartRates.toArray()]);
    if (!hours.length && !resting.length) return [];
    const ordered = days.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const result: MeasuredDay[] = [];
    ordered.forEach((day, i) => {
      const from = Date.parse(day.startedAt), to = i + 1 < ordered.length ? Date.parse(ordered[i + 1]!.startedAt) : now;
      const measured = summarizeActivity(hours, from, to);
      const latestResting = resting.filter((r) => { const t = Date.parse(r.time); return t >= from && t < to; })
        .sort((a, b) => b.time.localeCompare(a.time))[0];
      if (measured.hours || latestResting) result.push({ day, measured, restingHeartRateBpm: latestResting?.bpm ?? null });
    });
    return result.reverse().slice(0, limit);
  });
}
