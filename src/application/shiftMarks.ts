import { db } from "../persistence/db";
import { readAutomationConfig } from "./iftttAutomations";
import { getWorkMarks, type WorkPeriodEndedInfo } from "./queries";

/**
 * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections"):
 * what the shift sheet opened from TODAY's timeline shows. Read only; the writes are retimeWorkMark and voidWorkMark.
 */
export interface ShiftMarkView {
  dayId: string;
  dayStartedAt: string;
  /** Reopening (and removing a start) is only for the active work day, like WORK ENDED itself. */
  canReopen: boolean;
  started?: WorkPeriodEndedInfo;
  ended?: WorkPeriodEndedInfo;
  /** The "work ended" phone automation is on, so it already ran when the end was marked. */
  endAutomationOn: boolean;
}

export async function getShiftMarkView(dayId: string): Promise<ShiftMarkView | null> {
  const day = await db.beyondDays.get(dayId);
  if (!day) return null;
  const marks = await getWorkMarks(dayId);
  const ifttt = readAutomationConfig();
  return {
    dayId, dayStartedAt: day.startedAt, canReopen: day.status === "ACTIVE" && day.workContext === "WORK",
    ...(marks.started ? { started: marks.started } : {}), ...(marks.ended ? { ended: marks.ended } : {}),
    endAutomationOn: ifttt.enabled && ifttt.events.includes("work_ended"),
  };
}

/** The line every reopen or end correction shows: what HISTORY keeps, and what can't be taken back. */
export function shiftChangeNote(endAutomationOn: boolean): string {
  return `HISTORY keeps the original mark.${endAutomationOn ? " Your “work ended” phone automation already ran when it was marked; this can't take that back." : ""}`;
}
