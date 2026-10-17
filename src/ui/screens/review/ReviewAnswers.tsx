import { useEffect, useRef, useState } from "react";
import { getReviewOverview } from "../../../application/reviewOverviewQueries";
import { reviewMean, type ReviewOverview, type ReviewRow } from "../../../engine/reviewOverview";
import { describeError } from "../../errorMessage";
import "./review.css";

type Measure = "weight" | "protein" | "calories" | "sleepHours" | "sessions";
const date = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const value = (n: number | undefined, unit: string) => n === undefined ? "Not recorded" : `${n.toFixed(unit === "kcal" || unit === "g" || unit === "sessions" ? 0 : 1)} ${unit}`;

function Evidence({ data, metric, unit, method, onOpenHistory }: { data: ReviewOverview; metric: Measure; unit: string; method: string; onOpenHistory?: ((id: string) => void) | undefined }) {
  const points = data.rows.filter((row) => row[metric] !== undefined && (metric !== "sessions" || row.dayIds.length > 0));
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = points.find((row) => row.start === selected);
  const min = points.length ? Math.min(...points.map((row) => row[metric]!)) : 0;
  const max = points.length ? Math.max(...points.map((row) => row[metric]!)) : 1;
  const x = (index: number) => 16 + data.rows.findIndex((row) => row.start === points[index]!.start) * 288 / 27;
  const y = (n: number) => 96 - (n - min) * 72 / Math.max(1, max - min);
  return <div className="review-evidence">
    <details><summary>How this is calculated</summary><p className="card-body">{method}</p></details>
    {points.length >= 3 && (metric !== "weight" || data.weight.change !== undefined) && <>
      <p className="meta">{points.length} recorded lived days · {value(min, unit)} to {value(max, unit)}. Tap the chart or choose a day below.</p>
      <svg viewBox="0 0 320 120" role="img" aria-label={`${metric === "sleepHours" ? "Main sleep" : metric} over recorded lived days; values are available in the day selector and evidence table.`}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const at = (event.clientX - bounds.left) / bounds.width * 320;
          const closest = points.reduce((best, _, index) => Math.abs(x(index) - at) < Math.abs(x(best) - at) ? index : best, 0);
          setSelected(points[closest]!.start);
        }}>
        <path d={`M16 104H304`} fill="none" stroke="currentColor" opacity=".3" />
        <polyline points={points.map((row, index) => `${x(index)},${y(row[metric]!)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />
        {points.map((row, index) => <circle key={row.start} cx={x(index)} cy={y(row[metric]!)} r={row.start === selected ? 5 : 3} fill="currentColor" />)}
      </svg>
      <label className="review-select">Inspect recorded day
        <select className="input" value={chosen?.start ?? ""} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a day</option>
          {points.map((row) => <option key={row.start} value={row.start}>{date(row.start)} · {value(row[metric], unit)}</option>)}
        </select>
      </label>
      {chosen && <p className="card-body" role="status">{date(chosen.start)} · {value(chosen[metric], unit)} · {chosen.dayIds.length} recorded day {chosen.dayIds.length === 1 ? "segment" : "segments"}</p>}
    </>}
    <details><summary>Every record in this range</summary>
      <p className="meta">Effective daily totals below. Open each source day for all original events and corrections. Missing values are never zero-filled. {metric === "weight" ? "Weigh-ins are averaged per lived day before comparing weeks." : ""}</p>
      {data.rows.every((row) => row.dayIds.length === 0) ? <p className="card-body">No completed source days in this window.</p> :
        <div className="review-table-scroll"><table className="review-table"><caption>Source lived days · {date(data.from)} to {date(new Date(Date.parse(data.to) - 1).toISOString())}</caption>
          <thead><tr><th scope="col">Day starts</th><th scope="col">Recorded value</th><th scope="col">Sources</th></tr></thead>
          <tbody>{data.rows.filter((row) => row.dayIds.length).map((row) => <tr key={row.start}>
            <th scope="row">{date(row.start)}</th><td>{value(row[metric], unit)}{metric === "sleepHours" && row.ambiguousSleep ? " · Multiple main sleeps; excluded" : ""}
              {metric === "weight" && row.weights.map((weight) => <div className="meta" key={weight.rootId}>{value(weight.lbs, "lb")} · {new Date(weight.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>)}</td>
            <td>{row.dayIds.map((id, index) => onOpenHistory ? <button key={id} type="button" className="btn-secondary" aria-label={`Open source day ${date(row.start)}, segment ${index + 1}`} onClick={() => onOpenHistory(id)}>DAY {index + 1}</button> : <span key={id}>Segment {index + 1}</span>)}</td>
          </tr>)}</tbody></table></div>}
    </details>
  </div>;
}
function Answer({ title, answer, children }: { title: string; answer: string; children: React.ReactNode }) {
  return <details className="review-answer"><summary><span>{title}</span><strong>{answer}</strong></summary>{children}</details>;
}
export function ReviewAnswers({ active = true, onOpenHistory }: { active?: boolean; onOpenHistory?: ((id: string) => void) | undefined }) {
  const [data, setData] = useState<ReviewOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  useEffect(() => {
    if (!active) return;
    const request = ++version.current; let alive = true;
    setReading(true); setError(null);
    void getReviewOverview().then((next) => { if (alive && request === version.current) setData(next); })
      .catch((failure: unknown) => { if (alive) setError(describeError(failure, "Could not read your review.")); })
      .finally(() => { if (alive) setReading(false); });
    return () => { alive = false; };
  }, [active, retry]);
  if (error) return <section aria-label="Your data review"><p role="alert">{error} Your evidence is unavailable, not empty.</p><button className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY ANSWERS</button></section>;
  if (!data) return <p role="status">Reading your completed days…</p>;
  const evidence = (metric: Measure, unit: string, method: string) => <Evidence data={data} metric={metric} unit={unit} method={method} onOpenHistory={onOpenHistory} />;
  const weightAnswer = data.weight.change === undefined ? "Building up · needs 7 weighed days in the last 14, with 3 in each week" : `${Math.abs(data.weight.change).toFixed(1)} lb ${data.weight.change < 0 ? "lower" : data.weight.change > 0 ? "higher" : "change"} · latest 7-day mean versus previous 7`;
  const contextRows = (context: ReviewRow["context"]) => data.rows.filter((row) => row.context === context);
  return <section className="review-answers" aria-label="Your data review">
    <p className="tool-label">YOUR RECORDED EVIDENCE</p>
    {reading && <p className="meta" role="status">Refreshing recorded evidence…</p>}
    <p className="card-body">{date(data.from)} – {date(new Date(Date.parse(data.to) - 1).toISOString())} · Last 28 completed lived-day windows, starting at 16:30. The current day and unfinished segments are excluded.</p>
    <p className="meta">Read-only facts. Partial food logs are not total intake. BEYOND does not measure fat or muscle.</p>
    <Answer title="Is my weight going down?" answer={weightAnswer}>
      <p className="meta">Last 14 days: {data.weight.recentDays} weighed days in the latest week, {data.weight.previousDays} in the previous week. Weigh after your main sleep, before eating; the records do not verify those conditions.</p>
      {data.weight.change !== undefined && <p className="card-body">Latest mean {value(data.weight.recentMean, "lb")} · Previous mean {value(data.weight.previousMean, "lb")}</p>}
      {evidence("weight", "lb", "Average effective weigh-ins within each completed lived day, then average those daily means for each of the last two 7-day windows. Comparison requires 7 weighed days in 14, with at least 3 in each week. This is a difference between sampled weekly means, not a prediction or a body-composition verdict. The chart places observations on their lived-day positions; connecting lines are visual guides, not inferred records for missing days.")}
    </Answer>
    <Answer title="Am I keeping my strength while losing weight?" answer="Building up · no overall strength comparison yet">
      <p className="card-body">Weight alone cannot answer this. TRAIN → HISTORY shows your recorded sessions and lift history. No muscle or fat verdict is inferred.</p>
    </Answer>
    <Answer title="Am I getting stronger?" answer="Building up · inspect individual lift history in TRAIN">
      <p className="card-body">Your individual session records and lift curves remain in TRAIN. This review does not invent an overall strength score.</p>
    </Answer>
    <Answer title="How is each muscle trained?" answer="Building up · muscle-group totals are not available">
      <p className="card-body">Use TRAIN’s session records to inspect the exercises and sets you performed.</p>
    </Answer>
    <Answer title="What protein and calories have I logged?" answer={`${data.protein.days ? `${value(data.protein.mean, "g")} protein average across ${data.protein.days} logged days` : "No protein recorded in completed days"} · ${data.calories.days ? `${value(data.calories.mean, "kcal")} across ${data.calories.days} meal-logged days` : "No meals recorded in completed days"}`}>
      <p className="meta">These are recorded amounts, not verified total intake or historical target adherence. A single meal does not establish a complete food day.</p>
      <h3>Protein</h3>{evidence("protein", "g", "Sum effective protein-only entries plus consumed-meal protein in each completed lived day, then average only days with recorded protein. Corrections and voids use canonical queries. Unlogged days are excluded; logged zero is preserved.")}
      <h3>Calories</h3>{evidence("calories", "kcal", "Sum effective consumed-meal calories in each completed lived day; average only meal-logged days. Protein-only entries do not imply calories. These are logged calories, never an estimate of actual daily intake.")}
    </Answer>
    <Answer title="How often have I trained?" answer={`${data.sessions} completed or partial strength sessions on ${data.trainingDays} lived days in this 28-day window`}>
      {evidence("sessions", "sessions", "Count distinct COMPLETED or PARTIAL STANDARD/REDUCED sessions owned by completed lived days starting in this window. Active, stopped/abandoned and recovery sessions are excluded. A recorded day with no qualifying session is zero; a day with no record is missing. This reports frequency, not adherence to a plan.")}
    </Answer>
    <details className="review-more"><summary>More questions</summary>
      <Answer title="What main sleep have I recorded?" answer={`${value(data.sleep.mean, "h")} average across ${data.sleep.days} unambiguous sleep-logged days`}>
        {evidence("sleepHours", "h", "Use the effective duration when exactly one main-sleep entry exists across a lived day's recorded segments. Naps and days with multiple main sleeps are excluded. Logging date is not proof of sleep timing or quality.")}
      </Answer>
      <Answer title="How much of this window has recorded evidence?" answer={`${data.recordedDays} of 28 lived-day windows have completed source records`}>
        <p className="card-body">Protein: {data.protein.days} days · Meals: {data.calories.days} days · Main sleep: {data.sleep.days} days. Presence means something was logged; it does not verify complete logging. No score or streak.</p>
      </Answer>
      <Answer title="Do work-day and off-day records differ?" answer={`${contextRows("WORK").length} declared work days · ${contextRows("OFF").length} declared off days`}>
        <p className="meta">Conflicting or unknown declarations are excluded. These are counts and recorded averages, not causes.</p>
        {(["WORK", "OFF"] as const).map((kind) => {
          const rows = contextRows(kind); const food = rows.flatMap((row) => row.protein === undefined ? [] : [row.protein]);
          const sleep = rows.flatMap((row) => row.sleepHours === undefined ? [] : [row.sleepHours]);
          return <p className="card-body" key={kind}>{kind}: {food.length >= 3 ? value(reviewMean(food), "g") : "Building up · needs 3 protein-logged days"} ({food.length} food days); {sleep.length >= 3 ? value(reviewMean(sleep), "h") : "Building up · needs 3 sleep-logged days"} ({sleep.length} sleep days).</p>;
        })}
        {evidence("protein", "g", "Group completed lived days by their recorded standing work context, never today's schedule applied retrospectively. Mixed contexts within a restarted day stay unknown. Work/off averages each require 3 logged days per measure and do not establish any causal relationship.")}
      </Answer>
    </details>
  </section>;
}
