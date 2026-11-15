import { useRef, useState } from "react";
import { getWorkRunDraft, type WorkRunDraft } from "../../../application/workRunPlan";
import { captureItem } from "../../../application/commands";
import { useSessionDraft } from "../../sessionDrafts";
import { describeError } from "../../errorMessage";

export function WorkRunPlanner({ active, onOpenCapture }: { active: boolean; onOpenCapture?: (() => void) | undefined }) {
  const [draft, setDraft] = useState<WorkRunDraft | null>(null), [text, setText] = useState("");
  const [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false), [replace, setReplace] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useSessionDraft("work-run-plan", Boolean(text.trim() && !saved));
  async function generate(force = false) {
    if (lock.current || !active) return;
    if (!force && draft && !saved && text !== draft.text) { setReplace(true); return; }
    lock.current = true; setBusy(true); setError(null);
    try { const next = await getWorkRunDraft(); setDraft(next); setText(next.text ?? ""); setSaved(false); setConfirm(false); setReplace(false); }
    catch (cause) { setError(describeError(cause, "Could not read the run planning sources. Your existing draft is kept; records are unchanged.")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save() {
    if (lock.current || !active || !confirm || !text.trim() || saved) return;
    lock.current = true; setBusy(true); setError(null);
    try { await captureItem(text); setSaved(true); setConfirm(false); }
    catch (cause) { setError(describeError(cause, "Could not save the plan note. Your draft is kept.")); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="suit-panel" aria-label="Work-run plan">
    <h2 className="more-title">Plan your work run</h2>
    <p className="meta">One editable draft from your existing plans and records. Confirm once to save a plan note in Capture; each feature keeps its existing action controls.</p>
    <button type="button" className="btn-secondary" disabled={busy || !active} onClick={() => void generate()}>{draft ? "REFRESH RUN DRAFT" : "DRAFT WORK RUN"}</button>
    {replace && <div role="group" aria-label="Replace edited draft"><p>Your edits will be replaced by a fresh snapshot. The saved records will not change.</p><button type="button" className="btn-secondary" disabled={busy} onClick={() => void generate(true)}>REPLACE EDITED DRAFT</button>{" "}<button type="button" className="btn-secondary" disabled={busy} onClick={() => setReplace(false)}>KEEP MY DRAFT</button></div>}
    {error && <p role="alert">{error}</p>}
    {draft?.message && <p role="status">{draft.message}</p>}
    {draft?.text && <>
      <label htmlFor="work-run-draft">Review and edit your plan note</label>
      <textarea id="work-run-draft" className="input" rows={16} style={{ width: "100%", fontSize: 16 }} value={text} disabled={busy || saved || confirm} onChange={(e) => { setText(e.target.value); setConfirm(false); }} />
      {!saved && !confirm && <button type="button" className="btn-primary" disabled={busy || !text.trim() || !active} onClick={() => setConfirm(true)}>REVIEW PLAN NOTE</button>}
      {confirm && <div role="group" aria-label="Confirm plan note"><p>Save this reviewed text in Capture? It saves a snapshot, not scheduled actions. Nothing else is changed.</p><button type="button" className="btn-primary" disabled={busy || !active} onClick={() => void save()}>CONFIRM SAVE PLAN NOTE</button>{" "}<button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirm(false)}>BACK TO EDIT</button></div>}
    </>}
    {saved && <div role="status"><p>Plan note saved in Capture. Task dates, workouts, meal logs and preparation are unchanged. Refresh to draft again after new information.</p>{onOpenCapture && <button type="button" className="btn-secondary" onClick={onOpenCapture}>OPEN CAPTURE</button>}</div>}
  </section>;
}
