import { db } from "../persistence/db";
import type { Habit } from "../domain/habits";
import { getActiveDay, getSchedulePattern } from "./queries";
import { getHabitDone } from "./habitCommands";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";

const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const mondayOf = (date: Date) => { const copy = new Date(date); copy.setHours(12, 0, 0, 0); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; };

export function habitApplies(habit: Habit, date: Date, scheduledWork: boolean) {
  if (habit.schedule.kind === "ANY_DAY") return true;
  if (habit.schedule.kind === "WORK_DAYS") return scheduledWork;
  if (habit.schedule.kind === "DAYS_OFF") return !scheduledWork;
  return (habit.schedule.weekdays ?? []).includes(date.getDay());
}

export async function getHabitWorkspace(now = new Date()) {
  const [habits, day, schedule, days, events] = await Promise.all([
    // Oldest first; two habits created in the same millisecond keep a fixed order (name, then id), not the store's.
    getActiveHabits(),
    getActiveDay(), getSchedulePattern(), db.beyondDays.toArray(),
    db.events.where("type").equals("HABIT_SET").toArray(),
  ]);
  const today = day ? new Date(day.startedAt) : now;
  const todayKey = day?.id;
  const doneToday = todayKey ? await getHabitDone(todayKey) : new Set<string>();
  const finalByDayHabit = new Map<string, boolean>();
  for (const event of events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0))) {
    const p = event.payload as { habitId?: unknown; done?: unknown };
    if (typeof p.habitId === "string" && typeof p.done === "boolean") finalByDayHabit.set(`${event.beyondDayId}:${p.habitId}`, p.done);
  }
  const weekStart = mondayOf(today), fourWeekStart = addDays(weekStart, -21);
  const dayById = new Map(days.map((record) => [record.id, record]));
  const count = (habitId: string, from: Date) => [...finalByDayHabit].filter(([key, done]) => {
    if (!done || !key.endsWith(`:${habitId}`)) return false;
    const record = dayById.get(key.slice(0, key.lastIndexOf(":")));
    return !!record && new Date(record.startedAt) >= from;
  }).length;
  const saved = isOperatorSavedSchedule(schedule);
  const scheduled = saved ? scheduledWorkContextForLivedDay(today, schedule) === "WORK" : day?.workContext === "WORK";
  return {
    dayId: todayKey ?? null,
    habits: habits.map((habit) => ({ habit, done: doneToday.has(habit.id), applies: habitApplies(habit, today, scheduled), thisWeek: count(habit.id, weekStart), fourWeeks: count(habit.id, fourWeekStart) })),
    date: formatLocalDate(today),
  };
}

/** Oldest first; habits created in the same millisecond keep a fixed order (name, then id), not the store's. */
export async function getActiveHabits(): Promise<Habit[]> {
  const list = await db.habits.where("status").equals("ACTIVE").toArray();
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
