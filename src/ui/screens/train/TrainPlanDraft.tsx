import { useEffect, useMemo, useRef, useState } from "react";
import { buildGraysonPlanDraft, TRAINING_FOCUS_OPTIONS, type DraftExercise, type SessionMinutes, type TrainingFocus } from "../../../domain/workout/graysonPlanDraft";

const FORMS = ["full", "short", "minimum", "home"] as const;
type Form = typeof FORMS[number];

function ExerciseList({ exercises, focus }: { exercises: DraftExercise[]; focus: TrainingFocus[] }) {
  return <ol className="train-plan-draft__exercises">{exercises.map((exercise) => <li key={`${exercise.name}-${exercise.role}`}>
    <div><b>{exercise.name}</b>{exercise.muscles.some((muscle) => focus.includes(muscle)) && <span className="source-tag"> EMPHASIS</span>}<p>{exercise.role}</p></div>
    <span>{exercise.sets} × {exercise.reps}</span>
  </li>)}</ol>;
}

export function TrainPlanDraft({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<TrainingFocus[]>(["Chest", "Triceps", "Traps"]);
  const [minutes, setMinutes] = useState<SessionMinutes>(50);
  const [form, setForm] = useState<Form>("full");
  const plan = useMemo(() => buildGraysonPlanDraft(focus, minutes), [focus, minutes]);

  useEffect(() => { dialog.current?.showModal(); }, []);
  const close = () => { dialog.current?.close(); onClose(); };
  const toggleFocus = (value: TrainingFocus) => setFocus((current) => current.includes(value)
    ? current.filter((item) => item !== value)
    : current.length < 3 ? [...current, value] : current);

  return <dialog ref={dialog} className="train-plan-draft" aria-labelledby="train-plan-draft-title" onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className="train-plan-draft__head"><div><p className="tool-label">PLAN DRAFT · {step + 1} OF 4</p><h2 id="train-plan-draft-title">Your three-day plan</h2></div><button type="button" className="btn-secondary" onClick={close}>CLOSE</button></header>

    {step === 0 && <section>
      <p className="meta-strong">A USEFUL DEFAULT, NOT A BLANK FORM</p>
      <p>Full-body training stays balanced. Choose up to three areas for added attention; emphasis changes dosage and order, not the programme's identity.</p>
      <fieldset><legend>Current emphasis</legend><div className="train-plan-draft__choices">{TRAINING_FOCUS_OPTIONS.map((item) => <button key={item} type="button" className={`chip ${focus.includes(item) ? "chip--selected" : ""}`} aria-pressed={focus.includes(item)} onClick={() => toggleFocus(item)}>{item.toUpperCase()}</button>)}</div><p className="meta">{focus.length}/3 selected. Planet Fitness, true bench station and bodyweight home fallback are draft assumptions.</p></fieldset>
      <fieldset><legend>Realistic full-session time</legend><div className="train-plan-draft__choices">{([35, 50, 65] as const).map((value) => <button key={value} type="button" className={`chip ${minutes === value ? "chip--selected" : ""}`} aria-pressed={minutes === value} onClick={() => setMinutes(value)}>{value} MIN</button>)}</div></fieldset>
    </section>}

    {step === 1 && <section>
      <p className="meta-strong">SEQUENCE, NOT FIXED WEEKDAYS · {minutes} MINUTES</p>
      <p>A, B and C remain in order around shifts and recovery. Missing a date creates no catch-up debt.</p>
      {plan.map((session) => <article className="suit-panel" key={session.id}><p className="tool-label">SESSION {session.id}</p><h3>{session.title}</h3><p>{session.purpose}</p><ExerciseList exercises={session.full} focus={focus} /></article>)}
    </section>}

    {step === 2 && <section>
      <p className="meta-strong">THE PLAN SURVIVES REAL LIFE</p>
      <div className="train-plan-draft__choices">{FORMS.map((value) => <button key={value} type="button" className={`chip ${form === value ? "chip--selected" : ""}`} aria-pressed={form === value} onClick={() => setForm(value)}>{value.toUpperCase()}</button>)}</div>
      <p className="meta">{form === "home" ? "Home preserves a useful appointment but does not pretend prone movement replaces loaded pulling." : form === "minimum" ? "Minimum is useful work, not equivalent to the full session." : form === "short" ? "Short keeps each session's three foundation movements." : "Full carries the selected emphasis and balance."}</p>
      {plan.map((session) => <article className="suit-panel" key={session.id}><p className="tool-label">SESSION {session.id} · {form.toUpperCase()}</p><h3>{session.title}</h3><ExerciseList exercises={session[form]} focus={focus} /></article>)}
    </section>}

    {step === 3 && <section className="suit-panel">
      <p className="tool-label">COMPLETE PREVIEW · UNSAVED</p><h3>Balanced foundation, {focus.length ? `${focus.join(" · ")} emphasis` : "no added emphasis"}</h3>
      <p>Three ordered full-body sessions · approximately {minutes} minutes in the full form · short, minimum and home versions available.</p>
      <p><b>Nothing has been activated.</b> Your current templates, programme, workout suggestion and history are unchanged. A later separately reviewed objective must define confirmation and activation.</p>
    </section>}

    <footer className="train-plan-draft__actions">{step > 0 && <button type="button" className="btn-secondary" onClick={() => setStep((value) => value - 1)}>BACK</button>}{step < 3 ? <button type="button" className="btn-primary" onClick={() => setStep((value) => value + 1)}>CONTINUE</button> : <button type="button" className="btn-primary" onClick={close}>RETURN TO TRAIN</button>}</footer>
  </dialog>;
}
