import type { SchedulePattern } from "../domain/common/types";
import { WORKOUT_TEMPLATE_ORDER, type WorkoutTemplateId } from "../domain/workout/types";
import { formatLocalDate, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";
import { suggestTemplateForNextWorkout } from "./trainQueries";

/** WEEKAHEAD-001: a read-only seven-day projection. It never feeds the Engine or stores a plan. */
export interface WeekAheadDay {
  date: string;
  work: "WORK" | "OFF";
  shiftStartHour: number | null;
  suggestedTemplate: WorkoutTemplateId | null;
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
 * Pure projection used by tests and the application query. Work days are always rest days.
 * During a longer off stretch, every third day is left unsuggested so the projection never
 * prescribes more than two workout days in a row. The A → B → C sequence advances only when a
 * workout is actually suggested.
 */
export function deriveWeekAhead(
  now: Date,
  pattern: SchedulePattern,
  firstTemplate: WorkoutTemplateId,
): WeekAhead {
  const days: WeekAheadDay[] = [];
  let consecutiveSuggestions = 0;
  let template = WORKOUT_TEMPLATE_ORDER.includes(firstTemplate) ? firstTemplate : WORKOUT_TEMPLATE_ORDER[0]!;

  for (let offset = 0; offset < 7; offset++) {
    const date = localNoon(now, offset);
    const work = scheduledWorkContextForLivedDay(
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17),
      pattern,
    );
    const shouldSuggest = work === "OFF" && consecutiveSuggestions < 2;
    days.push({
      date: formatLocalDate(date),
      work,
      shiftStartHour: work === "WORK" ? pattern.shiftStartHour : null,
      suggestedTemplate: shouldSuggest ? template : null,
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
