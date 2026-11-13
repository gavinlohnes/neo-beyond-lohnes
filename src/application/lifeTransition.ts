import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, livedDayShiftWindow, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
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
 *   RUN_OVER     today is recovery: the run is over, the first day off. Slice 3 adds the post-run report and the
 *                optional recovery contract here (recoveryContract.ts, postRunReport.ts).
 *   FLIP_BEGINS  today is a flip: back on shift at the next scheduled start.
 *   FREE_AGAIN   today is free and yesterday was recovery.
 *
 * Read only; never an Engine input.
 */
export type LifeMoment = "RUN_STARTS" | "LAST_SHIFT" | "RUN_OVER" | "FLIP_BEGINS" | "FREE_AGAIN";
export interface LifeMomentReading { moment: LifeMoment; label: string; line: string }

export interface LifeMomentInput {
  state: LifeStateInput;
  /** The lived day before yesterday: recorded, else scheduled. */
  dayBefore: { recorded: DayKind | null; scheduled: DayKind | null };
  /**
   * Review of #495: a lived day runs 16:30 to 16:30, so "today" and "tomorrow" go wrong after midnight. The lines are
   * worded against the real clock instead: now, and the scheduled shift in this lived day and in the next one.
   */
  now: Date;
  todayShift: { start: Date; end: Date } | null;
  nextShift: { start: Date; end: Date } | null;
}

const said = (side: { recorded: DayKind | null; scheduled: DayKind | null }) => side.recorded ?? side.scheduled;
const clock = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const dayIndex = (d: Date) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
/** "tonight at 18:00", "today at 09:00", "tomorrow at 18:00" or "Sat at 18:00", as seen from now. */
export function whenFrom(now: Date, at: Date): string {
  const days = dayIndex(at) - dayIndex(now);
  if (days === 0) return `${at.getHours() >= 17 ? "tonight" : "today"} at ${clock(at)}`;
  if (days === 1) return `tomorrow at ${clock(at)}`;
  return `${at.toLocaleDateString("en-US", { weekday: "short" })} at ${clock(at)}`;
}

/** Yesterday's state by slice 1's rule: yesterday as "today", the day before it as "yesterday", today as "tomorrow". */
export function yesterdaysState(input: LifeMomentInput): LifeState | null {
  const today = said(input.state.today);
  return deriveLifeState({ today: input.state.yesterday, yesterday: input.dayBefore, tomorrow: { scheduled: today, date: input.state.tomorrow.date }, run: null })?.state ?? null;
}

export function deriveLifeMoment(input: LifeMomentInput, today: LifeStateReading | null): LifeMomentReading | null {
  if (!today) return null;
  const before = yesterdaysState(input), tomorrow = input.state.tomorrow.scheduled;
  const { now, todayShift } = input;
  // Where now sits against this lived day's shift: before it, during it, or after it.
  const phase = !todayShift ? null : now < todayShift.start ? "BEFORE" : now < todayShift.end ? "DURING" : "AFTER";
  const after = (end: Date) => `Recovery starts after it ends at ${clock(end)}.`;
  if (today.state === "WORK_RUN") {
    const last = tomorrow === "OFF";
    if (before !== null && before !== "WORK_RUN") {
      const one = last ? "A one-shift run. " : "";
      const line = phase === "BEFORE" ? `${one}The run starts ${whenFrom(now, todayShift!.start)}.${last ? ` ${after(todayShift!.end)}` : ""}`
        : phase === "DURING" ? `${one}This is the first shift of the run.${last ? ` ${after(todayShift!.end)}` : ""}`
        : phase === "AFTER" ? `${one}The first shift of the run is done.${last ? " Recovery starts this evening." : ""}`
        : `${one}The first shift of the run.`;
      return { moment: "RUN_STARTS", label: "RUN STARTS", line };
    }
    if (before === "WORK_RUN" && last) {
      const line = phase === "AFTER" ? "The run's last shift is done. Recovery starts this evening."
        : todayShift ? `The last shift of the run. ${after(todayShift.end)}` : "The last shift of the run.";
      return { moment: "LAST_SHIFT", label: "LAST SHIFT", line };
    }
    return null;
  }
  if (today.state === "RECOVERY") {
    return { moment: "RUN_OVER", label: "RUN OVER", line: "The run is over. This is the first day off." };
  }
  if (today.state === "FLIP" && before !== null && before !== "FLIP") {
    return { moment: "FLIP_BEGINS", label: "FLIP DAY",
      line: input.nextShift ? `Back on shift ${whenFrom(now, input.nextShift.start)}.` : "Back on shift when this day off ends." };
  }
  if (today.state === "FREE" && before === "RECOVERY") return { moment: "FREE_AGAIN", label: "FREE DAYS", line: "The first day off is done. The rest of these days off are free." };
  return null;
}

/**
 * Read only: whether a plan item with this title is already planned for any of these dates, in any status (done or
 * let go counts too), so the follow-up isn't offered twice in one lived day. Review of #495: a lived day covers two
 * calendar dates.
 */
export async function hasPlanItem(title: string, dates: readonly string[]): Promise<boolean> {
  return (await db.obligations.toArray()).some((o) => o.title === title && !!o.plannedAt && dates.includes(o.plannedAt));
}

/** The calendar dates a lived day covers: the day it starts (16:30) and the next. */
export function livedDayDates(now: Date): string[] {
  const start = livedDayStartOf(now);
  return [formatLocalDate(start), formatLocalDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 12))];
}

/** Slice 2's input from slice 1's, the saved schedule and the day before yesterday's record. */
export function lifeMomentInput(now: Date, pattern: SchedulePattern, state: LifeStateInput, dayBeforeRecorded: DayKind | null,
  confirmed: ReadonlyMap<string, DayKind> = new Map()): LifeMomentInput {
  const saved = isOperatorSavedSchedule(pattern), start = livedDayStartOf(now);
  const twoBack = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 2, 16, 30, 0, 0);
  const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 16, 30, 0, 0);
  // SCHEDULE-EXCEPTIONS-001: a confirmed change decides the day; a confirmed work day takes the usual shift times.
  const shiftOn = (day: Date) => {
    const kind = confirmed.get(formatLocalDate(day));
    if (kind === "OFF") return null;
    if (kind === "WORK" && saved) {
      const startAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), pattern.shiftStartHour);
      const endAt = new Date(day.getFullYear(), day.getMonth(), day.getDate() + (pattern.shiftEndHour <= pattern.shiftStartHour ? 1 : 0), pattern.shiftEndHour);
      return livedDayShiftWindow(day, pattern) ?? { start: startAt, end: endAt };
    }
    return saved ? livedDayShiftWindow(day, pattern) : null;
  };
  return {
    state,
    dayBefore: { recorded: dayBeforeRecorded, scheduled: confirmed.get(formatLocalDate(twoBack)) ?? (saved ? scheduledWorkContextForLivedDay(twoBack, pattern) : null) },
    now,
    todayShift: shiftOn(start),
    nextShift: shiftOn(next),
  };
}

