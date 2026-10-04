import { db } from "./db";

/**
 * BACKUP-AUTO-001 (owner brief 2026-10-04, decision 2A): automatic backup
 * as "due on open" + the existing share sheet, with a monthly restore
 * check. A web app can't run on a timer while closed, so nothing here
 * schedules anything: these are the on-device settings and timestamps the
 * on-open check reads. Same treatment as backup.ts's last-backup time and
 * checkInReminder.ts: operational bookkeeping in localStorage, not domain
 * history, so no schema change and nothing in the backup file changes.
 */
export interface AutoBackupPreference {
  enabled: boolean;
  /** A backup is due once this many days have passed since the last one. */
  everyDays: number;
}

export const AUTO_BACKUP_INTERVALS = [1, 3, 7, 14, 30] as const;
export const DEFAULT_AUTO_BACKUP_DAYS = 7;

const PREFERENCE_KEY = "beyond:autoBackupPreference";
const SNOOZED_UNTIL_KEY = "beyond:autoBackupSnoozedUntil";
const LAST_RESTORE_CHECK_KEY = "beyond:lastRestoreCheckAt";

const DEFAULT_PREFERENCE: AutoBackupPreference = { enabled: false, everyDays: DEFAULT_AUTO_BACKUP_DAYS };

/** Never throws on missing or malformed stored data: falls back to off. */
export function getAutoBackupPreference(): AutoBackupPreference {
  const raw = localStorage.getItem(PREFERENCE_KEY);
  if (!raw) return DEFAULT_PREFERENCE;
  try {
    const parsed = JSON.parse(raw) as Partial<AutoBackupPreference>;
    const everyDays = (AUTO_BACKUP_INTERVALS as readonly number[]).includes(parsed.everyDays as number)
      ? (parsed.everyDays as number)
      : DEFAULT_AUTO_BACKUP_DAYS;
    return { enabled: parsed.enabled === true, everyDays };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function setAutoBackupPreference(preference: AutoBackupPreference): void {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preference));
}

function readTime(key: string): number | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

export function getAutoBackupSnoozedUntil(): number | null {
  return readTime(SNOOZED_UNTIL_KEY);
}

export function setAutoBackupSnoozedUntil(until: Date): void {
  localStorage.setItem(SNOOZED_UNTIL_KEY, until.toISOString());
}

export function clearAutoBackupSnooze(): void {
  localStorage.removeItem(SNOOZED_UNTIL_KEY);
}

export function getLastRestoreCheckAt(): number | null {
  return readTime(LAST_RESTORE_CHECK_KEY);
}

export function recordRestoreCheck(at: Date): void {
  localStorage.setItem(LAST_RESTORE_CHECK_KEY, at.toISOString());
}

/** Read-only: each table's live row count, for the restore check. */
export async function countLiveRows(): Promise<{ name: string; rowCount: number }[]> {
  return Promise.all(db.tables.map(async (table) => ({ name: table.name, rowCount: await table.count() })));
}
