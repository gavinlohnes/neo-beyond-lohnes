import { getDaysSinceLastBackup, shareBackup } from "../persistence/backup";
import { previewAnyRestore } from "../persistence/restore";
import {
  AUTO_BACKUP_INTERVALS,
  clearAutoBackupSnooze,
  countLiveRows,
  getAutoBackupPreference,
  getAutoBackupSnoozedUntil,
  getLastRestoreCheckAt,
  recordRestoreCheck,
  setAutoBackupPreference,
  setAutoBackupSnoozedUntil,
  type AutoBackupPreference,
} from "../persistence/autoBackup";

/**
 * BACKUP-AUTO-001 (owner brief 2026-10-04, decision 2A): the one
 * application-layer seam for automatic backup. UI never imports
 * persistence/autoBackup.ts directly. "Automatic" means due on open: when
 * the setting is on and a backup is due, TODAY shows one line whose BACK UP
 * NOW hands the existing backup file to the share sheet. The monthly
 * restore check reads a chosen backup file and compares its row counts
 * with this device's, writing nothing to the database.
 */
export {
  AUTO_BACKUP_INTERVALS,
  getAutoBackupPreference,
  getDaysSinceLastBackup,
  type AutoBackupPreference,
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const RESTORE_CHECK_EVERY_DAYS = 30;

export type BackupPrompt =
  | { kind: "BACKUP_DUE"; daysSinceLastBackup: number | null }
  | { kind: "RESTORE_CHECK_DUE" }
  | null;

interface PromptInputs {
  preference: AutoBackupPreference;
  daysSinceLastBackup: number | null;
  snoozedUntil: number | null;
  lastRestoreCheckAt: number | null;
  now: number;
}

/**
 * Pure: which line, if any, TODAY shows. Nothing unless the setting is on.
 * A backup never made counts as due. LATER hides the line until the snooze
 * ends; a due backup outranks the restore check, which is due once a
 * month and only after at least one backup exists to check.
 */
export function decideBackupPrompt(inputs: PromptInputs): BackupPrompt {
  const { preference, daysSinceLastBackup, snoozedUntil, lastRestoreCheckAt, now } = inputs;
  if (!preference.enabled) return null;
  if (snoozedUntil !== null && now < snoozedUntil) return null;
  if (daysSinceLastBackup === null || daysSinceLastBackup >= preference.everyDays) {
    return { kind: "BACKUP_DUE", daysSinceLastBackup };
  }
  if (lastRestoreCheckAt === null || now - lastRestoreCheckAt >= RESTORE_CHECK_EVERY_DAYS * DAY_MS) {
    return { kind: "RESTORE_CHECK_DUE" };
  }
  return null;
}

export function getBackupPrompt(now: Date = new Date()): BackupPrompt {
  return decideBackupPrompt({
    preference: getAutoBackupPreference(),
    daysSinceLastBackup: getDaysSinceLastBackup(),
    snoozedUntil: getAutoBackupSnoozedUntil(),
    lastRestoreCheckAt: getLastRestoreCheckAt(),
    now: now.getTime(),
  });
}

/**
 * Saves the setting and clears any snooze. Turning it on starts the
 * monthly restore-check clock, so the first check is asked a month later,
 * not straight after the first backup.
 */
export function setAutoBackupPreferenceAndReset(preference: AutoBackupPreference, now: Date = new Date()): void {
  setAutoBackupPreference(preference);
  clearAutoBackupSnooze();
  if (preference.enabled && getLastRestoreCheckAt() === null) recordRestoreCheck(now);
}

/** LATER: hide the line for a day. */
export function snoozeBackupPrompt(now: Date = new Date()): void {
  setAutoBackupSnoozedUntil(new Date(now.getTime() + DAY_MS));
}

/** BACK UP NOW: the existing share-sheet backup (download fallback on desktop). */
export async function backUpNow(): Promise<{ shared: boolean }> {
  const result = await shareBackup();
  clearAutoBackupSnooze();
  return result;
}

export interface TableCountDifference {
  name: string;
  inBackup: number;
  onDevice: number;
}

export type RestoreCheckResult =
  | { kind: "MATCH"; totalRows: number }
  | { kind: "DIFFERENT"; totalRows: number; differences: TableCountDifference[] }
  | { kind: "OLD_FORMAT" };

/** Pure: compare a backup's per-table row counts with this device's. */
export function compareTableCounts(
  backup: { name: string; rowCount: number }[],
  live: { name: string; rowCount: number }[],
): RestoreCheckResult {
  const liveByName = new Map(live.map((t) => [t.name, t.rowCount]));
  const backupByName = new Map(backup.map((t) => [t.name, t.rowCount]));
  const names = [...new Set([...backupByName.keys(), ...liveByName.keys()])].sort();
  const differences: TableCountDifference[] = [];
  for (const name of names) {
    const inBackup = backupByName.get(name) ?? 0;
    const onDevice = liveByName.get(name) ?? 0;
    if (inBackup !== onDevice) differences.push({ name, inBackup, onDevice });
  }
  const totalRows = backup.reduce((sum, t) => sum + t.rowCount, 0);
  return differences.length === 0 ? { kind: "MATCH", totalRows } : { kind: "DIFFERENT", totalRows, differences };
}

/**
 * The monthly restore check. Reads the file through the same preview the
 * real restore uses (validation only, no write) and counts this device's
 * rows (read-only). Records the check so the monthly line clears. Throws
 * the preview's own INVALID_BACKUP_FILE error for an unreadable file.
 */
export async function checkBackupFile(file: File, now: Date = new Date()): Promise<RestoreCheckResult> {
  const preview = await previewAnyRestore(file);
  recordRestoreCheck(now);
  if (preview.format === "LEGACY") return { kind: "OLD_FORMAT" };
  return compareTableCounts(preview.tables, await countLiveRows());
}
