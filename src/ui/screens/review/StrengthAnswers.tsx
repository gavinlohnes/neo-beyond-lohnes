import { useEffect, useState } from "react";
import { getStrengthReview, type StrengthReviewData } from "../../../application/strengthReviewQueries";
import { describeError } from "../../errorMessage";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const state = (value: number | undefined, count: number) => value === undefined ? `Building up · needs 2 comparable lifts (${count} ready)` : `${pct(value)} estimated strength across ${count} comparable lifts`;

export function StrengthAnswers({ active }: { active: boolean }) {
  const [data, setData] = useState<StrengthReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let alive = true; setError(null);
    void getStrengthReview().then((next) => { if (alive) setData(next); }).catch((cause: unknown) => { if (alive) setError(describeError(cause, "Could not read strength evidence.")); });
    return () => { alive = false; };
  }, [active, retry]);
  if (error) return <p role="alert">{error} <button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY STRENGTH</button></p>;
  if (!data) return <p role="status" className="meta">Reading strength evidence…</p>;
  const muscles = Object.entries(data.muscleSetsPerWeek).sort((a, b) => b[1] - a[1]);
  return <>
    <details className="review-answer"><summary><span>Am I keeping my strength while losing weight?</span><strong>{state(data.overallChangePercent, data.comparableLifts)}</strong></summary>
      <p className="card-body">Strength and weight are shown as separate recorded facts. BEYOND does not infer muscle or fat change.</p>
      <p className="meta">Comparison requires the same lift in at least 2 finished sessions in each 28-day window, and at least 2 comparable lifts for the overall answer.</p>
    </details>
    <details className="review-answer"><summary><span>Am I getting stronger?</span><strong>{data.lifts.some((lift) => lift.status === "IMPROVING") ? `${data.lifts.filter((lift) => lift.status === "IMPROVING").length} lifts improving` : data.comparableLifts ? "No clear increase in comparable lifts" : "Building up · not enough comparable sessions"}</strong></summary>
      <ul className="metric-records">{data.lifts.map((lift) => <li key={lift.exerciseId}><strong>{data.names[lift.exerciseId] ?? lift.exerciseId}</strong> · {lift.changePercent === undefined ? `${lift.recentSessions} recent / ${lift.previousSessions} earlier sessions` : `${pct(lift.changePercent)} · ${lift.status.toLowerCase()}`}</li>)}</ul>
      <p className="meta">Best estimated one-rep strength uses weight × (1 + reps ÷ 30), for comparison only. It is not a prescribed max or a recommendation.</p>
    </details>
    <details className="review-answer"><summary><span>How is each muscle trained?</span><strong>{muscles.length ? `${muscles.length} muscle groups recorded in the last 4 weeks` : "Building up · no mapped working sets"}</strong></summary>
      {muscles.length ? <ul className="metric-records">{muscles.map(([muscle, sets]) => <li key={muscle}><strong>{muscle}</strong> · {sets.toFixed(1)} working sets/week</li>)}</ul> : <p className="card-body">Finished mapped working sets will appear here. Missing exercise mappings stay unknown.</p>}
      <p className="meta">Counts effective non-skipped sets in finished strength sessions over the last 28 days, divided by 4. No target or judgment is applied.</p>
      <h3>Broad balance</h3>
      <p className="card-body">Push {data.balance.push.toFixed(1)} · Pull {data.balance.pull.toFixed(1)} working sets/week</p>
      <p className="card-body">Upper {data.balance.upper.toFixed(1)} · Lower {data.balance.lower.toFixed(1)} working sets/week</p>
      {data.balance.unclassified > 0 && <p className="meta">{data.balance.unclassified.toFixed(1)} sets/week unclassified for push/pull. Arms, core, full-body and unknown exercises are not forced into a side.</p>}
    </details>
  </>;
}
