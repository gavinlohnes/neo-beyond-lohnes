import { livedDayShiftWindow } from "../engine/scheduledContext";
import { getActiveDay, getDayCount, getSchedulePattern } from "./queries";
import { getAutoBackupPreference, getDaysSinceLastBackup } from "./autoBackupQueries";
import { getFoodDiary } from "./foodDiaryQueries";
import { getLastMainSleep } from "./systemStatus";

/**
 * BOOT-001 (owner brief 2026-10-05): the three status lines the cold-launch
 * boot sequence ticks in, e.g. "DAY 14 · SHIFT 1800 · BACKUP OK". Read only.
 * A value that can't be read is left out (null), never guessed.
 *
 * BOOT-BRIEF-001 (owner choice 2026-10-30, option A: "this splash … goes too quickly I can't read
 * it"): the lines are now a startup brief — where the shift stands, last main sleep, protein so
 * far — and the screen holds long enough to read them (BootSequence).
 */
export interface BootStatus {
  /** How many BEYOND days are on record. */
  day: number | null;
  /** "SHIFT 1800" before it, "SHIFT ENDS 0600" during it, "SHIFT DONE" after, "SHIFT OFF" on a day off. */
  shift: string | null;
  backup: "OK" | "DUE" | "OFF" | null;
  /** BOOT-BRIEF-001: the last main sleep in minutes (logged or filed from Garmin), or "NONE" when there is none recent. */
  sleep?: number | "NONE" | null;
  /** BOOT-BRIEF-001: protein so far on the active day, and the target when a weigh-in sets one. */
  protein?: { g: number; target: number | null } | null;
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
  const activeDayRead = settle(() => getActiveDay());
  const [day, shift, backup, sleep, protein] = await Promise.all([
    settle(async () => {
      const count = await getDayCount();
      return count > 0 ? count : null;
    }),
    settle(async () => {
      const activeDay = await activeDayRead;
      if (activeDay?.workContext === "OFF") return "SHIFT OFF";
      const window = livedDayShiftWindow(activeDay ? new Date(activeDay.startedAt) : now, await getSchedulePattern());
      if (!window) return "SHIFT OFF";
      if (now < window.start) return `SHIFT ${hhmm(window.start)}`;
      return now < window.end ? `SHIFT ENDS ${hhmm(window.end)}` : "SHIFT DONE";
    }),
    settle(() => {
      // From the backup itself, not from whether TODAY's line is showing: LATER hides the
      // line for a day but leaves an overdue backup overdue.
      const preference = getAutoBackupPreference();
      if (!preference.enabled) return "OFF" as const;
      const days = getDaysSinceLastBackup();
      return days === null || days >= preference.everyDays ? ("DUE" as const) : ("OK" as const);
    }),
    settle(async () => {
      const activeDay = await activeDayRead;
      if (!activeDay) return null;
      return (await getLastMainSleep(activeDay.id, now))?.minutes ?? ("NONE" as const);
    }),
    settle(async () => {
      const activeDay = await activeDayRead;
      if (!activeDay) return null;
      const diary = await getFoodDiary(activeDay.id);
      return { g: Math.round(diary.proteinG), target: diary.proteinTargetG === undefined ? null : Math.round(diary.proteinTargetG) };
    }),
  ]);
  return { day, shift, backup, sleep, protein };
}

/**
 * BOOT-BRIEF-001: the brief, in order: shift, sleep, protein, then the backup only when it needs you
 * (DUE or OFF). A missing value is left out. The day count left the brief: it told nothing.
 */
export function describeBootStatus(status: BootStatus): string[] {
  const sleep = status.sleep === undefined || status.sleep === null ? null
    : status.sleep === "NONE" ? "SLEEP NOT LOGGED" : `SLEEP ${Math.floor(status.sleep / 60)}:${String(Math.round(status.sleep % 60)).padStart(2, "0")}`;
  const protein = status.protein ? `PROTEIN ${status.protein.g}${status.protein.target !== null ? ` / ${status.protein.target}` : ""} G` : null;
  return [
    status.shift,
    sleep,
    protein,
    status.backup === "DUE" || status.backup === "OFF" ? `BACKUP ${status.backup}` : null,
  ].filter((line): line is string => line !== null);
}
