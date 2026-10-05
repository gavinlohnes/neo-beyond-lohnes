import { db } from "../persistence/db";
import { isShiftHandoffSkipped, skipShiftHandoff } from "../persistence/shiftHandoffSkips";
import type { ShiftHandoffNotedPayload, ShiftHandoffReadPayload } from "../domain/common/types";
import { byTimeThenSeq, getActiveDay, getWorkPeriodEnded } from "./queries";

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04): what TODAY's handoff line
 * needs. Read only, apart from re-exporting SKIP's UI bookkeeping.
 */
export { skipShiftHandoff };

export interface ShiftHandoffNote {
  eventId: string;
  note: string;
  notedAt: string;
}

export interface ShiftHandoffState {
  activeDayId?: string;
  /** True right after MARK WORK ENDED, until a note is saved or the prompt is skipped. */
  prompt: boolean;
  /** On a work day: the latest note from an earlier shift not yet marked GOT IT. */
  unread?: ShiftHandoffNote;
}

export async function getShiftHandoffState(): Promise<ShiftHandoffState> {
  const day = await getActiveDay();
  if (!day) return { prompt: false };
  const [noted, read] = await Promise.all([
    db.events.where("type").equals("SHIFT_HANDOFF_NOTED").toArray(),
    db.events.where("type").equals("SHIFT_HANDOFF_READ").toArray(),
  ]);
  const notedToday = noted.some((e) => e.beyondDayId === day.id);
  const prompt =
    day.workContext === "WORK" && !notedToday && !isShiftHandoffSkipped(day.id) && (await getWorkPeriodEnded(day.id)) !== undefined;

  let unread: ShiftHandoffNote | undefined;
  if (day.workContext === "WORK") {
    const readIds = new Set(read.map((e) => (e.payload as ShiftHandoffReadPayload).handoffEventId));
    const latest = noted
      .filter((e) => e.beyondDayId !== day.id && !readIds.has(e.id))
      .sort((a, b) => byTimeThenSeq(a.recordedAt, a.seq, b.recordedAt, b.seq))
      .at(-1);
    if (latest) unread = { eventId: latest.id, note: (latest.payload as ShiftHandoffNotedPayload).note, notedAt: latest.recordedAt };
  }
  return { activeDayId: day.id, prompt, ...(unread ? { unread } : {}) };
}
