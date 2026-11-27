import { useEffect, useRef, useState } from "react";
import { readRunCuePrefs, runCueSwitchDefault, runCueSwitchOn } from "../../../application/runCuePrefs";
import { RunCuePayloadTooLarge, runCueUrl, type RunCueOp } from "../../../application/runCueBridge";
import { finishStretchSession, readStretchPlay, stretchCuePayload, writeStretchPlay, type StretchPlay } from "../../../application/stretchSession";
import {
  extendStretch, pauseStretch, resumeStretch, skipStretch, stretchCuesBetween, stretchCueTimeline, stretchElapsed, stretchHolds,
  stretchPosition, stretchTotalSeconds, type StretchClock,
} from "../../../domain/workout/stretchCues";
import { STRETCH_BY_ID } from "../../../domain/workout/stretchLibrary";
import type { WorkoutSession } from "../../../domain/common/types";
import { feedback } from "../../feel/feedback";
import { runCueOpener } from "./runCueLink";
import "./stretch.css";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: the stretch player. One stretch at a time: its name, the side, the hold counting
 * down, the next stretch underneath. A buzz at each change and the cue on screen; with VOICE CUES on, Health Bridge
 * speaks the same cues with the phone locked. Timing comes from the clock (start, pauses, skips), never a running
 * timer, so a locked screen doesn't drift. PAUSE, SKIP, +15 S and END are each one tap. Played to the end, it saves
 * itself as a completed recovery session; END saves what was played.
 */
const mmss = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

export function StretchPlayer({ session, onFinished }: { session: Pick<WorkoutSession, "id" | "beyondDayId">; onFinished: () => void | Promise<void> }) {
  const [play, setPlay] = useState<StretchPlay | null>(() => readStretchPlay(session.id));
  const [now, setNow] = useState(() => Date.now());
  const [cueLine, setCueLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastElapsed = useRef<number | null>(null);
  const finishing = useRef(false);
  const bridgeSeen = useRef(false);

  useEffect(() => { void runCueSwitchDefault().then((seen) => { bridgeSeen.current = seen; }); }, []);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  const holds = play ? stretchHolds(play.routine, play.clock.extra) : [];
  const cues = stretchCueTimeline(holds);
  const total = stretchTotalSeconds(holds);
  const elapsed = play ? Math.min(total, stretchElapsed(play.clock, now)) : 0;
  const at = stretchPosition(holds, elapsed);

  // Each cue crossed since the last render: one buzz and the newest cue's words on screen.
  useEffect(() => {
    if (!play) return;
    const from = lastElapsed.current ?? -1;
    lastElapsed.current = elapsed;
    const crossed = stretchCuesBetween(cues, from, elapsed);
    if (crossed.length) { feedback("LIGHT"); setCueLine(crossed.at(-1)!.text); }
    if (elapsed >= total && total > 0) void finish(true);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function tellBridge(op: RunCueOp, next: StretchPlay) {
    const prefs = readRunCuePrefs();
    if (!runCueSwitchOn(prefs, bridgeSeen.current) || !prefs.voice) return;
    try { runCueOpener.open(runCueUrl(op, stretchCuePayload(next.sessionId, next.routine, next.clock, prefs))); }
    catch (e) { if (!(e instanceof RunCuePayloadTooLarge)) throw e; }
  }

  function update(change: (clock: StretchClock, nowMs: number) => StretchClock, op: RunCueOp | null) {
    if (!play || saving) return;
    const t = Date.now();
    const next = { ...play, clock: change(play.clock, t) };
    writeStretchPlay(next);
    setPlay(next);
    setNow(t);
    if (op) tellBridge(op, next);
  }

  async function finish(completed: boolean) {
    if (!play || finishing.current) return;
    finishing.current = true; setSaving(true); setError(null);
    try {
      await finishStretchSession(session, play, completed, Date.now());
      if (!completed) tellBridge("end", play);
      feedback("HEAVY");
      await onFinished();
    } catch {
      finishing.current = false;
      setError("That didn't save. Try END again.");
    } finally {
      setSaving(false);
    }
  }

  if (!play) return null;
  const paused = play.clock.pausedAt !== null;
  const stretch = at ? STRETCH_BY_ID.get(at.hold.stretchId) : null;
  const side = at?.hold.side === "LEFT" ? "Left side" : at?.hold.side === "RIGHT" ? "Right side" : null;
  const nextLine = at?.next ? (at.next.stepIndex === at.hold.stepIndex ? (at.next.side && at.next.side !== at.hold.side ? "Next: switch sides" : "Next: again") : `Next: ${at.next.name}`) : "Last one";

  return (
    <section className="stretch-player" aria-labelledby="stretch-player-title">
      <p className="tool-label">STRETCH · {play.routine.name.toUpperCase()}</p>
      <h2 id="stretch-player-title" className="stretch-player__name">{at ? at.hold.name : "Done"}</h2>
      {side && <p className="stretch-player__side">{side}</p>}
      <p className="stretch-player__count" aria-label={at ? `${Math.ceil(at.remaining)} seconds left` : "Done"}>{at ? mmss(at.remaining) : "0:00"}</p>
      {stretch && !stretch.timeOnly && <ul className="stretch-player__cues">{stretch.cues.map((c) => <li key={c}>{c}</li>)}</ul>}
      {stretch?.timeOnly && <p className="meta">{stretch.cues.join(". ")}.</p>}
      <p className="meta">{nextLine} · {mmss(total - elapsed)} left in the routine</p>
      <p className="meta stretch-player__cue" role="status" aria-live="polite">{paused ? "Paused" : cueLine ?? ""}</p>
      <div className="stretch-player__actions">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => update(paused ? resumeStretch : pauseStretch, paused ? "resume" : "pause")}>{paused ? "RESUME" : "PAUSE"}</button>
        <button type="button" className="btn-secondary" disabled={saving || !at} onClick={() => update((c, t) => skipStretch(c, play.routine, t), "start")}>SKIP</button>
        <button type="button" className="btn-secondary" disabled={saving || !at} aria-label="Add 15 seconds" onClick={() => update((c, t) => extendStretch(c, play.routine, t), "start")}>+15 S</button>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void finish(false)}>END</button>
      </div>
      <p className="meta">Stretch gently. Stop if anything hurts.</p>
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>
  );
}

/** For the START tap: tells Health Bridge the routine has begun, under the same VOICE CUES switch as the run cues. */
export async function sendStretchStart(sessionId: string): Promise<void> {
  const play = readStretchPlay(sessionId);
  if (!play) return;
  const prefs = readRunCuePrefs();
  if (!runCueSwitchOn(prefs, await runCueSwitchDefault()) || !prefs.voice) return;
  try { runCueOpener.open(runCueUrl("start", stretchCuePayload(play.sessionId, play.routine, play.clock, prefs))); }
  catch (e) { if (!(e instanceof RunCuePayloadTooLarge)) throw e; }
}
