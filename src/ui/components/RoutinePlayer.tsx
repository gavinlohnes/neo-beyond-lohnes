import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { completePlayedRoutineStep, getRoutinePlayback, routineEstimate, type RoutinePlayback } from "../../application/routinePlayer";
import { ensureActiveDay, subscribeToDayRollover } from "../../application/commands";
import { stepKey } from "../../application/routineCommands";
import type { Routine } from "../../domain/routines";
import { describeError } from "../errorMessage";
import { captureCommitFeedback } from "../feel/feedback";
import "./routinePlayer.css";

const clock = (ms: number) => `${Math.floor(Math.ceil(ms / 1000) / 60)}:${String(Math.ceil(ms / 1000) % 60).padStart(2, "0")}`;

/** Session-only playback. Only DONE and the explicit START DAY button write. */
export function RoutinePlayer({ routines, onClose }: { routines: readonly Routine[]; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(routines.length === 1 ? routines[0]!.id : null);
  const [data, setData] = useState<RoutinePlayback | null>(null);
  const [index, setIndex] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null), [voice, setVoice] = useState(false);
  const [remaining, setRemaining] = useState(0), [deadline, setDeadline] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const epoch = useRef(0), saving = useRef(false), alive = useRef(true);
  const speechAvailable = typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
  const step = data?.routine.steps[index], fullMs = (step?.minutes ?? 0) * 60_000;

  async function load(id = selected) {
    if (!id) return;
    const mine = ++epoch.current; setError(null); setData(null); setDeadline(null);
    try {
      const next = await getRoutinePlayback(id);
      if (mine !== epoch.current || !alive.current) return;
      setData(next);
      const first = next.routine.steps.findIndex((s) => !next.ticks.has(stepKey(id, s.id)));
      setIndex(first < 0 ? 0 : first);
    } catch (cause) { if (mine === epoch.current && alive.current) setError(describeError(cause, "The routine could not be read.")); }
  }
  useEffect(() => {
    alive.current = true;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = dialog.current!; node.showModal();
    return () => { alive.current = false; ++epoch.current; node.close(); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { if (selected) void load(selected); return () => { ++epoch.current; }; }, [selected]);
  useLayoutEffect(() => { setDeadline(null); setRemaining(fullMs); }, [step?.id, fullMs]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index, data?.version, data?.dayId]);
  useEffect(() => subscribeToDayRollover(() => {
    setDeadline(null); setError("Your lived day changed. Reload the player before saving another step.");
    setData((old) => old ? { ...old, dayBlocked: true } : old);
  }), []);
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const ms = Math.min(fullMs, Math.max(0, deadline - Date.now()));
      setRemaining(ms); if (ms === 0) setDeadline(null);
    };
    tick(); const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [deadline, fullMs]);
  useEffect(() => {
    if (!voice || !speechAvailable || !step || data?.dayBlocked) return;
    speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(step.text));
    return () => { speechSynthesis.cancel(); };
  }, [voice, speechAvailable, step?.id, step?.text, data?.dayBlocked]);

  async function startDay() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try {
      await ensureActiveDay();
      if (selected && alive.current) {
        const next = await getRoutinePlayback(selected);
        if (alive.current) {
          if (data && next.version !== data.version) setError("The routine changed. Reload the player before saving a step.");
          else setData(next);
        }
      }
    }
    catch (cause) { if (alive.current) setError(describeError(cause, "Your day could not be started.")); }
    finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  async function done() {
    if (!data || !step || saving.current || !data.dayId || data.dayBlocked) return;
    saving.current = true; setBusy(true); setError(null); setDeadline(null);
    const acknowledge = captureCommitFeedback();
    try {
      const changed = await completePlayedRoutineStep(data, step.id);
      if (changed) acknowledge("LIGHT");
      window.dispatchEvent(new Event("beyond:routines-changed"));
      if (alive.current) {
        setData({ ...data, ticks: new Set([...data.ticks, stepKey(data.routine.id, step.id)]) });
        setIndex((i) => i + 1);
      }
    } catch (cause) { if (alive.current) setError(describeError(cause, "That step could not be saved. Try again when ready.")); }
    finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  const unticked = data?.routine.steps.slice(index).filter((s) => !data.ticks.has(stepKey(data.routine.id, s.id))) ?? [];
  const estimate = routineEstimate(unticked);
  const startBy = data?.scheduledShiftStart && unticked.length && unticked.every((s) => s.minutes !== undefined)
    ? new Date(Date.parse(data.scheduledShiftStart) - unticked.reduce((sum, s) => sum + s.minutes!, 0) * 60_000) : null;

  return <dialog ref={dialog} className="routine-player" aria-labelledby="routine-player-title"
    onCancel={(e) => { e.preventDefault(); if (!saving.current) onClose(); }}>
    <div className="routine-player__inner">
      <header className="routine-player__header"><h1 id="routine-player-title">{data?.routine.title ?? (selected ? "Routine" : "Choose a routine")}</h1>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>CLOSE PLAYER</button></header>
      {!selected && <div className="routine-player__choices">{routines.map((r) => <button key={r.id} className="btn-secondary" onClick={() => setSelected(r.id)}>{r.title}</button>)}</div>}
      {selected && !data && !error && <p role="status">Reading your routine…</p>}
      {error && <div><p role="alert">{error}</p><button type="button" className="btn-secondary" disabled={busy} onClick={() => void load()}>RELOAD PLAYER</button></div>}
      {data && <>
        {estimate && <p className="meta">{estimate} remaining</p>}
        {startBy && <p className="meta">Scheduled start by {startBy.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} · based on your step estimates.</p>}
        {data.dayBlocked && <p role="status">Open TODAY to settle the new day, then reload this player. Saved ticks stay with their own day.</p>}
        {!data.dayId && <div><p>Start your day to save DONE ticks. Playing, skipping and timers do not save anything.</p><button type="button" className="btn-secondary" disabled={busy} onClick={() => void startDay()}>START DAY</button></div>}
        {step ? <>
          <p className="routine-player__position">STEP {index + 1} / {data.routine.steps.length}</p>
          <h2 className="routine-player__step" ref={heading} tabIndex={-1}>{step.text}</h2>
          {data.ticks.has(stepKey(data.routine.id, step.id)) && <p className="meta">Already ticked on this day.</p>}
          {step.minutes !== undefined && <section className="routine-player__timer" aria-label="Step timer">
            <p className="routine-player__clock" role="timer" aria-label="Step time remaining" aria-live="off">{clock(remaining)}</p>
            {remaining === 0 && <p role="status">Timer finished. Choose DONE or SKIP when ready.</p>}
            <div className="routine-player__timer-controls">
              <button className="btn-secondary" disabled={busy || remaining === 0} onClick={() => {
                if (deadline !== null) { setRemaining(Math.max(0, deadline - Date.now())); setDeadline(null); }
                else setDeadline(Date.now() + remaining);
              }}>{deadline !== null ? "PAUSE TIMER" : remaining < fullMs ? "RESUME TIMER" : "START TIMER"}</button>
              <button className="btn-secondary" disabled={busy} onClick={() => { setDeadline(null); setRemaining(fullMs); }}>RESET TIMER</button>
            </div>
          </section>}
          <div className="routine-player__actions">
            <button className="btn-primary" disabled={busy || !data.dayId || data.dayBlocked} onClick={() => void done()}>{busy ? "SAVING…" : "DONE"}</button>
            <button className="btn-secondary" disabled={busy} onClick={() => { setDeadline(null); setError(null); setIndex((i) => i + 1); }}>SKIP</button>
          </div>
        </> : <><h2 ref={heading} tabIndex={-1} className="routine-player__step">End of routine</h2><p>Your saved ticks are kept. Unticked steps stay unticked.</p></>}
        <footer className="routine-player__footer">
          {index > 0 && <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setDeadline(null); setIndex((i) => i - 1); }}>BACK A STEP</button>}
          <label><input type="checkbox" checked={voice} disabled={!speechAvailable} onChange={(e) => setVoice(e.target.checked)} /> Speak step names</label>
          {!speechAvailable && <p className="meta">Speech is unavailable in this browser.</p>}
          <p className="meta">The timer stops when you close. You can change ticks in the routine checklist.</p>
        </footer>
      </>}
    </div>
  </dialog>;
}
