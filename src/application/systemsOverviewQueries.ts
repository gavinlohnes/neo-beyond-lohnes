import { getDaysSinceLastBackup } from "./autoBackupQueries";
import { getDriveBackupState, type DriveBackupState } from "./driveBackup/driveBackupService";
import { readGoogleCalendarConnection } from "./googleCalendar";
import { getMeasuredSnapshot } from "./measuredQueries";
import { getSchedulePattern } from "./queries";
import { isOperatorSavedSchedule } from "../engine/scheduledContext";

/**
 * MORE-HOME-001: the few "how is this doing" facts MORE's top shows, each from the place that already
 * owns it. Read only. A fact that can't be read is null and shows as unknown, never as fine.
 */
export interface SystemsOverview {
  backup: { drive: DriveBackupState; daysSinceLastBackup: number | null };
  /** When the newest Garmin export BEYOND imported was made; null when none, undefined when unreadable. */
  garminAsOf: number | null | undefined;
  calendar: { connected: boolean; lastSyncAt: string | null };
  /** Whether you saved your own work schedule; undefined when it couldn't be read. */
  scheduleSaved: boolean | undefined;
}

export async function getSystemsOverview(): Promise<SystemsOverview> {
  const calendar = readGoogleCalendarConnection();
  let garminAsOf: number | null | undefined;
  try { garminAsOf = (await getMeasuredSnapshot()).garminAsOf; } catch { garminAsOf = undefined; }
  let scheduleSaved: boolean | undefined;
  try { scheduleSaved = isOperatorSavedSchedule(await getSchedulePattern()); } catch { scheduleSaved = undefined; }
  return {
    scheduleSaved,
    backup: { drive: getDriveBackupState(), daysSinceLastBackup: getDaysSinceLastBackup() },
    garminAsOf,
    calendar: { connected: Boolean(calendar.calendarId), lastSyncAt: calendar.lastSyncAt },
  };
}
