import { getDaysSinceLastBackup } from "./autoBackupQueries";
import { getDriveBackupState, type DriveBackupState } from "./driveBackup/driveBackupService";
import { readGoogleCalendarConnection } from "./googleCalendar";
import { getMeasuredSnapshot } from "./measuredQueries";

/**
 * MORE-HOME-001: the few "how is this doing" facts MORE's top shows, each from the place that already
 * owns it. Read only. A fact that can't be read is null and shows as unknown, never as fine.
 */
export interface SystemsOverview {
  backup: { drive: DriveBackupState; daysSinceLastBackup: number | null };
  /** When the newest Garmin export BEYOND imported was made; null when none, undefined when unreadable. */
  garminAsOf: number | null | undefined;
  calendar: { connected: boolean; lastSyncAt: string | null };
}

export async function getSystemsOverview(): Promise<SystemsOverview> {
  const calendar = readGoogleCalendarConnection();
  let garminAsOf: number | null | undefined;
  try { garminAsOf = (await getMeasuredSnapshot()).garminAsOf; } catch { garminAsOf = undefined; }
  return {
    backup: { drive: getDriveBackupState(), daysSinceLastBackup: getDaysSinceLastBackup() },
    garminAsOf,
    calendar: { connected: Boolean(calendar.calendarId), lastSyncAt: calendar.lastSyncAt },
  };
}
