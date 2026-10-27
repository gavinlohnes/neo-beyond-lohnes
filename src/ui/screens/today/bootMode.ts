import { getActiveDay, getSchedulePattern, getWorkPeriodEnded, getSleepEntries, getLastShiftDownCompletedAt } from "../../../application/queries";
import { getModePin } from "../../../application/modePinQueries";
import { livedDayShiftWindow } from "../../../engine/scheduledContext";
import { deriveShiftClockPhase, mainSleepEndsPostShift, MODE_NAMES, type ShiftClockPhase } from "./shiftClock";

/** Same presentation derivation as TODAY, including direct launches into TRAIN/BODY. */
export async function readBootPhase(at?: Date): Promise<ShiftClockPhase | null> {
  const day = await getActiveDay();
  if (!day) return null;
  const [schedule, ended, sleep, shiftDown] = await Promise.all([
    getSchedulePattern(), getWorkPeriodEnded(day.id), getSleepEntries(day.id), getLastShiftDownCompletedAt(day.id),
  ]);
  // The clock is read once the reads finish, so a slow read never judges (and expires) a pin with a stale time.
  const now = at ?? new Date();
  const window = livedDayShiftWindow(new Date(day.startedAt), schedule);
  const phase = getModePin(day.id, day.startedAt, now) ?? deriveShiftClockPhase({ now, workContext: day.workContext, shiftWindow: window, workEnded: !!ended,
    mainSleepLogged: mainSleepEndsPostShift(sleep.filter((entry) => entry.kind === "PRIMARY").map((entry) => entry.recordedAt), ended?.occurredAt ?? null, window),
    shiftDownDone: !!shiftDown && (!window || new Date(shiftDown).getTime() >= window.start.getTime()),
  });
  return phase;
}

export async function readBootMode(at?: Date): Promise<string> {
  const phase = await readBootPhase(at);
  return phase ? MODE_NAMES[phase] : "Mode: not set";
}
