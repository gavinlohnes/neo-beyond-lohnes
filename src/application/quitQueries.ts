import { db } from "../persistence/db";
import { parseQuitHabit } from "../persistence/quitHabitValidation";
import type { QuitHabit, UrgeLoggedPayload, UrgeTrigger, UrgeUndonePayload } from "../domain/common/types";

/** Drop 6: the habit settings row, or undefined when none is set up (or the stored row is malformed). */
export async function getQuitHabit(): Promise<QuitHabit | undefined> {
  const raw = await db.quitHabits.get("current");
  return raw ? (parseQuitHabit(raw) ?? undefined) : undefined;
}

export interface UrgeEntry {
  eventId: string;
  trigger: UrgeTrigger;
  recordedAt: string;
}

export interface QuitSummary {
  habit: QuitHabit;
  cleanToday: boolean;
  cleanThisMonth: number;
  cleanTotal: number;
  /** Undefined when no daily cost is set. */
  savedThisMonthUsd?: number;
  savedTotalUsd?: number;
  urgesToday: UrgeEntry[];
}

/**
 * Drop 6: everything the tracker shows, derived from events. "This month"
 * is the calendar month (device local time) of each clean day's BeyondDay
 * start, so a night shift that crosses midnight counts once, on the day it
 * began. Counts only ever go up within a month — there is no streak to
 * reset, and a day nobody marked simply isn't counted.
 */
export async function getQuitSummary(activeDayId: string | undefined, now: Date = new Date()): Promise<QuitSummary | undefined> {
  const habit = await getQuitHabit();
  if (!habit) return undefined;

  const cleanEvents = await db.events.where("type").equals("CLEAN_DAY_LOGGED").toArray();
  const cleanDayIds = [...new Set(cleanEvents.flatMap((e) => (e.beyondDayId ? [e.beyondDayId] : [])))];
  const days = await db.beyondDays.bulkGet(cleanDayIds);
  const inThisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const cleanThisMonth = days.filter((d) => d && inThisMonth(d.startedAt)).length;
  const cleanTotal = cleanDayIds.length;

  let urgesToday: UrgeEntry[] = [];
  if (activeDayId) {
    const dayEvents = await db.events.where("beyondDayId").equals(activeDayId).toArray();
    const undone = new Set(
      dayEvents.filter((e) => e.type === "URGE_UNDONE").map((e) => (e.payload as UrgeUndonePayload).urgeEventId),
    );
    urgesToday = dayEvents
      .filter((e) => e.type === "URGE_LOGGED" && !undone.has(e.id))
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map((e) => ({ eventId: e.id, trigger: (e.payload as UrgeLoggedPayload).trigger, recordedAt: e.recordedAt }));
  }

  const cost = habit.dailyCostUsd;
  return {
    habit,
    cleanToday: activeDayId !== undefined && cleanDayIds.includes(activeDayId),
    cleanThisMonth,
    cleanTotal,
    ...(cost !== undefined ? { savedThisMonthUsd: cost * cleanThisMonth, savedTotalUsd: cost * cleanTotal } : {}),
    urgesToday,
  };
}
