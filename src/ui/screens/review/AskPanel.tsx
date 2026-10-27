import { useState } from "react";
import type { PictureRow } from "../../../application/wholePictureProjection";
import { ASK_QUESTIONS, type AskQuestion } from "../../../application/askProjection";
import { shortDate } from "./rotationCopy";

/**
 * LOOP step 1 — ASK (owner approval 2026-10-27, "Go loop"): pick a question, read an answer built by rules
 * from your own recorded days, and open the exact days behind every line. When there is not enough yet,
 * it says what is missing. Read-only: nothing here writes, scores or changes advice.
 */
export function AskPanel({ rows, onInspect }: { rows: readonly PictureRow[]; onInspect: (row: PictureRow) => void }) {
  const [asked, setAsked] = useState<AskQuestion | null>(null);
  const question = ASK_QUESTIONS.find((q) => q.id === asked);
  const answer = question?.answer(rows);
  return <section className="ask" aria-labelledby="ask-heading">
    <div className="section-head"><div><p className="eyebrow">Ask BEYOND / answered from your records</p><h2 id="ask-heading">Ask about your own days.</h2></div></div>
    <p className="muted small">Each answer is worked out from the days you recorded in the last {rows.length}. Every line opens the days it came from. Patterns, not causes; nothing here changes advice.</p>
    <div className="ask-questions" role="group" aria-label="Questions">
      {ASK_QUESTIONS.map((q) => <button type="button" key={q.id} className="outlined" aria-pressed={asked === q.id} onClick={() => setAsked(q.id)}>{q.label}</button>)}
    </div>
    {question && answer && <div className="ask-answer" aria-live="polite" data-ask-answer={question.id}>
      <h3>{question.label}</h3>
      {answer.status === "NOT_YET"
        ? <p data-ask-not-yet>Not enough recorded yet: this needs {answer.need}.</p>
        : <ul>{answer.lines.map((line, index) => <li key={index}>
          <p>{line.text}</p>
          {line.rows.length > 0 && <details className="ask-days"><summary>{line.rows.length} {line.rows.length === 1 ? "day" : "days"} behind this</summary>
            <ul>{line.rows.map((row) => <li key={row.start}><button type="button" className="textbutton" onClick={() => onInspect(row)} aria-label={`${shortDate(row.start)}. Open records.`}>{shortDate(row.start)}</button></li>)}</ul>
          </details>}
        </li>)}</ul>}
    </div>}
  </section>;
}
