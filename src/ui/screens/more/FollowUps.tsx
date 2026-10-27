import { useId, useState } from "react";
import type { DecisionJournalEntry } from "../../../domain/journal/types";
import { DEBRIEF_OUTCOMES, DECLINE_OUTCOMES, answerFollowUp, followUpsDue, isShiftDebrief } from "../../../application/reflect";
import { describeError } from "../../errorMessage";
import "../today/reflect.css";

/**
 * LOOP step 2 — REFLECT: "How did it go?" for reasons given on an earlier lived day and for
 * debriefs with a plan. One tap answers it (the journal's own review); a lesson is optional.
 * Unanswered ones simply wait — nothing nags or expires. Reads the Journal's own loaded list.
 */
export function FollowUps({ entries, onAnswered }: { entries: readonly DecisionJournalEntry[]; onAnswered: () => void }) {
  const due = followUpsDue(entries);
  if (!due.length) return null;
  return <section className="follow-ups" aria-labelledby="follow-ups-heading" data-follow-ups>
    <h2 id="follow-ups-heading" className="section-label">How did it go?</h2>
    {due.map((entry) => <FollowUp key={entry.id} entry={entry} onDone={onAnswered} />)}
  </section>;
}

function FollowUp({ entry, onDone }: { entry: DecisionJournalEntry; onDone: () => void }) {
  const uid = useId();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [lesson, setLesson] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const debrief = isShiftDebrief(entry);
  const choices = debrief ? DEBRIEF_OUTCOMES : DECLINE_OUTCOMES;
  const when = new Date(entry.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  async function save() {
    if (!outcome || busy) return;
    setBusy(true); setError("");
    try { await answerFollowUp(entry.id, outcome, lesson); onDone(); }
    catch (cause) { setError(describeError(cause, "Could not save.")); setBusy(false); }
  }

  return <div className="follow-up reflect" data-follow-up={entry.id}>
    <p className="card-title">{debrief ? `Your shift debrief, ${when}` : entry.title}</p>
    <p className="meta">{debrief ? entry.expectation ?? entry.decision : `${when}: you said “${entry.decision}”${entry.reasoning ? ` — ${entry.reasoning}` : ""}.`}</p>
    <div className="reflect-chips" role="group" aria-label={debrief ? "Did the one thing happen?" : "Looking back"}>
      {choices.map((c) => <button key={c} type="button" className={`chip ${outcome === c ? "chip--selected" : ""}`} aria-pressed={outcome === c} disabled={busy} onClick={() => setOutcome(c)}>{c}</button>)}
    </div>
    {outcome && <>
      <label className="meta" htmlFor={`${uid}-lesson`}>Lesson for next time? Optional.</label>
      <input id={`${uid}-lesson`} className="input" value={lesson} maxLength={280} onChange={(e) => setLesson(e.target.value)} />
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => void save()}>SAVE</button>
    </>}
    {error && <p role="alert" className="meta">{error}</p>}
  </div>;
}
