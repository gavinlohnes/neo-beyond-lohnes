import type { Obligation } from "../domain/intent/types";
import { resolveProgrammeSlot } from "../engine/trainingProgrammeResolution";
import { formatLocalDate, isOperatorSavedSchedule } from "../engine/scheduledContext";
import { getWeekAhead, type WeekAheadDay } from "./weekAheadQueries";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import { getTrainingProgramme } from "./trainingProgramme";
import { getCustomTemplates } from "./customTemplateQueries";
import { getSchedulePattern } from "./queries";
import { getRecordedContexts, livedDayOn, resolveWorkContext } from "./workContextResolution";
import { getConfirmedExceptions } from "./scheduleExceptions";
import { readCalendarWithDay } from "./calendarWithDay";
import type { GoogleCalendarEvent } from "./googleCalendar";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";

export function plannerDates(now = new Date()): string[] {
  return Array.from({ length: 7 }, (_, n) => formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, 12)));
}
/** Calendar ends are exclusive; timed events use actual local midnights, including DST. */
export function plannerEventsOn(events: readonly GoogleCalendarEvent[], date: string): GoogleCalendarEvent[] {
  const [y, m, d] = date.split("-").map(Number);
  const from = new Date(y!, m! - 1, d!).getTime(), to = new Date(y!, m! - 1, d! + 1).getTime();
  return events.filter((event) => {
    if (event.allDay) return event.start.slice(0, 10) <= date && event.end.slice(0, 10) > date;
    const start = Date.parse(event.start), end = Date.parse(event.end);
    return Number.isFinite(start) && Number.isFinite(end) && start < to && end > from;
  }).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
}
export interface PlannerDay extends WeekAheadDay {
  tasks: Obligation[];
  events: GoogleCalendarEvent[];
  workout: { label: string; basis: "ASSIGNED" | "SUGGESTED" | "UNASSIGNED" | "UNAVAILABLE" };
}
export interface WeekPlanner {
  date: string; days: PlannerDay[]; overdue: Obligation[]; unplanned: Obligation[];
  calendar: { connected: boolean; lastSyncAt: string | null };
}

/** Existing facts composed for explicit planning, never an Engine input or a new plan store. */
export async function getWeekPlanner(now = new Date()): Promise<WeekPlanner> {
  const dates = plannerDates(now);
  const contextDates = Array.from({ length: 10 }, (_, i) => formatLocalDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i - 3, 12)));
  const [week, tasks, revision, custom, schedule, recorded, exceptions] = await Promise.all([
    getWeekAhead(now), getCurrentlyEligibleUnresolvedObligations(), getTrainingProgramme(), getCustomTemplates(),
    getSchedulePattern(), getRecordedContexts(contextDates), getConfirmedExceptions(contextDates),
  ]);
  const calendar = readCalendarWithDay();
  const context = (date: Date) => resolveWorkContext(date, schedule, recorded.get(formatLocalDate(date)), exceptions.get(formatLocalDate(date))?.kind).kind;
  const names = new Map([...Object.values(WORKOUT_TEMPLATES).map((t) => [t.id as string, `Workout ${t.id}`] as const), ...custom.map((t) => [t.id, t.name] as const)]);
  const days = week.days.map((day): PlannerDay => {
    let workout: PlannerDay["workout"];
    if (revision.programme) {
      const date = livedDayOn(day.date);
      const rotationKnown = revision.programme.mode !== "ROTATION" || (isOperatorSavedSchedule(schedule) && [0, 1, 2, 3].every((n) => context(new Date(date.getFullYear(), date.getMonth(), date.getDate() - n, 16, 30)) !== null));
      const slot = rotationKnown ? resolveProgrammeSlot(revision.programme, date, (d) => context(d)!) : null;
      const name = slot?.templateId ? names.get(slot.templateId) : undefined;
      workout = !slot ? { label: "Programme needs a known work schedule", basis: "UNAVAILABLE" }
        : slot.templateId ? { label: name ?? "Assigned template unavailable", basis: name ? "ASSIGNED" : "UNAVAILABLE" }
          : { label: "No workout assigned", basis: "UNASSIGNED" };
    } else workout = day.suggestedTemplate ? { label: `Workout ${day.suggestedTemplate}${day.afterShift ? " after shift" : ""}`, basis: "SUGGESTED" } : { label: day.basis === "UNKNOWN" ? "No workout forecast without work context" : "No workout suggested", basis: "UNASSIGNED" };
    return { ...day, workout, tasks: tasks.filter((t) => t.plannedAt === day.date || t.dueAt === day.date), events: plannerEventsOn(calendar.events, day.date) };
  });
  const overdue = tasks.filter((t) => t.dueAt !== undefined && t.dueAt < dates[0]!);
  const overdueIds = new Set(overdue.map((t) => t.id));
  return { date: dates[0]!, days, overdue,
    unplanned: tasks.filter((t) => (!t.plannedAt || t.plannedAt < dates[0]!) && !overdueIds.has(t.id)),
    calendar: { connected: calendar.connected, lastSyncAt: calendar.lastSyncAt } };
}
