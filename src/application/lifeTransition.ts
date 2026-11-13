import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { livedDayStartOf } from "./reflect";
import { db } from "../persistence/db";
import { deriveLifeState, type DayKind, type LifeState, type LifeStateInput, type LifeStateReading } from "./lifeState";

/**
 * LIFE-STATE-002 (Life-State Engine, slice 2; Gavin, 2026-11-13): the moments between states, made visible on the day
 * they happen. Yesterday's state is derived with slice 1's own rule (from the day before it, itself and today), so a
 * moment is only named when both sides are known:
 *
 *   RUN_STARTS   today is a work run and yesterday wasn't: the first shift.
 *   LAST_SHIFT   today is a work run and tomorrow is off: the run ends after this shift.
 *   RUN_OVER     today is recovery: the run is over and recovery begins. One optional follow-up, a light-day plan item.
 *   FLIP_BEGINS  today is a flip: back on shift tomorrow.
 *   FREE_AGAIN   today is free and yesterday was recovery.
 *
 * Read only. The follow-up is written only through the caller's confirmed plan-item path; never an Engine input.
 */
export const LIGHT_DAY_TITLE = "Keep today light";
export type LifeMoment = "RUN_STARTS" | "LAST_SHIFT" | "RUN_OVER" | "FLIP_BEGINS" | "FREE_AGAIN";
export interface LifeFollowUp { title: string; description: string }
export interface LifeMomentReading { moment: LifeMoment; label: string; line: string; followUp: LifeFollowUp | null }

export interface LifeMomentInput {
  state: LifeStateInput;
  /** The lived day before yesterday: recorded, else scheduled. */
  dayBefore: { recorded: DayKind | null; scheduled: DayKind | null };
  /** The saved shift start hour, for the flip's "next shift" line. */
  shiftStartHour: number | null;
}

const said = (side: { recorded: DayKind | null; scheduled: DayKind | null }) => side.recorded ?? side.scheduled;
const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Yesterday's state by slice 1's rule: yesterday as "today", the day before it as "yesterday", today as "tomorrow". */
export function yesterdaysState(input: LifeMomentInput): LifeState | null {
  const today = said(input.state.today);
  return deriveLifeState({ today: input.state.yesterday, yesterday: input.dayBefore, tomorrow: { scheduled: today, date: input.state.tomorrow.date }, run: null })?.state ?? null;
}

export function deriveLifeMoment(input: LifeMomentInput, today: LifeStateReading | null): LifeMomentReading | null {
  if (!today) return null;
  const before = yesterdaysState(input), tomorrow = input.state.tomorrow.scheduled;
  if (today.state === "WORK_RUN") {
    if (before !== null && before !== "WORK_RUN") {
      return { moment: "RUN_STARTS", label: "RUN STARTS", followUp: null,
        line: tomorrow === "OFF" ? "A one-shift run: it starts and ends today. Recovery starts tomorrow." : "Today is the first shift of the run." };
    }
    if (before === "WORK_RUN" && tomorrow === "OFF") return { moment: "LAST_SHIFT", label: "LAST SHIFT", line: "The last shift of the run. Recovery starts tomorrow.", followUp: null };
    return null;
  }
  if (today.state === "RECOVERY") {
    return { moment: "RUN_OVER", label: "RUN OVER", line: "The run is over. Recovery begins today.",
      followUp: { title: LIGHT_DAY_TITLE, description: "From the end of your run: the first day off after it." } };
  }
  if (today.state === "FLIP" && before !== null && before !== "FLIP") {
    return { moment: "FLIP_BEGINS", label: "FLIP DAY", followUp: null,
      line: input.shiftStartHour === null ? "Back on shift tomorrow." : `Back on shift tomorrow at ${hour(input.shiftStartHour)}.` };
  }
  if (today.state === "FREE" && before === "RECOVERY") return { moment: "FREE_AGAIN", label: "FREE DAYS", line: "The first day off is done. The rest of these days off are free.", followUp: null };
  return null;
}

/** Read only: whether an open plan item with this title is already planned for this date, so the follow-up isn't offered twice. */
export async function hasPlanItem(title: string, date: string): Promise<boolean> {
  return (await db.obligations.where("status").equals("OPEN").toArray()).some((o) => o.title === title && o.plannedAt === date);
}

/** Slice 2's input from slice 1's, the saved schedule and the day before yesterday's record. */
export function lifeMomentInput(now: Date, pattern: SchedulePattern, state: LifeStateInput, dayBeforeRecorded: DayKind | null): LifeMomentInput {
  const saved = isOperatorSavedSchedule(pattern), start = livedDayStartOf(now);
  const twoBack = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 2, 16, 30, 0, 0);
  return {
    state,
    dayBefore: { recorded: dayBeforeRecorded, scheduled: saved ? scheduledWorkContextForLivedDay(twoBack, pattern) : null },
    shiftStartHour: saved ? pattern.shiftStartHour : null,
  };
}

/** The date a "today" follow-up is planned for: the calendar day you're in. */
export const followUpDate = (now: Date) => formatLocalDate(now);
