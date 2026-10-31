import { importSleepSnapshot, previewSleepImport } from "./externalSleepCommands";
import { importActivitySnapshot, previewActivityImport } from "./externalActivityCommands";
import { ACTIVITY_IMPORT_FORMAT, MAX_ACTIVITY_FILE_BYTES } from "../domain/health/activityImport";
import { MAX_SLEEP_FILE_BYTES } from "../domain/health/sleepImport";
import { getMeasuredSnapshot } from "./measuredQueries";
import { sleepMinutes } from "../domain/health/measuredSeries";

/**
 * SYNC-002 (owner go 2026-10-31, option A: "one-tap sync"): what SYNC GARMIN brought back. The files
 * the Health Bridge sent are imported straight away, through the same import commands the preview uses
 * (owner's own entries still win; nothing guidance-bearing changes). Amends SYNC-001's
 * preview-before-write for this one path: only right after the owner tapped SYNC GARMIN.
 */
export interface HealthSyncResult {
  /** The newest Garmin measurement in what was sent (sleep end, an hour with steps, or a resting reading). */
  newestAt: string | null;
  /** Garmin's last night, steps so far today, and the latest resting heart rate, as TODAY now reads them. */
  sleepMinutes: number | null;
  stepsToday: number | null;
  restingBpm: number | null;
  /** Garmin sleep filed as main sleep or a nap by this sync. */
  sleepFilled: number;
}

const later = (a: string | null, b: string | undefined | null) => (!b ? a : !a || b > a ? b : a);

export async function importBridgeFiles(files: readonly File[], now = Date.now()): Promise<HealthSyncResult> {
  let newestAt: string | null = null, sleepFilled = 0;
  for (const file of files) {
    if (file.size > Math.max(MAX_ACTIVITY_FILE_BYTES, MAX_SLEEP_FILE_BYTES)) throw new Error("A file from the Health Bridge is too large.");
    const raw = await file.text();
    const source = { size: file.size, text: async () => raw };
    if (raw.includes(`"${ACTIVITY_IMPORT_FORMAT}"`)) {
      const snapshot = await previewActivityImport(source);
      await importActivitySnapshot(snapshot);
      for (const h of snapshot.hours) if (h.steps !== null) newestAt = later(newestAt, h.endTime);
      for (const r of snapshot.restingHeartRate) newestAt = later(newestAt, r.time);
    } else {
      const snapshot = await previewSleepImport(source);
      const counts = await importSleepSnapshot(snapshot);
      sleepFilled += counts.logged + counts.corrected;
      for (const r of snapshot.records) newestAt = later(newestAt, r.endTime);
    }
  }
  const measured = await getMeasuredSnapshot(now);
  return {
    newestAt,
    sleepMinutes: measured.lastNight ? Math.round(sleepMinutes(measured.lastNight)) : null,
    stepsToday: measured.stepsToday.at(-1)?.total ?? null,
    restingBpm: measured.resting.at(-1)?.value ?? measured.resting.at(-2)?.value ?? null,
    sleepFilled,
  };
}
