import { readStretchPlay, writeStretchPlay, clearStretchPlay, type StretchPlay } from "../persistence/stretchPlayStore";
import { startStretchClock, stretchElapsed, stretchHolds, stretchTotalSeconds, stretchCueTimeline, type StretchClock } from "../domain/workout/stretchCues";
import type { StretchRoutine } from "../domain/workout/stretchLibrary";
import type { WorkoutSession } from "../domain/common/types";
import { ensureActiveDay } from "./commands";
import { completeRecoverySession, startWorkout } from "./trainCommands";
import { runCueSpeaks, type RunCuePrefs } from "./runCuePrefs";
import type { RunCuePayload, RunCuePayloadCue } from "./runCueBridge";

export { readStretchPlay, writeStretchPlay, type StretchPlay };

/**
 * GRAYSON-HOME-STRETCH-001 slice B: a stretch routine played as a RECOVERY session. START opens the session through
 * startWorkout (the same path as TRAIN's RECOVERY) and keeps the routine and its clock on this phone; finishing saves
 * through completeRecoverySession with the minutes played and the routine's name. A routine played to the end is
 * COMPLETED whatever its length; stopped early, today's minutes rule applies. Recovery never moves the rotation.
 */
export async function startStretchSession(routine: StretchRoutine, nowMs: number = Date.now()): Promise<WorkoutSession> {
  const day = await ensureActiveDay();
  const session = await startWorkout(day.id, null, "RECOVERY");
  if (session.sessionType !== "RECOVERY") throw new Error("A workout is already running. Finish it first.");
  const existing = readStretchPlay(session.id);
  if (!existing) writeStretchPlay({ sessionId: session.id, routine: structuredClone(routine), clock: startStretchClock(nowMs) });
  return session;
}

/** Minutes for the record: the routine's own length when played to the end (at least 1), else the time played. */
export function stretchMinutes(play: Pick<StretchPlay, "routine" | "clock">, completed: boolean, nowMs: number): number {
  const total = stretchTotalSeconds(stretchHolds(play.routine, play.clock.extra));
  const played = Math.min(total, Math.max(0, stretchElapsed(play.clock, nowMs)));
  return completed ? Math.max(1, Math.round(total / 60)) : Math.floor(played / 60);
}

export async function finishStretchSession(session: Pick<WorkoutSession, "id" | "beyondDayId">, play: StretchPlay, completed: boolean, nowMs: number = Date.now()): Promise<void> {
  await completeRecoverySession(session.beyondDayId, session.id, stretchMinutes(play, completed, nowMs), { id: play.routine.id, name: play.routine.name, completed });
  clearStretchPlay();
}

/**
 * What Health Bridge speaks: the same envelope as the run cues (Health Bridge holds no wording of its own). Every
 * change is a spoken line ("HALFWAY", the Bridge's plain spoken kind, so no Bridge change is needed); the end is
 * FINISH. SKIP and +15 s move the timeline, so the start sent is the clock's start less the seconds skipped. Buzzing
 * stays on this screen (feedback.ts), so the Bridge doesn't buzz.
 */
export function stretchCuePayload(sessionId: string, routine: StretchRoutine, clock: StretchClock, prefs: RunCuePrefs): RunCuePayload {
  const timeline = stretchCueTimeline(stretchHolds(routine, clock.extra));
  const speak = prefs.voice && runCueSpeaks(prefs, "HALFWAY");
  const cues: RunCuePayloadCue[] = timeline.map((c) => ({ at: Math.round(c.atSecond), kind: c.kind === "DONE" ? "FINISH" : "HALFWAY", text: c.text, speak: c.kind === "DONE" ? prefs.voice && runCueSpeaks(prefs, "FINISH") : speak, buzz: false }));
  return {
    v: 1, id: sessionId, title: `Stretch · ${routine.name}`.slice(0, 80),
    startedAt: Math.round(clock.startedAt - clock.shift * 1000), pausedMs: clock.pausedMs,
    ...(clock.pausedAt !== null ? { pausedAt: clock.pausedAt } : {}),
    cues,
  };
}

export { clearStretchPlay };
