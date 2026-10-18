import { getActiveDay, getSchedulePattern, getWorkPeriodEnded, getSleepEntries, getLastShiftDownCompletedAt } from "../../../application/queries";
import { getModePin } from "../../../application/modePinQueries";
import { livedDayShiftWindow } from "../../../engine/scheduledContext";
import { deriveShiftClockPhase, mainSleepEndsPostShift, MODE_NAMES } from "./shiftClock";

/** Same presentation derivation as TODAY, including direct launches into TRAIN/BODY. */
export async function readBootMode(now = new Date()): Promise<string> {
  const day = await getActiveDay();
  if (!day) return "Mode: not set";
  const [schedule, ended, sleep, shiftDown] = await Promise.all([
    getSchedulePattern(), getWorkPeriodEnded(day.id), getSleepEntries(day.id), getLastShiftDownCompletedAt(day.id),
  ]);
  const window = livedDayShiftWindow(new Date(day.startedAt), schedule);
  const phase = getModePin(day.id) ?? deriveShiftClockPhase({ now, workContext: day.workContext, shiftWindow: window, workEnded: !!ended,
    mainSleepLogged: mainSleepEndsPostShift(sleep.filter((entry) => entry.kind === "PRIMARY").map((entry) => entry.recordedAt), ended?.occurredAt ?? null, window),
    shiftDownDone: !!shiftDown && (!window || new Date(shiftDown).getTime() >= window.start.getTime()),
  });
  return phase ? MODE_NAMES[phase] : "Mode: not set";
}
