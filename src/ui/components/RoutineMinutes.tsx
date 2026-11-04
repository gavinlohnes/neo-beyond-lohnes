import { useId } from "react";
import { routineDraftKeys } from "./routineDraft";

export function RoutineMinutes({ steps, edits, onChange, disabled }: {
  steps: readonly { id?: string; text: string; minutes?: number }[];
  edits: Record<string, string>; onChange: (edits: Record<string, string>) => void; disabled: boolean;
}) {
  const uid = useId(), keys = routineDraftKeys(steps);
  if (!steps.length) return null;
  return <fieldset className="routine-minutes"><legend>Minutes per step (optional)</legend>
    <p className="meta">Your estimate, 1–240 minutes. Leave a step blank to keep it untimed.</p>
    {steps.map((step, i) => <label key={keys[i]} htmlFor={`${uid}-${i}`}>
      <span>{step.text}</span>
      <input id={`${uid}-${i}`} type="number" min={1} max={240} step={1} inputMode="numeric" className="input"
        aria-label={`Step ${i + 1} minutes (optional)`} disabled={disabled}
        value={edits[keys[i]!] ?? (step.minutes === undefined ? "" : String(step.minutes))}
        onChange={(e) => onChange({ ...edits, [keys[i]!]: e.target.value })} />
    </label>)}
  </fieldset>;
}
