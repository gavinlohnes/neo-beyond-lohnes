import type { SchedulePattern } from "../domain/common/types";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { db } from "../persistence/db";
import { livedDayStartOf } from "./reflect";
import { shiftRun, type ShiftRun } from "./shiftRun";

/**
 * LIFE-STATE-001 (Life-State Engine, slice 1; Gavin, 2026-11-13): the operating state of the current lived day, derived
 * only from what is already recorded and the saved schedule. No new tracking, nothing stored, never an Engine input:
 * it describes the day, and BEYOND's advice still comes from the Engine.
 *
 *   WORK_RUN  today is a work day.
 *   RECOVERY  today is off and the day before was a work day: the first day off after a run.
 *   FLIP      today is off and tomorrow is a work day: the switch back to shift hours.
 *   FREE      today is off with no work day on either side.
 *
 * Today's recorded work context wins over the schedule (the operator declared it); yesterday uses the recorded lived
 * day when there is one, else the schedule; tomorrow can only come from the schedule. When today can't be known
 * (no record and no saved schedule) there is no state, and TODAY says nothing rather than guess.
 * A single day off between runs is RECOVERY: the first sleep after a run comes first. (Amends SHIFT-RECOVERY-001's
 * "no inferred recovery state" exclusion, on Gavin's own objective.)
 */
export type LifeState = "WORK_RUN" | "RECOVERY" | "FLIP" | "FREE";
export type DayKind = "WORK" | "OFF";
export interface LifeStateInput {
  /** `by`: who set today's record (CONTEXT-INTEGRATION-001), so WHY never calls a schedule default "recorded by you". */
  today: { recorded: DayKind | null; scheduled: DayKind | null; by?: "OPERATOR" | "SCHEDULE" | "EXCEPTION"; confirmed?: boolean };
  yesterday: { recorded: DayKind | null; scheduled: DayKind | null; confirmed?: boolean };
  /** SCHEDULE-EXCEPTIONS-001: `scheduled` is the planning answer, a confirmed change when `confirmed`, else the rotation. */
  tomorrow: { scheduled: DayKind | null; date: Date; confirmed?: boolean };
  run: ShiftRun | null;
}
export interface LifeStateReading {
  state: LifeState;
  label: string;
  /** One calm sentence about the day. Describes, never prescribes. */
  line: string;
  /** Where the state came from, in plain words. */
  why: string[];
}

export const LIFE_STATE_LABELS: Record<LifeState, string> = { WORK_RUN: "WORK RUN", RECOVERY: "RECOVERY", FLIP: "FLIP", FREE: "FREE" };
const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
const said = (side: { recorded: DayKind | null; scheduled: DayKind | null }) => side.recorded ?? side.scheduled;
const source = (name: string, side: { recorded: DayKind | null; scheduled: DayKind | null; by?: "OPERATOR" | "SCHEDULE" | "EXCEPTION"; confirmed?: boolean }) => {
  const kind = said(side);
  if (!kind) return `${name}: not recorded and no saved schedule.`;
  const what = kind === "WORK" ? "a work day" : "a day off";
  if (side.recorded && side.by === "SCHEDULE") return `${name}: ${what}, set from your saved schedule when the day started.`;
  if (side.recorded && side.by === "EXCEPTION") return `${name}: ${what}, set from a schedule change you confirmed.`;
  if (!side.recorded && side.confirmed) return `${name}: ${what}, a schedule change you confirmed.`;
  return side.recorded ? `${name}: recorded as ${what}.` : `${name}: ${what} on your saved schedule.`;
};

export function deriveLifeState(input: LifeStateInput): LifeStateReading | null {
  const today = said(input.today), yesterday = said(input.yesterday), tomorrow = input.tomorrow.scheduled;
  if (!today) return null;
  const why = [source("Today", input.today), source("Yesterday", input.yesterday),
    tomorrow ? `Tomorrow: ${tomorrow === "WORK" ? "a work day" : "a day off"}${input.tomorrow.confirmed ? ", a schedule change you confirmed" : " on your saved schedule"}.` : "Tomorrow: no saved schedule."];
  // The run counts only when the schedule agrees with what today actually is.
  const run = input.run && input.run.kind === today ? input.run : null;
  const back = run && run.kind === "OFF" ? ` Back on ${weekday(run.next)}.` : tomorrow === "WORK" ? " Back on tomorrow." : "";
  let state: LifeState, line: string;
  if (today === "WORK") {
    state = "WORK_RUN";
    line = `${run ? `Shift ${run.position} of ${run.length}. ` : "A work day. "}Fuel, water and sleep between shifts carry the run.`;
  } else if (yesterday === "WORK") {
    state = "RECOVERY";
    line = `The first day off after the run. Sleep usually comes first.${back}`;
  } else if (tomorrow === "WORK") {
    state = "FLIP";
    line = "The last day off before the run. Today is the switch back to shift hours. Back on tomorrow.";
  } else {
    state = "FREE";
    line = `A day off with no shift on either side. Your time for plans, people and training.${back}`;
  }
  return { state, label: LIFE_STATE_LABELS[state], line, why: [...why, "This describes the day. BEYOND's advice still comes from your check-in."] };
}

const livedStart = (start: Date, k: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + k, 16, 30, 0, 0);

/** Read only: the work context recorded for the lived day `k` days before now's (1 = yesterday), or null. */
export async function getRecordedDayBefore(now: Date, k: number): Promise<DayKind | null> {
  const start = livedDayStartOf(now), from = livedStart(start, -k), to = livedStart(start, -k + 1);
  const days = await db.beyondDays.where("startedAt").between(from.toISOString(), to.toISOString(), true, false).toArray();
  // A restarted lived day can hold more than one record; any recorded work makes it a work day.
  return days.some((d) => d.workContext === "WORK") ? "WORK" : days.some((d) => d.workContext === "OFF") ? "OFF" : null;
}

/** Read only: the work context recorded for the previous lived day, or null when none was recorded. */
export const getRecordedYesterday = (now: Date) => getRecordedDayBefore(now, 1);

export function lifeStateInput(now: Date, pattern: SchedulePattern, todayRecorded: DayKind | null, yesterdayRecorded: DayKind | null,
  todayBy?: "OPERATOR" | "SCHEDULE" | "EXCEPTION", confirmed: ReadonlyMap<string, DayKind> = new Map()): LifeStateInput {
  const start = livedDayStartOf(now);
  const saved = isOperatorSavedSchedule(pattern);
  // SCHEDULE-EXCEPTIONS-001: a confirmed change for that lived day beats the rotation for planning.
  const dateOf = (k: number) => formatLocalDate(livedStart(start, k));
  const scheduled = (k: number): DayKind | null => confirmed.get(dateOf(k)) ?? (saved ? scheduledWorkContextForLivedDay(livedStart(start, k), pattern) : null);
  const isConfirmed = (k: number) => (confirmed.has(dateOf(k)) ? { confirmed: true } : {});
  return {
    today: { recorded: todayRecorded, scheduled: scheduled(0), ...(todayRecorded && todayBy ? { by: todayBy } : {}), ...isConfirmed(0) },
    yesterday: { recorded: yesterdayRecorded, scheduled: scheduled(-1), ...isConfirmed(-1) },
    tomorrow: { scheduled: scheduled(1), date: livedStart(start, 1), ...isConfirmed(1) },
    run: shiftRun(now, pattern, 21, confirmed),
  };
}
