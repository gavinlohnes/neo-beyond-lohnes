import type { SchedulePattern } from "../domain/common/types";
import { WORKOUT_TEMPLATE_ORDER, type WorkoutTemplateId } from "../domain/workout/types";
import { formatLocalDate, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";
import { suggestTemplateForNextWorkout } from "./trainQueries";
import { getUnresolvedObligations } from "./intentQueries";
import type { Obligation } from "../domain/intent/types";

/** WEEKAHEAD-001: a read-only seven-day projection. It never feeds the Engine or stores a plan. */
export interface WeekAheadDay {
  date: string;
  work: "WORK" | "OFF";
  shiftStartHour: number | null;
  suggestedTemplate: WorkoutTemplateId | null;
  /** TONIGHT-001: the suggestion sits on this work day's post-shift morning, not on a day off. */
  afterShift: boolean;
}

export interface WeekAhead {
  days: WeekAheadDay[];
}

function localNoon(date: Date, offsetDays: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays, 12);
}

function nextTemplate(template: WorkoutTemplateId): WorkoutTemplateId {
  const index = WORKOUT_TEMPLATE_ORDER.indexOf(template);
  return WORKOUT_TEMPLATE_ORDER[(index + 1) % WORKOUT_TEMPLATE_ORDER.length] ?? WORKOUT_TEMPLATE_ORDER[0]!;
}

/**
 * Pure projection used by tests and the application query. Days off are training days, and
 * so is the morning after the last shift of a work block (TONIGHT-001, owner ruling
 * 2026-10-19, amending rule A's "none on a work day"); other work days rest. Every third
 * eligible day in a row is left unsuggested so the projection never prescribes more than two
 * workout days in a row. The A → B → C sequence advances only when a workout is actually
 * suggested.
 */
export function deriveWeekAhead(
  now: Date,
  pattern: SchedulePattern,
  firstTemplate: WorkoutTemplateId,
): WeekAhead {
  const days: WeekAheadDay[] = [];
  let consecutiveSuggestions = 0;
  let template = WORKOUT_TEMPLATE_ORDER.includes(firstTemplate) ? firstTemplate : WORKOUT_TEMPLATE_ORDER[0]!;

  const workFor = (offset: number) => {
    const date = localNoon(now, offset);
    return scheduledWorkContextForLivedDay(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17), pattern);
  };

  for (let offset = 0; offset < 7; offset++) {
    const date = localNoon(now, offset);
    const work = workFor(offset);
    const afterLastShift = work === "WORK" && workFor(offset + 1) === "OFF";
    const shouldSuggest = (work === "OFF" || afterLastShift) && consecutiveSuggestions < 2;
    days.push({
      date: formatLocalDate(date),
      work,
      shiftStartHour: work === "WORK" ? pattern.shiftStartHour : null,
      suggestedTemplate: shouldSuggest ? template : null,
      afterShift: shouldSuggest && work === "WORK",
    });

    if (shouldSuggest) {
      consecutiveSuggestions += 1;
      template = nextTemplate(template);
    } else {
      consecutiveSuggestions = 0;
    }
  }

  return { days };
}

export async function getWeekAhead(now: Date = new Date()): Promise<WeekAhead> {
  const [pattern, firstTemplate] = await Promise.all([
    getSchedulePattern(),
    suggestTemplateForNextWorkout(),
  ]);
  return deriveWeekAhead(now, pattern, firstTemplate);
}

/**
 * WEEK-PLAN-001 (owner go 2026-11-01, "We will do plan my week"): the open commitments that land on
 * each of the next seven days, by their own planned or due date. Read-only; it never schedules,
 * ranks or moves anything, and an undated commitment simply isn't on any day.
 */
export interface WeekTasksDay { date: string; planned: Obligation[]; due: Obligation[] }

export function deriveWeekTasks(dates: string[], open: Obligation[]): WeekTasksDay[] {
  return dates.map((date) => ({
    date,
    planned: open.filter((o) => o.plannedAt === date),
    due: open.filter((o) => o.dueAt === date && o.plannedAt !== date),
  }));
}

export async function getWeekTasks(now: Date = new Date()): Promise<WeekTasksDay[]> {
  const dates = Array.from({ length: 7 }, (_, i) => formatLocalDate(localNoon(now, i)));
  return deriveWeekTasks(dates, await getUnresolvedObligations());
}
