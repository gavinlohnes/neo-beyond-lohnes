import { readEstimateForm, type EstimateForm } from "../../domain/intent/estimate";
import "./estimateFields.css";

/**
 * TIMEBOX-001: his own time estimate as hours + minutes (stored as whole minutes). Both blank = no estimate.
 * Never required, never prefilled with a guess.
 */
export function EstimateFields({ idPrefix, form, onChange, disabled }: { idPrefix: string; form: EstimateForm; onChange: (form: EstimateForm) => void; disabled?: boolean }) {
  const read = readEstimateForm(form);
  return <fieldset className="estimate-fields" disabled={disabled} aria-describedby={`${idPrefix}-estimate-help`}>
    <legend className="meta">Time estimate (optional)</legend>
    <div className="estimate-fields__boxes">
      <div>
        <label htmlFor={`${idPrefix}-estimate-hours`} className="meta">Hours</label>
        <input id={`${idPrefix}-estimate-hours`} className="input" type="text" inputMode="numeric" autoComplete="off" value={form.hours} aria-invalid={!read.ok || undefined} onChange={(e) => onChange({ ...form, hours: e.target.value })} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-estimate-minutes`} className="meta">Minutes</label>
        <input id={`${idPrefix}-estimate-minutes`} className="input" type="text" inputMode="numeric" autoComplete="off" value={form.minutes} aria-invalid={!read.ok || undefined} onChange={(e) => onChange({ ...form, minutes: e.target.value })} />
      </div>
    </div>
    <p id={`${idPrefix}-estimate-help`} className="meta estimate-fields__help" role={read.ok ? undefined : "alert"}>{read.ok ? "Your guess, up to 8 hours. Leave blank for none." : read.message}</p>
  </fieldset>;
}
