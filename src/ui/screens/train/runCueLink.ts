import { runCuePayload, RunCuePayloadTooLarge, runCueUrl, type RunCueOp } from "../../../application/runCueBridge";
import type { RunCuePrefs } from "../../../application/runCuePrefs";
import type { RunningSession } from "../../../domain/common/types";
import { runningCueTimeline } from "../../../domain/workout/runningCues";
import { isAndroid } from "../today/MeasuredSheet";

/**
 * GRAYSON-TRAIN-RUN-CUES-001: opens the `beyond-bridge://run` link. Chrome opens an intent link only from his tap, so
 * this is called inside the START, PAUSE, RESUME, END and pain handlers, never on load: a reload mid-run sends nothing
 * (the Bridge already has the timeline). Health Bridge is Android-only; elsewhere nothing is opened.
 *
 * An object, so tests can watch `open` without leaving the page.
 */
export const runCueOpener = {
  open(url: string): boolean {
    if (!isAndroid()) return false;
    window.location.href = url;
    return true;
  },
};

export type RunCueSend = "SENT" | "NOT_ANDROID" | "TOO_LARGE";

export function sendRunCues(op: RunCueOp, session: RunningSession, prefs: RunCuePrefs): RunCueSend {
  let url: string;
  try { url = runCueUrl(op, runCuePayload(session, runningCueTimeline(session.segments), prefs)); }
  catch (e) { if (e instanceof RunCuePayloadTooLarge) return "TOO_LARGE"; throw e; }
  return runCueOpener.open(url) ? "SENT" : "NOT_ANDROID";
}

/**
 * Default 8: whether Health Bridge answered. Opening an app hides this page for a moment (the Bridge's no-screen
 * activity comes forward and closes); if the page stays visible for `ms`, nothing handled the link, and the run
 * carries on with the on-screen cues.
 */
export function watchBridgeOpened(onMissing: () => void, ms = 2500): () => void {
  let hidden = document.visibilityState === "hidden";
  const seen = () => { if (document.visibilityState === "hidden") hidden = true; };
  document.addEventListener("visibilitychange", seen);
  const timer = setTimeout(() => { document.removeEventListener("visibilitychange", seen); if (!hidden) onMissing(); }, ms);
  return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", seen); };
}
