import { captureCommitFeedback } from "../../feel/feedback";
import { useId, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { DECLINE_OUTCOMES, answerFollowUp } from "../../../application/reflect";
import { describeError } from "../../errorMessage";
import "./reflect.css";

/**
 * LOOP-002: "how did it go?" for a reason you gave on an earlier recommendation of the same kind,
 * asked on the card where that kind of advice is back. One tap answers it through the journal's
 * own review; then REMEMBER shows your conclusion here next time. Optional; never changes advice.
 */
export function AskHowItWent({ entry, onAnswered }: { entry: DecisionJournalEntry; onAnswered?: (() => void) | undefined }) {
  const uid = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const when = new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  async function answer(outcome: string) {
    const acknowledge = captureCommitFeedback();
    if (busy) return;
    setBusy(true); setError("");
    try { await answerFollowUp(entry.id, outcome); acknowledge("LIGHT"); onAnswered?.(); }
    catch (cause) { setError(describeError(cause, "Could not save.")); }
    finally { setBusy(false); }
  }
  return <div className="reflect" data-ask-how-it-went>
    <p className="meta" id={`${uid}-q`}>Last time ({when}) you said “{entry.decision}”. Looking back? Optional.</p>
    <div className="reflect-chips" role="group" aria-labelledby={`${uid}-q`}>
      {DECLINE_OUTCOMES.map((o) => <button key={o} type="button" className="chip" disabled={busy} onClick={() => void answer(o)}>{o}</button>)}
    </div>
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
