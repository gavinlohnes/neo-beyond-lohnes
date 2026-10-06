import { livedDayShiftWindow } from "../engine/scheduledContext";
import { getActiveDay, getDayCount, getSchedulePattern } from "./queries";
import { getAutoBackupPreference, getDaysSinceLastBackup } from "./autoBackupQueries";

/**
 * BOOT-001 (owner brief 2026-10-05): the three status lines the cold-launch
 * boot sequence ticks in, e.g. "DAY 14 · SHIFT 1800 · BACKUP OK". Read only.
 * A value that can't be read is left out (null), never guessed.
 */
export interface BootStatus {
  /** How many BEYOND days are on record. */
  day: number | null;
  /** "SHIFT 1800", or "SHIFT OFF" on a day off. */
  shift: string | null;
  backup: "OK" | "DUE" | "OFF" | null;
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}`;
}

async function settle<T>(read: () => Promise<T> | T): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function getBootStatus(now: Date = new Date()): Promise<BootStatus> {
  // `now` places the shift line; the backup age is read as of the real clock, as TODAY reads it.
  const [day, shift, backup] = await Promise.all([
    settle(async () => {
      const count = await getDayCount();
      return count > 0 ? count : null;
    }),
    settle(async () => {
      const activeDay = await getActiveDay();
      if (activeDay?.workContext === "OFF") return "SHIFT OFF";
      const window = livedDayShiftWindow(activeDay ? new Date(activeDay.startedAt) : now, await getSchedulePattern());
      return window ? `SHIFT ${hhmm(window.start)}` : "SHIFT OFF";
    }),
    settle(() => {
      // From the backup itself, not from whether TODAY's line is showing: LATER hides the
      // line for a day but leaves an overdue backup overdue.
      const preference = getAutoBackupPreference();
      if (!preference.enabled) return "OFF" as const;
      const days = getDaysSinceLastBackup();
      return days === null || days >= preference.everyDays ? ("DUE" as const) : ("OK" as const);
    }),
  ]);
  return { day, shift, backup };
}

/** The three lines, in order; a missing value is left out. */
export function describeBootStatus(status: BootStatus): string[] {
  return [
    status.day !== null ? `DAY ${status.day}` : null,
    status.shift,
    status.backup !== null ? `BACKUP ${status.backup}` : null,
  ].filter((line): line is string => line !== null);
}
