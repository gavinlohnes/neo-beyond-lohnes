import { db } from "../persistence/db";
import { habitAnswerOf, projectHabitAnswers, type Habit } from "../domain/habits";
import { getActiveDay, getSchedulePattern } from "./queries";
import { formatLocalDate } from "../engine/scheduledContext";
import { getConfirmedExceptions } from "./scheduleExceptions";
import { getRecordedContexts, resolveWorkContext } from "./workContextResolution";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";

const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const mondayOf = (date: Date) => { const copy = new Date(date); copy.setHours(12, 0, 0, 0); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; };

export function habitApplies(habit: Habit, date: Date, scheduledWork: boolean) {
  if (habit.schedule.kind === "ANY_DAY") return true;
  if (habit.schedule.kind === "WORK_DAYS") return scheduledWork;
  if (habit.schedule.kind === "DAYS_OFF") return !scheduledWork;
  return (habit.schedule.weekdays ?? []).includes(date.getDay());
}

/** Read-only, local-calendar lived days: missing days are shown without inventing day records. */
async function readHabitCalendar(now: Date, count: 1 | 28) {
  const [habits, activeDay, schedule, days, events] = await Promise.all([
    getActiveHabits(), getActiveDay(), getSchedulePattern(), db.beyondDays.toArray(),
    db.events.where("type").equals("HABIT_SET").toArray(),
  ]);
  const today = mostRecentBoundaryAtOrBefore(now);
  const starts = Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
  const dates = starts.map(formatLocalDate);
  const [recorded, confirmed] = await Promise.all([getRecordedContexts(dates), getConfirmedExceptions(dates)]);
  const windows = starts.map((from) => {
    const to = addDays(from, 1), date = formatLocalDate(from);
    const records = days.filter((d) => new Date(d.startedAt) >= from && new Date(d.startedAt) < to && new Date(d.startedAt) <= now)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
    const current = records.find((d) => d.id === activeDay?.id) ?? records.at(-1);
    const ids = new Set(records.map((d) => d.id));
    const resolved = resolveWorkContext(from, schedule, recorded.get(date), confirmed.get(date)?.kind);
    const context = resolved.kind ?? "UNKNOWN";
    const scopedEvents = events.filter((e) => typeof e.beyondDayId === "string" && ids.has(e.beyondDayId)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || (a.seq ?? 0) - (b.seq ?? 0));
    const answerDays = new Map<string, string>();
    for (const event of scopedEvents) {
      const p = habitAnswerOf(event.payload);
      if (p && event.beyondDayId) answerDays.set(p.habitId, event.beyondDayId);
    }
    return {
      answerDays,
      from: from.toISOString(), to: to.toISOString(), date: formatLocalDate(from), dayId: current?.id ?? null,
      work: context, workBasis: resolved.basis, workPlanned: resolved.basis === "PREDICTED",
      answers: projectHabitAnswers(scopedEvents),
    };
  });
  const weekStart = mondayOf(today);
  const applies = (habit: Habit, window: typeof windows[number]) => {
    if ((habit.schedule.kind === "WORK_DAYS" || habit.schedule.kind === "DAYS_OFF") && window.work === "UNKNOWN") return false;
    return habitApplies(habit, new Date(window.from), window.work === "WORK");
  };
  const current = windows.at(-1)!;
  return {
    dayId: current.dayId === activeDay?.id ? current.dayId : null,
    date: formatLocalDate(today), from: today.toISOString(), nextBoundary: addDays(today, 1).getTime(),
    habits: habits.map((habit) => {
      const history = windows.map(({ answers, answerDays, ...window }) => ({
        ...window, dayId: answerDays.get(habit.id) ?? window.dayId,
        answer: answers.get(habit.id) ?? "UNRECORDED" as const,
        applies: applies(habit, { ...window, answers, answerDays }),
      }));
      const answer = history.at(-1)!.answer;
      return {
        habit, answer, done: answer === "DONE", applies: history.at(-1)!.applies, history,
        thisWeek: history.filter((d) => new Date(d.from) >= weekStart && d.answer === "DONE").length,
        fourWeeks: history.filter((d) => d.answer === "DONE").length,
      };
    }),
  };
}

/** Full history is requested only by the habits workspace, never by a dashboard chip. */
export function getHabitWorkspace(now = new Date()) {
  return readHabitCalendar(now, 28);
}

/** DATA needs today's answers only: do not hold Garmin readings behind 28 days of history lookups. */
export async function getHabitToday(now = new Date()) {
  const current = await readHabitCalendar(now, 1);
  return current.habits.map(({ habit, answer, done, applies }) => ({ habit, answer, done, applies }));
}

/** Oldest first; habits created in the same millisecond keep a fixed order (name, then id), not the store's. */
export async function getActiveHabits(): Promise<Habit[]> {
  const list = await db.habits.where("status").equals("ACTIVE").toArray();
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
