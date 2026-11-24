import { useEffect, useRef, useState } from "react";
import type { ExercisePrescription } from "../../../domain/workout/types";
import type { LastSetInfo } from "../../../application/trainQueries";
import { howToFor, type Guide } from "../../../domain/workout/exerciseHowTo";

// GRAYSON-TRAIN-HOWTO-001: the ten guides moved, unchanged, into the one shared how-to module.
const FALLBACK: Guide = {
  role: "Current programme exercise",
  setup: "Use the machine or equipment instructions and begin with a load you can control comfortably.",
  cues: ["Use a controlled range", "Keep the setup repeatable", "Stop if you report pain"],
  mistakes: ["Adding load before the movement is repeatable", "Treating unfamiliar equipment as equivalent"],
  alternatives: "Use REPLACE in the normal workout flow when an appropriate alternative is needed.",
};

export function CalibrationPreview({ exercise, templateLabel, lastSet, personalCue, readError, onClose }: {
  exercise: ExercisePrescription;
  templateLabel: string;
  lastSet?: LastSetInfo;
  personalCue?: string;
  readError?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<"LIGHT" | "RIGHT" | "HARD" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const guide = howToFor(exercise.exerciseId) ?? FALLBACK;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const parent = root.current?.parentElement;
    const siblings = parent ? [...parent.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== root.current) : [];
    const prior = siblings.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    for (const element of siblings) { element.inert = true; element.setAttribute("aria-hidden", "true"); }
    root.current?.focus();
    return () => {
      for (const item of prior) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden"); else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
      previous?.focus();
    };
  }, []);

  function containFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    if (!focusable.length) { event.preventDefault(); root.current?.focus(); return; }
    const first = focusable[0]!, last = focusable.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first.focus(); }
  }

  const response = feedback === "LIGHT"
    ? "Preview only: a later calibrated session could propose a small increase, then ask you to approve it."
    : feedback === "HARD"
      ? "Preview only: a later calibrated session could hold or reduce the next preparation step. One response would not rewrite your programme."
      : feedback === "RIGHT"
        ? "Preview only: repeatable, controlled work is enough. Calibration does not require proving a maximum."
        : "Choose an example response to see how Delta would react. Nothing is saved.";

  return <div ref={root} tabIndex={-1} className="calibration-preview" role="dialog" aria-modal="true" aria-labelledby="calibration-title" onKeyDown={containFocus}>
    <header className="calibration-preview__head">
      <div><p className="tool-label">CALIBRATION PREVIEW · {step + 1} OF 4</p><h2 id="calibration-title">{exercise.name}</h2></div>
      <button type="button" className="btn-secondary" onClick={onClose}>CLOSE</button>
    </header>

    {step === 0 && <section className="suit-panel">
      <p className="meta-strong">WORKOUT {templateLabel} · READ ONLY</p>
      <p>Calibration is not a test. This walkthrough shows how GRAYSON could establish a conservative starting point without starting a workout, logging a set or changing your programme.</p>
      <p className="meta">Direct START WORKOUT remains available when you close this preview.</p>
    </section>}

    {step === 1 && <section className="suit-panel">
      <p className="tool-label">PURPOSE</p><p className="meta-strong">{guide.role}</p>
      <p>{guide.setup}</p>
      <h3>Cues</h3><ul>{guide.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
      <h3>Common mistakes</h3><ul>{guide.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
      <p><b>Alternative:</b> {guide.alternatives}</p>
      {personalCue && <p className="calibration-preview__own"><b>Your recorded cue:</b> {personalCue}</p>}
    </section>}

    {step === 2 && <section className="suit-panel">
      <p className="tool-label">STARTING EVIDENCE</p>
      {readError ? <p role="alert">Prior evidence is unavailable: {readError} The preview will not invent a starting load.</p>
        : lastSet ? <p><b>Last comparable working set:</b> {lastSet.weight} lb × {lastSet.reps}{lastSet.recordedAt ? ` · ${new Date(lastSet.recordedAt).toLocaleDateString()}` : ""}. This is context, not today's prescribed load.</p>
          : <p><b>No comparable performance found.</b> Begin with the unloaded machine, empty bar or another deliberately light preparation load. The preview does not calculate a load from bodyweight or appearance.</p>}
      <ol>
        <li>Confirm the setup and comfortable range.</li>
        <li>Complete a short, deliberately light preparation set.</li>
        <li>Report how it felt before any proposed increase.</li>
        <li>Approve the working load yourself in the real workout.</li>
      </ol>
    </section>}

    {step === 3 && <section className="suit-panel">
      <p className="tool-label">EXAMPLE FEEDBACK · NOT SAVED</p>
      <div className="calibration-preview__choices">
        {([['LIGHT', 'VERY LIGHT'], ['RIGHT', 'ABOUT RIGHT'], ['HARD', 'TOO HARD']] as const).map(([value, label]) => <button type="button" className={`chip ${feedback === value ? "chip--selected" : ""}`} aria-pressed={feedback === value} key={value} onClick={() => setFeedback(value)}>{label}</button>)}
      </div>
      <p aria-live="polite">{response}</p>
      <p className="meta">Closing discards this example response. No set, cue, memory, programme or recommendation is written.</p>
    </section>}

    <footer className="calibration-preview__actions">
      {step > 0 && <button type="button" className="btn-secondary" onClick={() => setStep((value) => value - 1)}>BACK</button>}
      {step < 3 ? <button type="button" className="btn-primary" onClick={() => setStep((value) => value + 1)}>CONTINUE</button>
        : <button type="button" className="btn-primary" onClick={onClose}>RETURN TO TRAIN</button>}
    </footer>
  </div>;
}
