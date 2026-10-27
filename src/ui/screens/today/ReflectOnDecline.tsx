import { captureCommitFeedback } from "../../feel/feedback";
import { useEffect, useId, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { DECLINE_REASONS, getReflectionFor, reflectOnDecline, type DeclineReason } from "../../../application/reflect";
import { describeError } from "../../errorMessage";
import "./reflect.css";

/**
 * LOOP step 2 — REFLECT: after "Not doing this", an optional one-tap reason (and a note) saved to
 * the Decision Journal, linked to the recommendation. Skipping it is fine; the decline already
 * stands. Next lived day the journal asks how it went. Never changes the recommendation.
 */
export function ReflectOnDecline({ recommendationId, title, why }: { recommendationId: string; title: string; why: string }) {
  const uid = useId();
  const [saved, setSaved] = useState<DecisionJournalEntry | null | undefined>(undefined);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void getReflectionFor(recommendationId).then((entry) => { if (live) setSaved(entry ?? null); }, () => { if (live) setSaved(null); });
    return () => { live = false; };
  }, [recommendationId]);

  if (saved === undefined) return null;
  if (saved) return <p className="meta" data-reflect-saved>Saved to your journal: {saved.decision}. From the next lived day, your journal asks how it went.</p>;

  async function save() {
    const acknowledge = captureCommitFeedback();
    if (!reason || busy) return;
    setBusy(true); setError("");
    try { setSaved(await reflectOnDecline({ id: recommendationId, title, why }, reason, note)); acknowledge("LIGHT"); }
    catch (cause) { setError(describeError(cause, "Could not save to the journal.")); }
    finally { setBusy(false); }
  }

  return <div className="reflect" data-reflect>
    <p className="meta" id={`${uid}-why`}>Why not? Optional. It goes in your journal, not into the advice.</p>
    <div className="reflect-chips" role="group" aria-labelledby={`${uid}-why`}>
      {DECLINE_REASONS.map((r) => <button key={r} type="button" className={`chip ${reason === r ? "chip--selected" : ""}`} aria-pressed={reason === r} disabled={busy} onClick={() => setReason(r)}>{r}</button>)}
    </div>
    {reason && <>
      <label className="meta" htmlFor={`${uid}-note`}>Anything to add? Optional.</label>
      <input id={`${uid}-note`} className="input" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void save()}>SAVE TO JOURNAL</button>
    </>}
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
