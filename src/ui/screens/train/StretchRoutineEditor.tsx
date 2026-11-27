import { useEffect, useRef, useState } from "react";
import { STRETCH_BY_ID, STRETCH_HOLD_MAX, STRETCH_HOLD_MIN, STRETCH_ROUNDS_MAX, STRETCHES, stretchRoutineProblem, stretchRoutineSeconds, type StretchRoutine, type StretchStep } from "../../../domain/workout/stretchLibrary";

/**
 * GRAYSON-HOME-STRETCH-001 slice B: edit one stretch routine. Its name, its stretches and their order, each hold,
 * rounds, and whether a one-sided stretch is done on both sides. SAVE checks it first; CANCEL leaves it as it was.
 */
const HOLDS = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300].filter((h) => h >= STRETCH_HOLD_MIN && h <= STRETCH_HOLD_MAX);
const holdLabel = (s: number) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);

export function StretchRoutineEditor({ routine, busy, onSave, onCancel }: {
  routine: StretchRoutine;
  busy: boolean;
  onSave: (routine: StretchRoutine) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(routine.name);
  const [steps, setSteps] = useState<StretchStep[]>(() => routine.steps.map((s) => ({ ...s })));
  const [adding, setAdding] = useState(STRETCHES[0]!.id);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const draft: StretchRoutine = { ...routine, name, steps };
  const problem = stretchRoutineProblem(draft);
  const patch = (i: number, change: Partial<StretchStep>) => setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...change } : s)));
  const move = (i: number, by: -1 | 1) => setSteps((all) => {
    const to = i + by;
    if (to < 0 || to >= all.length) return all;
    const next = [...all]; [next[i], next[to]] = [next[to]!, next[i]!];
    return next;
  });
  const minutes = Math.round(stretchRoutineSeconds(draft) / 6) / 10;

  return (
    <fieldset className="stretch-edit" disabled={busy} style={{ minWidth: 0 }}>
      <legend>Edit {routine.name}</legend>
      <label>Name<input ref={nameRef} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      <p className="meta">About {minutes} min.</p>
      <ol className="stretch-edit__steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {steps.map((s, i) => {
          const stretch = STRETCH_BY_ID.get(s.stretchId);
          const label = stretch?.name ?? "Unknown stretch";
          return <li key={`${s.stretchId}-${i}`} className="stretch-edit__step">
            <strong>{i + 1}. {label}</strong>
            <div className="stretch-edit__row">
              <label>Hold<select aria-label={`Hold for ${label}`} value={s.holdSeconds} onChange={(e) => patch(i, { holdSeconds: Number(e.target.value) })}>
                {[...new Set([...HOLDS, s.holdSeconds])].sort((a, b) => a - b).map((h) => <option key={h} value={h}>{holdLabel(h)}</option>)}
              </select></label>
              <label>Rounds<select aria-label={`Rounds of ${label}`} value={s.rounds} onChange={(e) => patch(i, { rounds: Number(e.target.value) })}>
                {Array.from({ length: STRETCH_ROUNDS_MAX }, (_, k) => k + 1).map((r) => <option key={r} value={r}>{r}</option>)}
              </select></label>
              {stretch?.oneSided && <label>Sides<select aria-label={`Sides for ${label}`} value={s.bothSides ? "BOTH" : "ONE"} onChange={(e) => patch(i, { bothSides: e.target.value === "BOTH" })}>
                <option value="BOTH">Both sides</option><option value="ONE">One side</option>
              </select></label>}
            </div>
            <div className="stretch-edit__row">
              <button type="button" className="btn-secondary" disabled={i === 0} aria-label={`Move ${label} up`} onClick={() => move(i, -1)}>UP</button>
              <button type="button" className="btn-secondary" disabled={i === steps.length - 1} aria-label={`Move ${label} down`} onClick={() => move(i, 1)}>DOWN</button>
              <button type="button" className="btn-secondary" aria-label={`Remove ${label}`} onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}>REMOVE</button>
            </div>
          </li>;
        })}
      </ol>
      <div className="stretch-edit__row">
        <label>Add a stretch<select aria-label="Stretch to add" value={adding} onChange={(e) => setAdding(e.target.value)}>
          {STRETCHES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <button type="button" className="btn-secondary" onClick={() => {
          const s = STRETCH_BY_ID.get(adding)!;
          setSteps((all) => [...all, { stretchId: s.id, holdSeconds: s.defaultHoldSeconds, bothSides: s.oneSided, rounds: 1 }]);
        }}>ADD</button>
      </div>
      {problem && <p className="meta">{problem}</p>}
      <div className="stretch-edit__actions">
        <button type="button" className="btn-primary" disabled={!!problem} onClick={() => onSave({ ...draft, name: name.trim() })}>SAVE</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>CANCEL</button>
      </div>
    </fieldset>
  );
}
