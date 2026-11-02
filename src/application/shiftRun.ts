import type { SchedulePattern } from "../domain/common/types";
import { isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { livedDayStartOf } from "./reflect";

/**
 * SHIFT-RUN-001 (#373 item 10, recovery and days off): where today sits in the saved rotation, read
 * from the schedule only. "Night 2 of 3, next day off Thu" or "Day off 1 of 2, back on Sat". It is the
 * schedule, not a work record, and says nothing about rest; with no saved schedule it says nothing.
 */
export interface ShiftRun { kind: "WORK" | "OFF"; position: number; length: number; next: Date }

// Review of #383: step by calendar day at 16:30 local, never by 24 h, so a clock change can't shift the window.
const livedStart = (start: Date, k: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + k, 16, 30, 0, 0);
export function shiftRun(now: Date, pattern: SchedulePattern, horizon = 21): ShiftRun | null {
  if (!isOperatorSavedSchedule(pattern)) return null;
  const start = livedDayStartOf(now);
  const kindAt = (k: number) => scheduledWorkContextForLivedDay(livedStart(start, k), pattern);
  const kind = kindAt(0);
  let back = 0; while (back < horizon && kindAt(-(back + 1)) === kind) back++;
  let ahead = 0; while (ahead < horizon && kindAt(ahead + 1) === kind) ahead++;
  if (back >= horizon || ahead >= horizon) return null; // no change in sight: no run to speak of
  return { kind, position: back + 1, length: back + ahead + 1, next: livedStart(start, ahead + 1) };
}

const weekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
export function describeShiftRun(run: ShiftRun): string {
  return run.kind === "WORK"
    ? `night ${run.position} of ${run.length} · next day off ${weekday(run.next)}`
    : `day off ${run.position} of ${run.length} · back on ${weekday(run.next)}`;
}
