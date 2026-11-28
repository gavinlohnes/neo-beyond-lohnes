import { useEffect, useRef, useState } from "react";
import {
  deleteStretchRoutine, getStretchRoutines, getStretchSuggestion, newStretchRoutineId, resetStarterRoutine, saveStretchRoutine,
  type StretchRoutineList, type StretchSuggestion,
} from "../../../application/stretchRoutines";
import { startStretchSession } from "../../../application/stretchSession";
import { stretchRoutineSeconds, type StretchRoutine } from "../../../domain/workout/stretchLibrary";
import { StretchRoutineEditor } from "./StretchRoutineEditor";
import { sendStretchStart } from "./StretchPlayer";
import "./stretch.css";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: stretching on TRAIN. When one fits the hour, it's suggested with why, one tap to
 * start ("Your shift ended at 6:00"). Every routine is a tap deeper, in STRETCH ROUTINES. Nothing starts by itself
 * and nothing is sent to his phone; a suggestion is only a suggestion. He can edit, delete and add routines; RESET
 * brings a starter back.
 */
const minutes = (r: StretchRoutine) => `${Math.round(stretchRoutineSeconds(r) / 60)} min`;

export function StretchRoutinesPanel({ busy, startDisabled, refreshKey, onStarted }: {
  busy: boolean;
  startDisabled: boolean;
  refreshKey: unknown;
  onStarted: () => void | Promise<void>;
}) {
  const [list, setList] = useState<StretchRoutineList | null>(null);
  const [suggestion, setSuggestion] = useState<StretchSuggestion | null>(null);
  const [editing, setEditing] = useState<StretchRoutine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [working, setWorking] = useState(false);
  // The list stays open after an edit, a reset or a delete, so he lands back where he was.
  const [listOpen, setListOpen] = useState(false);
  const writing = useRef(false);

  useEffect(() => {
    let live = true;
    void getStretchRoutines().then((v) => { if (live) setList(v); }, () => { if (live) setList(null); });
    void getStretchSuggestion().then((v) => { if (live) setSuggestion(v); }, () => { if (live) setSuggestion(null); });
    return () => { live = false; };
  }, [refreshKey, tick]);

  async function run(action: () => Promise<string | null>, failure: string) {
    if (writing.current || busy) return;
    writing.current = true; setWorking(true); setError(null); setNote(null);
    try { setNote(await action()); setTick((n) => n + 1); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : failure); setTick((n) => n + 1); }
    finally { writing.current = false; setWorking(false); }
  }

  const start = (routine: StretchRoutine) => run(async () => {
    const session = await startStretchSession(routine);
    await sendStretchStart(session.id);
    await onStarted();
    return null;
  }, "The routine didn't start. Try again.");

  if (!list) return null;
  const disabled = busy || working || startDisabled;
  const id = list.id;

  if (editing) {
    return <section className="stretch-routines" aria-label="Edit stretch routine">
      <StretchRoutineEditor routine={editing} busy={working} onCancel={() => setEditing(null)}
        onSave={(routine) => void run(async () => { await saveStretchRoutine(routine, id); setEditing(null); return `${routine.name} saved.`; }, "That didn't save. Nothing changed.")} />
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>;
  }

  return (
    <section className="stretch-routines" aria-label="Stretch">
      {suggestion && (
        <div className="stretch-routines__suggest">
          <p className="tool-label">STRETCH</p>
          <p className="meta">{suggestion.why} {suggestion.routine.name} fits now · {minutes(suggestion.routine)}.</p>
          <button type="button" className="btn-secondary" disabled={disabled} onClick={() => void start(suggestion.routine)}>START {suggestion.routine.name.toUpperCase()}</button>
        </div>
      )}
      <details open={listOpen} onToggle={(e) => setListOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>STRETCH ROUTINES</summary>
        {list.routines.length === 0 && <p className="meta">No routines. RESET a starter below, or make your own.</p>}
        {list.routines.map((r) => (
          <div key={r.id} className="stretch-routine">
            <span className="stretch-routine__name"><strong>{r.name}</strong> <span className="meta">· {minutes(r)}</span></span>
            <button type="button" className="btn-secondary" disabled={disabled} aria-label={`Start ${r.name}`} onClick={() => void start(r)}>START</button>
            <button type="button" className="btn-secondary" disabled={busy || working} aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>EDIT</button>
            {r.starter && <button type="button" className="btn-secondary" disabled={busy || working} aria-label={`Reset ${r.name}`} onClick={() => void run(async () => { await resetStarterRoutine(r.starter!, id); return `${r.name} is back as it started.`; }, "That didn't reset. Nothing changed.")}>RESET</button>}
            {confirmDelete === r.id
              ? <button type="button" className="btn-secondary" disabled={busy || working} aria-label={`Confirm delete ${r.name}`} onClick={() => void run(async () => { await deleteStretchRoutine(r.id, id); setConfirmDelete(null); return `${r.name} deleted.${r.starter ? " RESET brings it back." : ""}`; }, "That didn't delete. Nothing changed.")}>CONFIRM DELETE</button>
              : <button type="button" className="btn-secondary" disabled={busy || working} aria-label={`Delete ${r.name}`} onClick={() => setConfirmDelete(r.id)}>DELETE</button>}
          </div>
        ))}
        {(["AFTER_SHIFT", "BEFORE_SLEEP", "AFTER_LIFTING"] as const).filter((k) => !list.routines.some((r) => r.starter === k)).map((k) => (
          <div key={k} className="stretch-routine">
            <span className="stretch-routine__name meta">{k === "AFTER_SHIFT" ? "After shift" : k === "BEFORE_SLEEP" ? "Before sleep" : "After lifting"} (deleted)</span>
            <button type="button" className="btn-secondary" disabled={busy || working} onClick={() => void run(async () => { await resetStarterRoutine(k, id); return "Starter brought back."; }, "That didn't reset. Nothing changed.")}>RESET</button>
          </div>
        ))}
        <button type="button" className="btn-secondary stretch-routine__start" disabled={busy || working}
          onClick={() => setEditing({ id: newStretchRoutineId(), name: "My stretch", steps: [{ stretchId: "stretch-childs-pose", holdSeconds: 30, bothSides: false, rounds: 1 }] })}>NEW ROUTINE</button>
      </details>
      {note && <p className="meta" role="status">{note}</p>}
      {error && <p className="meta meta--error" role="alert">{error}</p>}
    </section>
  );
}
