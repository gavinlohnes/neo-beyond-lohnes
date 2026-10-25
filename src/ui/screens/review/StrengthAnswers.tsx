import { useEffect, useState } from "react";
import { getStrengthReview, type StrengthReviewData } from "../../../application/strengthReviewQueries";
import { describeError } from "../../errorMessage";

const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const state = (value: number | undefined, count: number) => value === undefined ? `Building up · needs 2 comparable lifts (${count} ready)` : `${pct(value)} strength index across ${count} comparable lifts`;
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

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
  const method = <details><summary>How this is calculated</summary><p className="card-body">The last 28 days are compared with the 28 days before them. A lift needs 2 finished sessions in each window. Best-set weight and total weight × reps lead the per-lift index; estimated max (Epley) is secondary. The overall index needs 2 comparable lifts. Missing evidence stays missing.</p></details>;
  const muscleMethod = <details><summary>How this is calculated</summary><p className="card-body">Each effective, non-skipped working set in a finished strength session during the last 28 days counts toward its exercise’s mapped primary muscle, then the total is divided by 4 for sets per week. Push and pull use explicit exercise-level mappings; upper and lower use mapped muscle groups. Neutral, multi-pattern, custom without a movement mapping, and unknown exercises stay unclassified for push/pull.</p></details>;
  const records = <details><summary>Every record in this range ({data.records.length})</summary>{data.records.length === 0 ? <p className="card-body">No effective working sets in the last 56 days.</p> : <div className="review-table-scroll"><table className="review-table"><caption>Effective working sets · last 56 days</caption><thead><tr><th scope="col">Date</th><th scope="col">Lift</th><th scope="col">Set</th><th scope="col">Window</th></tr></thead><tbody>{data.records.map((row, index) => <tr key={`${row.sessionId}-${row.exerciseId}-${index}`}><th scope="row">{date(row.at)}</th><td>{data.names[row.exerciseId] ?? row.exerciseId}</td><td>{row.weight} lb × {row.reps}</td><td>{Date.now() - Date.parse(row.at) < 28 * 86_400_000 ? "Recent" : "Earlier"}</td></tr>)}</tbody></table></div>}</details>;
  return <>
    <details className="review-answer"><summary><span>Am I keeping my strength while losing weight?</span><strong>{state(data.strengthIndexChangePercent, data.comparableLifts)}</strong></summary>
      <p className="card-body">Strength and weight are shown as separate recorded facts. BEYOND does not infer muscle or fat change.</p>
      {data.weeklyVolumeGrowthPercent === undefined ? <p className="meta">Weekly volume growth is building up.</p> : <p className="card-body">Weekly volume: {Math.round(data.recentVolumePerWeek).toLocaleString()} lb · {pct(data.weeklyVolumeGrowthPercent)} versus the earlier window</p>}
      {method}{records}
    </details>
    <details className="review-answer"><summary><span>Am I getting stronger?</span><strong>{data.lifts.some((lift) => lift.status === "IMPROVING") ? `${data.lifts.filter((lift) => lift.status === "IMPROVING").length} lifts improving` : data.comparableLifts ? "No clear increase in comparable lifts" : "Building up · not enough comparable sessions"}</strong></summary>
      <ul className="metric-records">{data.lifts.map((lift) => <li key={lift.exerciseId}><strong>{data.names[lift.exerciseId] ?? lift.exerciseId}</strong> · {lift.indexChangePercent === undefined ? `${lift.recentSessions} recent / ${lift.previousSessions} earlier sessions` : <>best set {lift.recentBest!.weight} lb × {lift.recentBest!.reps} ({pct(lift.bestSetChangePercent!)}) · volume {Math.round(lift.recentVolume).toLocaleString()} lb ({pct(lift.volumeChangePercent!)}) · estimated max {pct(lift.estimatedMaxChangePercent!)}{lift.relativeStrength === undefined ? "" : ` · relative ${lift.relativeStrength.toFixed(2)}× bodyweight`}</>}</li>)}</ul>
      {method}{records}
    </details>
    <details className="review-answer"><summary><span>How is each muscle trained?</span><strong>{muscles.length ? `${muscles.length} muscle groups recorded in the last 4 weeks` : "Building up · no mapped working sets"}</strong></summary>
      {muscles.length ? <ul className="metric-records">{muscles.map(([muscle, sets]) => <li key={muscle}><strong>{muscle}</strong> · {sets.toFixed(1)} working sets/week</li>)}</ul> : <p className="card-body">Finished mapped working sets will appear here. Missing exercise mappings stay unknown.</p>}
      <h3>Broad balance</h3><p className="card-body">Push {data.balance.push.toFixed(1)} · Pull {data.balance.pull.toFixed(1)} working sets/week</p><p className="card-body">Upper {data.balance.upper.toFixed(1)} · Lower {data.balance.lower.toFixed(1)} working sets/week</p>
      {data.balance.unclassified > 0 && <p className="meta">{data.balance.unclassified.toFixed(1)} sets/week unclassified for push/pull. Neutral, multi-pattern and unknown exercises are not forced into a side.</p>}
      {muscleMethod}{records}
    </details>
  </>;
}
