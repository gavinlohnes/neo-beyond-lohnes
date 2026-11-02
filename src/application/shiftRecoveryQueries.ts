import { getSchedulePattern } from "./queries";
import { shiftRecoveryBrief } from "./rotationProjection";
import { shiftRun } from "./shiftRun";
import { getWholePicture } from "./wholePictureQueries";

/** One read-only composition; no day creation, writes, provider or Engine evaluation. */
export async function getShiftRecoveryBrief(now = new Date()) {
  const [picture, schedule] = await Promise.all([getWholePicture(now), getSchedulePattern()]);
  return shiftRecoveryBrief(picture.rows, shiftRun(now, schedule));
}
