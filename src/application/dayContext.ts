import type { BeyondDay, SchedulePattern } from "../domain/common/types";
import { isOperatorSavedSchedule, livedDayShiftWindow } from "../engine/scheduledContext";
import { clockOf } from "./bodyDashboard";

/**
 * BODY-DASH-001, shared by VISUAL-FOUNDATION-002: the command bar's day context. It comes from the record (WORK, OFF)
 * or, when the record doesn't say, the saved schedule's shift. It is never a guess: with neither, it says so.
 */
export function describeDayContext(day: BeyondDay | null, schedule: SchedulePattern | null): { text: string; basis: "recorded" | "schedule" | null } {
  const shift = day && schedule && isOperatorSavedSchedule(schedule) && day.workContext !== "OFF" ? livedDayShiftWindow(new Date(day.startedAt), schedule) : null;
  const text = !day ? "No day started" : day.workContext === "OFF" ? "Day off" : shift ? `${shift.end.toDateString() !== shift.start.toDateString() ? "Night shift" : "Shift"} ${clockOf(shift.start.getTime())}–${clockOf(shift.end.getTime())}` : day.workContext === "WORK" ? "Work day" : "Work or off not set";
  const basis = !day ? null : day.workContext === "UNKNOWN" ? (shift ? "schedule" : null) : "recorded";
  return { text, basis };
}
