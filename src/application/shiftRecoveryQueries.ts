import { getSchedulePattern } from "./queries";
import { shiftRecoveryBrief } from "./rotationProjection";
import { shiftRun } from "./shiftRun";
import { getWholePicture } from "./wholePictureQueries";
import { getConfirmedKinds } from "./scheduleExceptions";

/** One read-only composition; no day creation, writes, provider or Engine evaluation. */
export async function getShiftRecoveryBrief(now = new Date()) {
  const [picture, schedule, confirmed] = await Promise.all([getWholePicture(now), getSchedulePattern(), getConfirmedKinds()]);
  return shiftRecoveryBrief(picture.rows, shiftRun(now, schedule, 21, confirmed));
}
