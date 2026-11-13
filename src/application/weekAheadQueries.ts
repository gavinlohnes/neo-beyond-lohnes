import type { SchedulePattern } from "../domain/common/types";
import { getRecordedContexts, livedDayOn, resolveWorkContext, type RecordedContext } from "./workContextResolution";
import { getConfirmedExceptions } from "./scheduleExceptions";
import { WORKOUT_TEMPLATE_ORDER, type WorkoutTemplateId } from "../domain/workout/types";
import { formatLocalDate, isOperatorSavedSchedule } from "../engine/scheduledContext";
import { getSchedulePattern } from "./queries";
import { suggestTemplateForNextWorkout } from "./trainQueries";
import { getCurrentlyEligibleUnresolvedObligations } from "./intentQueries";
import type { Obligation } from "../domain/intent/types";

/** WEEKAHEAD-001: a read-only seven-day projection. It never feeds the Engine or stores a plan. */
export interface WeekAheadDay {
  date: string;
  /** When `basis` is UNKNOWN this is "OFF" only as a placeholder: read `basis` before `work`. */
  work: "WORK" | "OFF";
  /**
   * CONTEXT-INTEGRATION-001: where `work` comes from. RECORDED (this lived day has a record), CONFIRMED (a schedule
   * change the operator confirmed, SCHEDULE-EXCEPTIONS-001), PREDICTED (the saved
   * rotation), WHAT_IF (a hypothetical from Shift What-If, never saved) or UNKNOWN (no record and no saved schedule).
   */
  basis: "RECORDED" | "CONFIRMED" | "PREDICTED" | "WHAT_IF" | "UNKNOWN";
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
  /** SHIFT-WHAT-IF: hypothetical WORK/OFF for some dates (yyyy-mm-dd). Read only; never saved or sent to the Engine. */
  overrides: Readonly<Record<string, "WORK" | "OFF">> = {},
  /** CONTEXT-INTEGRATION-001: what was recorded for lived days that have started, by date. Recorded wins over the rotation. */
  recorded: ReadonlyMap<string, RecordedContext> = new Map(),
  /** SCHEDULE-EXCEPTIONS-001: confirmed changes by date; they beat the rotation, never a record. */
  confirmed: ReadonlyMap<string, "WORK" | "OFF"> = new Map(),
): WeekAhead {
  const days: WeekAheadDay[] = [];
  let consecutiveSuggestions = 0;
  let template = WORKOUT_TEMPLATE_ORDER.includes(firstTemplate) ? firstTemplate : WORKOUT_TEMPLATE_ORDER[0]!;

  const resolve = (offset: number): { work: "WORK" | "OFF" | null; basis: WeekAheadDay["basis"] } => {
    const date = formatLocalDate(localNoon(now, offset));
    const override = overrides[date];
    if (override) return { work: override, basis: "WHAT_IF" };
    const resolved = resolveWorkContext(livedDayOn(date), pattern, recorded.get(date), confirmed.get(date));
    return { work: resolved.kind, basis: resolved.basis };
  };

  for (let offset = 0; offset < 7; offset++) {
    const date = localNoon(now, offset);
    const { work: known, basis } = resolve(offset);
    // An unknown day suggests nothing and breaks a run of suggestions.
    const work = known ?? "OFF";
    const afterLastShift = known === "WORK" && resolve(offset + 1).work === "OFF";
    const shouldSuggest = known !== null && (known === "OFF" || afterLastShift) && consecutiveSuggestions < 2;
    days.push({
      date: formatLocalDate(date),
      work,
      basis,
      // The start time is the saved schedule's; with none saved, a recorded work day has no known start time.
      shiftStartHour: known === "WORK" && isOperatorSavedSchedule(pattern) ? pattern.shiftStartHour : null,
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
  const dates = Array.from({ length: 7 }, (_, k) => formatLocalDate(localNoon(now, k)));
  const [pattern, firstTemplate, recorded, exceptions] = await Promise.all([
    getSchedulePattern(),
    suggestTemplateForNextWorkout(),
    getRecordedContexts([...dates, formatLocalDate(localNoon(now, 7))]),
    getConfirmedExceptions([...dates, formatLocalDate(localNoon(now, 7))]),
  ]);
  return deriveWeekAhead(now, pattern, firstTemplate, {}, recorded, new Map([...exceptions].map(([date, e]) => [date, e.kind] as const)));
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
  // Review of #365: a current-attention view, so it follows the locked Intent Lifecycle Integrity rule
  // (tasks under an archived or missing Mission don't appear), the same projection Plan Today uses.
  return deriveWeekTasks(dates, await getCurrentlyEligibleUnresolvedObligations());
}
