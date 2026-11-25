import { useState, type ReactNode } from "react";
import { TalkButton } from "../../speech/TalkButton";
import { readCheckInWords } from "../../../application/helper/freeHelper";
import type { CheckInDraft } from "../../../engine/checkInDraft";
import { LogSheet } from "../../components/LogSheet";
import { CHECK_IN_FIELDS, isCheckInComplete, rangeForField, describeCheckInValues, type PartialCheckInValues, type CheckInValues } from "./checkInFields";
const ANCHORS = { energy: ["Drained", "Sharp"], stress: ["Calm", "Maxed"], mood: ["Low", "Good"], soreness: ["None", "Wrecked"], alcoholUrge: ["None", "Strong"] } as const;
export function CheckInSheet({ open, close, values, setValues, busy, isInFlight, submit, quick, quickValues, error, previous, sameAsLast, mode = "new", children }: {
  /** GRAYSON-CHECKIN-EDIT-001: "fix" corrects a sent check-in; SAME AS LAST, ALL GOOD and the reference block hide. */
  mode?: "new" | "fix";
  /** Fix mode only: the edited detail (before and after, Put it back). */
  children?: ReactNode;
  previous?: CheckInDraft | null | undefined;
  /** OWNER-GO-001: one tap repeats the previous check-in as now. */
  sameAsLast?: (() => void) | undefined;
  open: boolean; close: () => void; values: PartialCheckInValues;
  setValues: (update: (values: PartialCheckInValues) => PartialCheckInValues) => void;
  busy: boolean; isInFlight: () => boolean; submit: () => void; quick?: (() => void) | undefined; quickValues?: CheckInValues | undefined; error?: string | null;
}) {
  const fixing = mode === "fix";
  // GRAYSON-DICTATE-001: TALK fills the chips he names ("energy 3, stress 2"); nothing submits until SUBMIT CHECK-IN.
  const [talkMiss, setTalkMiss] = useState(false);
  function heard(words: string) {
    const said = readCheckInWords(words);
    setTalkMiss(Object.keys(said).length === 0);
    if (Object.keys(said).length) setValues((old) => ({ ...old, ...said }));
  }
  return <LogSheet open={open} title={fixing ? "Fix this check-in" : "CHECK IN"} onClose={close} canClose={() => !isInFlight()}>
    {!fixing && <div className="check-in-talk">
      <TalkButton disabled={busy} onHeard={heard} />
      {talkMiss && <p className="meta" role="status">Say each one with a number, like energy 3.</p>}
    </div>}
    {!fixing && previous && sameAsLast && <div className="check-in-same">
      <button type="button" className="btn-secondary" disabled={busy} onClick={sameAsLast}>SAME AS LAST</button>
      <p className="meta">{describeCheckInValues(previous.value)}. Submits now, as how you feel now.</p>
    </div>}
    {CHECK_IN_FIELDS.map((field) => <section className="check-in-scale" key={field.key} aria-label={field.label}>
      <h3>{field.key === "alcoholUrge" ? "Urge" : field.label}</h3>
      <div className="meta"><span>{ANCHORS[field.key][0]}</span><span>{ANCHORS[field.key][1]}</span></div>
      <div role="group" aria-label={field.label}>{rangeForField(field).map((n) => <button type="button" className={`chip${values[field.key] === n ? " chip--selected" : ""}`} aria-pressed={values[field.key] === n} disabled={busy} key={n} onClick={() => setValues((old) => ({ ...old, [field.key]: n }))}>{n}</button>)}</div>
    </section>)}
    {!fixing && previous && <details><summary>Previous check-in · reference</summary><p className="meta">{previous.reason}. {describeCheckInValues(previous.value)}.</p>{previous.since.length > 0 && <p className="meta">Since then: {previous.since.join(" · ")}</p>}<p className="meta">Reference only. Choose how you feel now.</p></details>}
    {fixing && children}
    {error && <p role="alert">{error}</p>}
    <button type="button" className="btn-primary" disabled={busy || !isCheckInComplete(values)} onClick={submit}>{fixing ? "SAVE FIX" : "SUBMIT CHECK-IN"}</button>
    {!fixing && quick && quickValues && <details><summary>ALL GOOD</summary><p className="meta">{describeCheckInValues(quickValues)}. Submits immediately.</p><button type="button" className="btn-secondary" disabled={busy} onClick={quick}>ALL GOOD</button></details>}
  </LogSheet>;
}
