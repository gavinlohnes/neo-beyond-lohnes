import {
  describeBestSince,
  describeMilestone,
  formatShortDate,
  projectGoalDate,
  trendDirection,
  type WeighIn,
} from "../../../application/bodyTrendQueries";
import { latestTrend, readWeightTrendPreference, smoothWeights, TREND_ALPHA, writeWeightTrendPreference, type WeightTrendPreference } from "../../../application/weightTrend";
import { useId, useState } from "react";
import "../../charts/suitData.css";

const WINDOW_DAYS = 60;
const W = 300;
const H = 64;
const PAD = 4;

/**
 * Drop 5: BODY's weight trend — a quiet line of the last 60 days plus the
 * facts derived from it (best-since, milestone, projected goal date). Neutral
 * ink only; red never decorates. Renders nothing until there are two
 * weigh-ins to draw a line between.
 *
 * GRAYSON-WEIGHT-TREND-001 (Gavin, 2026-11-24): where the chart draws, a smoothed trend weight sits beside the
 * scale weight and as a second, lighter line, with Show trend and Smoothing settings under the chart. The facts
 * below (best-since, milestone, projection) keep reading the scale weigh-ins.
 */
export function WeightTrend({
  history,
  goalWeightLbs,
  hideChart = false,
  hideFacts = false,
}: {
  history: readonly WeighIn[];
  goalWeightLbs?: number | undefined;
  /** CLEANUP-003: the facts stay; the 60-day line hides while the timeline is open. */
  hideChart?: boolean;
  /** Reuse the established historical graph without repeating the visible facts. */
  hideFacts?: boolean;
}) {
  // GRAYSON-WEIGHT-TREND-001: hooks before the early return, so the hook order never changes.
  const [preference, setPreference] = useState<WeightTrendPreference>(readWeightTrendPreference);
  const settingsId = useId();
  const latest = history.at(-1);
  if (!latest || history.length < 2) return null;

  const direction = trendDirection(history, goalWeightLbs);
  const bestSince = describeBestSince(history, direction);
  const milestone = describeMilestone(history, direction);
  const projection = projectGoalDate(history, goalWeightLbs);

  const end = new Date(latest.recordedAt).getTime();
  const start = end - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const shown = history.filter((w) => new Date(w.recordedAt).getTime() >= start);
  const weights = shown.map((w) => w.weightLbs);
  // GRAYSON-WEIGHT-TREND-001: the smoothed trend, only where the chart draws and only while he has it on. Off leaves
  // every line of the chart below exactly as it was.
  const alpha = TREND_ALPHA[preference.smoothing];
  const trendOn = !hideChart && preference.show;
  const trend = trendOn ? latestTrend(history, alpha) : null;
  const trendShown = trendOn && trend && !("waiting" in trend)
    ? smoothWeights(history, { alpha }).filter((p) => new Date(p.recordedAt).getTime() >= start)
    : [];
  const scaleWeights = [...weights, ...trendShown.map((p) => p.trendLbs)];
  const goalInView =
    goalWeightLbs !== undefined && goalWeightLbs >= Math.min(...weights) - 10 && goalWeightLbs <= Math.max(...weights) + 10;
  const lo = Math.min(...scaleWeights, ...(goalInView ? [goalWeightLbs!] : []));
  const hi = Math.max(...scaleWeights, ...(goalInView ? [goalWeightLbs!] : []));
  const span = hi - lo || 1;
  const firstT = new Date(shown[0]!.recordedAt).getTime();
  const tSpan = end - firstT || 1;
  const x = (iso: string) => PAD + ((new Date(iso).getTime() - firstT) / tSpan) * (W - 2 * PAD);
  const y = (lbs: number) => PAD + ((hi - lbs) / span) * (H - 2 * PAD);
  const points = shown.map((w) => `${x(w.recordedAt).toFixed(1)},${y(w.weightLbs).toFixed(1)}`).join(" ");
  const trendPoints = trendShown.map((p) => `${x(p.recordedAt).toFixed(1)},${y(p.trendLbs).toFixed(1)}`).join(" ");
  const chartLabel = `Weight over the last ${WINDOW_DAYS} days ending ${formatShortDate(latest.recordedAt)}, from ${shown[0]!.weightLbs} to ${latest.weightLbs} lb`;
  const update = (next: WeightTrendPreference) => { writeWeightTrendPreference(next); setPreference(next); };

  return (
    <div className="weight-trend" style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
      {!hideChart && <p className="meta" style={{ marginBottom: 6 }}>Last {WINDOW_DAYS} days · latest {formatShortDate(latest.recordedAt)}</p>}
      {trend && ("waiting" in trend
        ? <p className="meta weight-trend__waiting">Trend shows after 5 weigh-ins over a week</p>
        : <p className="weight-trend__readout"><strong>Trend {trend.trendLbs.toFixed(1)} lb</strong> · scale {trend.scaleLbs} lb {formatShortDate(trend.scaleAt)}</p>)}
      {!hideChart && <div className="suit-data-frame"><svg
        className="suit-data-plot"
        role="img"
        aria-label={trendShown.length > 1
          ? `${chartLabel}. Two lines: scale weight, and the smoothed trend from ${trendShown[0]!.trendLbs.toFixed(1)} to ${trendShown.at(-1)!.trendLbs.toFixed(1)} lb`
          : chartLabel}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: H }}
      >
        {[PAD, H / 2, H - PAD].map((line) => <line key={line} x1={PAD} x2={W - PAD} y1={line} y2={line} className="suit-data-grid" />)}
        {goalInView && (
          <line
            x1={0}
            x2={W}
            y1={y(goalWeightLbs!)}
            y2={y(goalWeightLbs!)}
            stroke="var(--text-3)"
            strokeDasharray="4 4"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shown.length > 1 && (
          <polyline className="suit-data-line"
            points={points}
            strokeLinejoin="miter"
          />
        )}
        {trendShown.length > 1 && <polyline className="suit-data-line suit-data-line--trend" data-weight-trend-line points={trendPoints} />}
        <rect x={x(latest.recordedAt) - 3.5} y={y(latest.weightLbs) - 3.5} width="7" height="7" transform={`rotate(45 ${x(latest.recordedAt)} ${y(latest.weightLbs)})`} className="suit-data-selection" />
      </svg><p className="suit-data-readout"><span>{formatShortDate(shown[0]!.recordedAt)}–{formatShortDate(latest.recordedAt)}</span><strong>{latest.weightLbs} lb</strong></p>
        {trendShown.length > 1 && <p className="weight-trend__legend meta" aria-hidden="true"><span className="weight-trend__key weight-trend__key--scale" />Scale<span className="weight-trend__key weight-trend__key--trend" />Trend</p>}</div>}
      {!hideChart && <div className="weight-trend__settings" role="group" aria-labelledby={`${settingsId}-label`}>
        <p id={`${settingsId}-label`} className="visually-hidden">Weight trend settings</p>
        <button type="button" className="btn-secondary weight-trend__toggle" aria-pressed={preference.show}
          onClick={() => update({ ...preference, show: !preference.show })}>Show trend: {preference.show ? "On" : "Off"}</button>
        {preference.show && <fieldset className="weight-trend__smoothing">
          <legend className="meta">Smoothing</legend>
          {(["STEADY", "QUICKER"] as const).map((option) => <label key={option} className="weight-trend__option">
            <input type="radio" name={`${settingsId}-smoothing`} value={option} checked={preference.smoothing === option}
              onChange={() => update({ ...preference, smoothing: option })} />
            {option === "STEADY" ? "Steady" : "Quicker"}
          </label>)}
        </fieldset>}
        {preference.show && <details className="weight-trend__why">
          <summary>What's the trend?</summary>
          <p className="meta">Your weigh-ins averaged so one day's water or salt barely moves it. It only moves when your weight really does.</p>
        </details>}
      </div>}
      {!hideFacts && bestSince && <p className="meta-strong" style={{ margin: "8px 0 0" }}>{bestSince}</p>}
      {!hideFacts && milestone && <p className="meta" style={{ margin: "4px 0 0" }}>{milestone}</p>}
      {!hideFacts && projection.kind === "DATE" && (
        <p className="meta" style={{ margin: "4px 0 0" }}>
          Goal {goalWeightLbs} lb — at this pace, about {formatShortDate(projection.date)}
        </p>
      )}
      {!hideFacts && projection.kind === "REACHED" && (
        <p className="meta" style={{ margin: "4px 0 0" }}>At or past your goal of {goalWeightLbs} lb</p>
      )}
    </div>
  );
}
