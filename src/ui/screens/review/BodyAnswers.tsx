import { useEffect, useRef, useState, type ReactNode } from "react";
import { getBodyReview, type BodyReview } from "../../../application/bodyReviewQueries";
import type { SiteSummary } from "../../../engine/bodyReview";
import type { ReviewOverview } from "../../../engine/reviewOverview";
import { describeError } from "../../errorMessage";

const calendar = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const title = (key: string) => key.charAt(0) + key.slice(1).toLowerCase();
const signed = (n: number) => `${n > 0 ? "+" : ""}${n} in`;
const MEASURE_METHOD = "Each recorded tape measurement, by the date you measured, using its effective value after corrections. Changes are the latest reading minus an earlier one; they need at least 2 readings for that site. Tape readings vary with placement and time of day. BEYOND does not measure fat or muscle.";

function Answer({ title: question, answer, children }: { title: string; answer: string; children: ReactNode }) {
  return <details className="review-answer"><summary><span>{question}</span><strong>{answer}</strong></summary>{children}</details>;
}

function siteAnswer(summary: SiteSummary): string {
  if (!summary.latest) return "Not recorded";
  if (summary.sinceFirst === undefined) return `Building up · ${summary.latest.inches} in on ${calendar(summary.latest.measuredOn)}; needs 2 readings`;
  return `${summary.latest.inches} in · ${signed(summary.sincePrevious!)} since ${calendar(summary.previous!.measuredOn)} · ${signed(summary.sinceFirst)} since ${calendar(summary.first!.measuredOn)}`;
}

function Readings({ summary }: { summary: SiteSummary }) {
  return <details><summary>Every {title(summary.site).toLowerCase()} measurement ({summary.count})</summary>
    {summary.count === 0 ? <p className="card-body">No {title(summary.site).toLowerCase()} measurements recorded.</p> :
      <div className="review-table-scroll"><table className="review-table"><caption>{title(summary.site)} · all recorded measurements</caption>
        <thead><tr><th scope="col">Measured on</th><th scope="col">Inches</th></tr></thead>
        <tbody>{summary.readings.slice().reverse().map((entry, index) => <tr key={`${entry.measuredOn}-${index}`}>
          <th scope="row">{calendar(entry.measuredOn)}</th><td>{entry.inches}{entry.correctionCount ? ` · corrected ${entry.correctionCount}×` : ""}</td>
        </tr>)}</tbody></table></div>}
  </details>;
}

/**
 * REVIEW-001 Body questions under "More questions": waist (#9), chest, arms
 * and shoulders (#21), photos over time (#20), and "fat, not muscle?" (#16)
 * as the changes BEYOND can see side by side, never a verdict.
 */
export function BodyAnswers({ active, overview }: { active: boolean; overview: ReviewOverview }) {
  const [data, setData] = useState<BodyReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  useEffect(() => {
    if (!active) return;
    const request = ++version.current; let alive = true;
    setError(null);
    void getBodyReview().then((next) => { if (alive && request === version.current) setData(next); })
      .catch((failure: unknown) => { if (alive) setError(describeError(failure, "Could not read your measurements and photos.")); });
    return () => { alive = false; };
  }, [active, retry]);

  if (error) return <div><p role="alert">{error} They are unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY BODY ANSWERS</button></div>;
  if (!data) return <p className="meta" role="status">Reading measurements and photos…</p>;

  const site = (key: string) => data.sites.find((summary) => summary.site === key)!;
  const waist = site("WAIST");
  const upper = ["CHEST", "ARMS", "SHOULDERS"].map(site);
  const measuredUpper = upper.filter((summary) => summary.count > 0);
  const comparable = data.photos.filter((pose) => pose.comparable);
  const photoCount = data.photos.reduce((n, pose) => n + pose.count, 0);
  const strengthLine = "Building up · no overall strength comparison yet";

  return <>
    <Answer title="Is my waist getting smaller?" answer={siteAnswer(waist)}>
      <p className="meta">All recorded waist measurements ({waist.count}). Measure at the same spot and time of day; the records do not verify that.</p>
      <details><summary>How this is calculated</summary><p className="card-body">{MEASURE_METHOD}</p></details>
      <Readings summary={waist} />
      {waist.count === 0 && <p className="card-body">Record one in BODY → Your progress → Measurements.</p>}
    </Answer>
    <Answer title="Are chest, arms and shoulders growing?" answer={measuredUpper.length === 0 ? "Not recorded" : measuredUpper.map((summary) => `${title(summary.site)}: ${summary.sinceFirst === undefined ? `${summary.latest!.inches} in (1 reading)` : signed(summary.sinceFirst)}`).join(" · ")}>
      <p className="meta">Each site: the latest reading against its first. Optional measurements; missing ones stay missing.</p>
      {upper.map((summary) => <div key={summary.site}><p className="card-body"><strong>{title(summary.site)}</strong> · {siteAnswer(summary)}</p><Readings summary={summary} /></div>)}
      <details><summary>How this is calculated</summary><p className="card-body">{MEASURE_METHOD}</p></details>
    </Answer>
    <Answer title="Do I look different?" answer={comparable.length === 0 ? `Building up · needs 2 photos in the same pose (${photoCount} visible)` : comparable.map((pose) => `${title(pose.pose)}: ${pose.count} photos, ${calendar(pose.first!)} → ${calendar(pose.latest!)}`).join(" · ")}>
      <p className="card-body">Only you can judge this. Compare same-pose photos side by side in BODY → Your progress → Photos. Hidden photos are left out here.</p>
      {data.photos.map((pose) => <p className="meta" key={pose.pose}>{title(pose.pose)}: {pose.count === 0 ? "no photos" : `${pose.count} ${pose.count === 1 ? "photo" : "photos"}, ${calendar(pose.first!)}${pose.count > 1 ? ` → ${calendar(pose.latest!)}` : ""}`}</p>)}
    </Answer>
    <Answer title="Am I losing fat, not muscle?" answer="No verdict · the changes BEYOND can see, side by side">
      <p className="card-body">BEYOND does not measure fat or muscle. Here is what it can see. You draw the conclusion.</p>
      <dl className="review-side-by-side">
        <dt>Weight</dt><dd>{overview.weight.change === undefined ? "Not enough weigh-ins yet for the two-week comparison" : `${overview.weight.change > 0 ? "+" : ""}${overview.weight.change.toFixed(1)} lb, latest 7-day mean versus previous 7`}</dd>
        <dt>Waist</dt><dd>{siteAnswer(waist)}</dd>
        <dt>Strength</dt><dd>{strengthLine}. Lift history is in TRAIN.</dd>
        <dt>Photos</dt><dd>{comparable.length ? `${comparable.length} ${comparable.length === 1 ? "pose" : "poses"} with 2+ photos to compare in BODY` : `Building up · needs 2 photos in the same pose`}</dd>
      </dl>
    </Answer>
  </>;
}
