import { LogSheet } from "../../components/LogSheet";
import { CHECK_IN_FIELDS, isCheckInComplete, rangeForField, describeCheckInValues, type PartialCheckInValues, type CheckInValues } from "./checkInFields";
const ANCHORS = { energy: ["Drained", "Sharp"], stress: ["Calm", "Maxed"], mood: ["Low", "Good"], soreness: ["None", "Wrecked"], alcoholUrge: ["None", "Strong"] } as const;
export function CheckInSheet({ open, close, values, setValues, busy, isInFlight, submit, quick, quickValues, error }: {
  open: boolean; close: () => void; values: PartialCheckInValues;
  setValues: (update: (values: PartialCheckInValues) => PartialCheckInValues) => void;
  busy: boolean; isInFlight: () => boolean; submit: () => void; quick: () => void; quickValues: CheckInValues; error?: string | null;
}) {
  return <LogSheet open={open} title="CHECK IN" onClose={close} canClose={() => !isInFlight()}>
    {CHECK_IN_FIELDS.map((field) => <section className="check-in-scale" key={field.key} aria-label={field.label}>
      <h3>{field.key === "alcoholUrge" ? "Urge" : field.label}</h3>
      <div className="meta"><span>{ANCHORS[field.key][0]}</span><span>{ANCHORS[field.key][1]}</span></div>
      <div role="group" aria-label={field.label}>{rangeForField(field).map((n) => <button type="button" className={`chip${values[field.key] === n ? " chip--selected" : ""}`} aria-pressed={values[field.key] === n} disabled={busy} key={n} onClick={() => setValues((old) => ({ ...old, [field.key]: n }))}>{n}</button>)}</div>
    </section>)}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="btn-primary" disabled={busy || !isCheckInComplete(values)} onClick={submit}>SUBMIT CHECK-IN</button>
    <details><summary>ALL GOOD</summary><p className="meta">{describeCheckInValues(quickValues)}. Submits immediately.</p><button type="button" className="btn-secondary" disabled={busy} onClick={quick}>ALL GOOD</button></details>
  </LogSheet>;
}
