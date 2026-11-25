import { useEffect, useId, useRef, useState } from "react";
import { addSetToSession, correctSet, removeSet, undoSetFix, type SetFixResult } from "../../../application/trainFixCommands";
import type { SetFixEntry } from "../../../domain/workout/setFixes";
import { feedback } from "../../feel/feedback";
import { describeError } from "../../errorMessage";
import { FIX_UNDO_MS, useUndoWindow } from "../../hooks/useUndoWindow";
import { formatDate } from "../../formatDate";
import { describeSetFix, describeSetValues } from "./trainCopy";

/**
 * GRAYSON-TRAIN-EDIT-001 (Gavin, 2026-11-24): one sheet to fix any logged set (or fill in a skipped one, or add one
 * he forgot), from the live workout or a past session's record. No "Are you sure?": every fix saves at once and the
 * caller shows Undo for FIX_UNDO_MS. Field patterns follow LogEntrySheet / SetDetails: 44 px controls, 16 px text.
 */
export interface FixableSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  skipped: boolean;
  setKind?: "WORKING" | "WARMUP" | undefined;
  repsInReserve?: number | undefined;
}

export type SetFixDone = { result: SetFixResult; text: string };

export function SetFixSheet({ target, exerciseName, onDone, onCancel }: {
  /** A set to fix, or `{ add: … }` to add one to a finished session. */
  target: { set: FixableSet } | { add: { sessionId: string; exerciseId: string; weight: number; reps: number } };
  exerciseName: string;
  onDone: (done: SetFixDone) => void;
  onCancel: () => void;
}) {
  const set = "set" in target ? target.set : null;
  const [weight, setWeight] = useState(String(set ? (set.skipped ? "" : set.weight) : "add" in target ? target.add.weight : ""));
  const [reps, setReps] = useState(String(set ? (set.skipped ? "" : set.reps) : "add" in target ? target.add.reps : ""));
  const [warmUp, setWarmUp] = useState(set?.setKind === "WARMUP");
  const [rir, setRir] = useState(set?.repsInReserve !== undefined ? String(set.repsInReserve) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { headingRef.current?.focus(); }, []);

  const title = set
    ? set.skipped ? `Fill in ${exerciseName}, set ${set.setNumber}` : `Fix ${exerciseName}, set ${set.setNumber}`
    : `Add a set to ${exerciseName}`;

  const save = async () => {
    const w = Number(weight);
    const r = Number(reps);
    if (weight.trim() === "" || !Number.isFinite(w) || w < 0) { setError("Weight must be 0 or more."); return; }
    if (reps.trim() === "" || !Number.isInteger(r) || r < 1) { setError(set ? "Enter at least 1 rep, or remove the set." : "Enter at least 1 rep."); return; }
    const effort = rir.trim() === "" ? undefined : Number(rir);
    setBusy(true); setError(null);
    try {
      const input = { weight: w, reps: r, setKind: warmUp ? "WARMUP" as const : "WORKING" as const, ...(effort !== undefined ? { repsInReserve: effort } : {}) };
      const result = set ? await correctSet(set.id, input) : await addSetToSession((target as { add: { sessionId: string } }).add.sessionId, (target as { add: { exerciseId: string } }).add.exerciseId, input);
      feedback("MEDIUM");
      onDone({ result, text: set ? `${set.skipped ? "Filled in" : "Fixed"}: set ${set.setNumber}, ${w} lb × ${r}.` : `Added: ${w} lb × ${r}.` });
    } catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!set) return;
    setBusy(true); setError(null);
    try { const result = await removeSet(set.id); feedback("MEDIUM"); onDone({ result, text: `Removed: set ${set.setNumber}.` }); }
    catch (e) { setError(describeError(e, "That didn't save. Nothing changed.")); }
    finally { setBusy(false); }
  };

  return <div className="set-fix" role="group" aria-labelledby={`${id}-title`} data-set-fix-sheet>
    <h4 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="card-title">{title}</h4>
    {set && !set.skipped && <p className="meta">Now: {describeSetValues(set)}</p>}
    <div className="set-fix__fields">
      <label className="set-fix__field">Weight (lb)<input type="number" inputMode="decimal" min={0} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
      <label className="set-fix__field">Reps<input type="number" inputMode="numeric" min={1} step={1} value={reps} onChange={(e) => setReps(e.target.value)} /></label>
      <label className="set-fix__field">Reps left (optional)<input type="number" inputMode="numeric" min={0} max={10} step={1} value={rir} onChange={(e) => setRir(e.target.value)} /></label>
      <label className="set-fix__check"><input type="checkbox" checked={warmUp} onChange={(e) => setWarmUp(e.target.checked)} />Warm-up</label>
    </div>
    {error && <p className="meta" role="alert">{error}</p>}
    <div className="set-fix__acts">
      <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>SAVE</button>
      {set && <button type="button" className="btn-secondary" disabled={busy} onClick={() => void remove()}>REMOVE SET</button>}
      <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>CANCEL</button>
    </div>
  </div>;
}

/** The 8-second Undo after a fix or a removal (GRAYSON undo rule, option 1). */
export function useSetFixUndo(onUndone: () => void | Promise<void>) {
  const [done, setDone] = useUndoWindow<SetFixDone>(FIX_UNDO_MS);
  const [error, setError] = useState<string | null>(null);
  const undo = async () => {
    if (!done) return;
    try { await undoSetFix(done.result.fixEventId); setDone(null); setError(null); feedback("LIGHT"); await onUndone(); }
    catch (e) { setDone(null); setError(describeError(e, "That couldn't be undone. Nothing changed.")); }
  };
  const node = (done || error)
    ? <p className="set-fix-undo" role="status"><span>{done ? done.text : error}</span>
        {done && <button type="button" className="btn-secondary set-fix-undo__btn" onClick={() => void undo()}>UNDO</button>}</p>
    : <p className="set-fix-undo set-fix-undo--empty" role="status" />;
  return { show: (next: SetFixDone) => { setError(null); setDone(next); }, node };
}

/** The "edited" detail: what the set was, and when it changed, with Put it back for the newest fix. */
export function SetFixHistory({ fixes, newestFixEventId, onPutBack }: { fixes: SetFixEntry[]; newestFixEventId?: string | undefined; onPutBack: (fixEventId: string) => void }) {
  return <details className="set-fix-history">
    <summary>edited</summary>
    <ul>
      {fixes.map((f) => <li key={f.eventId} className="meta">
        {describeSetFix(f)} · {formatDate(f.at, "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{f.undone ? (f.kind === "REMOVED" ? " · put back" : " · undone") : ""}
      </li>)}
    </ul>
    {newestFixEventId && <button type="button" className="btn-secondary set-fix-history__back" onClick={() => onPutBack(newestFixEventId)}>
      {fixes.find((f) => f.eventId === newestFixEventId)?.kind === "ADDED" ? "TAKE THIS ADDED SET OUT" : "PUT IT BACK"}</button>}
  </details>;
}
