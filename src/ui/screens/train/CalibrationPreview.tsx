import { useEffect, useRef, useState } from "react";
import type { ExercisePrescription } from "../../../domain/workout/types";
import type { LastSetInfo } from "../../../application/trainQueries";

interface Guide {
  role: string;
  setup: string;
  cues: string[];
  mistakes: string[];
  alternatives: string;
}

const GUIDES: Record<string, Guide> = {
  "machine-chest-press": { role: "Horizontal press · chest and triceps", setup: "Set the seat so the handles begin around mid-chest. Keep your upper back supported and feet planted.", cues: ["Shoulders stay down and back", "Press without bouncing", "Finish under control"], mistakes: ["Seat too high or low", "Shoulders rolling forward"], alternatives: "Dumbbell or barbell bench press · at home: an appropriate push-up level" },
  "pec-deck": { role: "Chest isolation", setup: "Adjust the seat so your upper arms line up near chest height. Begin with a comfortable stretch.", cues: ["Chest stays tall", "Move the upper arms together", "Return slowly"], mistakes: ["Reaching with the hands", "Forcing an excessive stretch"], alternatives: "Cable fly · at home: push-up" },
  "leg-press": { role: "Knee-dominant legs", setup: "Place both feet securely on the platform and choose a depth you can control without your hips lifting.", cues: ["Knees follow the toes", "Keep the whole foot planted", "Do not slam the stops"], mistakes: ["Knees collapsing inward", "Lower back leaving the pad"], alternatives: "Squat or supported lunge · at home: chair squat" },
  "triceps-pressdown": { role: "Direct triceps work", setup: "Stand stable with elbows beside your body and the cable under control before starting.", cues: ["Elbows stay quiet", "Extend without swinging", "Return with control"], mistakes: ["Using the torso for momentum", "Letting elbows drift forward"], alternatives: "Overhead cable extension · at home: close-grip incline push-up" },
  "lat-pulldown": { role: "Vertical pull · back and arms", setup: "Secure your thighs, take a comfortable grip and begin with your torso tall.", cues: ["Pull elbows toward your sides", "Keep the chest tall", "Control the return"], mistakes: ["Pulling behind the neck", "Turning it into a large body swing"], alternatives: "Assisted pull-up · no honest equipment-free loaded-pull equivalent" },
  "seated-cable-row": { role: "Horizontal pull · back and arms", setup: "Sit braced with a neutral torso and begin with the cable taut.", cues: ["Lead with the elbows", "Finish without shrugging", "Reach forward under control"], mistakes: ["Repeatedly rocking the torso", "Shoulders rising toward the ears"], alternatives: "One-arm dumbbell row · at home: prone Y-T-W for scapular movement, not equivalent load" },
  "leg-curl": { role: "Knee flexion · hamstrings", setup: "Align the machine pivot with your knee and secure the pad without pinching.", cues: ["Keep hips against the pad", "Curl smoothly", "Control the return"], mistakes: ["Lifting the hips", "Dropping the weight stack"], alternatives: "Romanian deadlift · at home: bridge walkout" },
  "preacher-curl": { role: "Direct elbow flexion · arms", setup: "Set the seat so your upper arms rest fully on the pad without reaching.", cues: ["Upper arms stay planted", "Curl without bouncing", "Lower under control"], mistakes: ["Lifting the elbows", "Snapping into full extension"], alternatives: "Dumbbell or hammer curl · at home: defer direct loaded curl work" },
  "machine-shoulder-press": { role: "Vertical press · shoulders and triceps", setup: "Set the seat so the handles begin around shoulder height and your back remains supported.", cues: ["Ribs stay controlled", "Press smoothly", "Lower to a comfortable depth"], mistakes: ["Overarching the lower back", "Forcing painful depth"], alternatives: "Dumbbell shoulder press · at home: elevated pike push-up if appropriate" },
  "reverse-pec-deck": { role: "Rear shoulders and upper back", setup: "Face the pad with handles near shoulder height and keep the chest supported.", cues: ["Move from the shoulders", "Keep the neck relaxed", "Return slowly"], mistakes: ["Shrugging", "Using momentum"], alternatives: "Face pull or rear-delt raise · at home: prone Y-T-W" },
};

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
  const guide = GUIDES[exercise.exerciseId] ?? FALLBACK;

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
