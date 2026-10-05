import {
  describeBestSince,
  describeMilestone,
  formatShortDate,
  projectGoalDate,
  trendDirection,
  type WeighIn,
} from "../../../application/bodyTrendQueries";

const WINDOW_DAYS = 60;
const W = 300;
const H = 64;
const PAD = 4;

/**
 * Drop 5: BODY's weight trend — a quiet line of the last 60 days plus the
 * facts derived from it (best-since, milestone, projected goal date). Neutral
 * ink only; red never decorates. Renders nothing until there are two
 * weigh-ins to draw a line between.
 */
export function WeightTrend({
  history,
  goalWeightLbs,
  hideChart = false,
}: {
  history: readonly WeighIn[];
  goalWeightLbs?: number | undefined;
  /** CLEANUP-003: the facts stay; the 60-day line hides while the timeline is open. */
  hideChart?: boolean;
}) {
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
  const goalInView =
    goalWeightLbs !== undefined && goalWeightLbs >= Math.min(...weights) - 10 && goalWeightLbs <= Math.max(...weights) + 10;
  const lo = Math.min(...weights, ...(goalInView ? [goalWeightLbs!] : []));
  const hi = Math.max(...weights, ...(goalInView ? [goalWeightLbs!] : []));
  const span = hi - lo || 1;
  const firstT = new Date(shown[0]!.recordedAt).getTime();
  const tSpan = end - firstT || 1;
  const x = (iso: string) => PAD + ((new Date(iso).getTime() - firstT) / tSpan) * (W - 2 * PAD);
  const y = (lbs: number) => PAD + ((hi - lbs) / span) * (H - 2 * PAD);
  const points = shown.map((w) => `${x(w.recordedAt).toFixed(1)},${y(w.weightLbs).toFixed(1)}`).join(" ");

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
      {!hideChart && <p className="meta" style={{ marginBottom: 6 }}>Last {WINDOW_DAYS} days</p>}
      {!hideChart && <svg
        role="img"
        aria-label={`Weight over the last ${WINDOW_DAYS} days, from ${shown[0]!.weightLbs} to ${latest.weightLbs} lb`}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: H, display: "block" }}
      >
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
          <polyline
            points={points}
            fill="none"
            stroke="var(--text-2)"
            strokeWidth={1.7}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle cx={x(latest.recordedAt)} cy={y(latest.weightLbs)} r={3} fill="var(--text-1)" />
      </svg>}
      {bestSince && <p className="meta-strong" style={{ margin: "8px 0 0" }}>{bestSince}</p>}
      {milestone && <p className="meta" style={{ margin: "4px 0 0" }}>{milestone}</p>}
      {projection.kind === "DATE" && (
        <p className="meta" style={{ margin: "4px 0 0" }}>
          Goal {goalWeightLbs} lb — at this pace, about {formatShortDate(projection.date)}
        </p>
      )}
      {projection.kind === "REACHED" && (
        <p className="meta" style={{ margin: "4px 0 0" }}>At or past your goal of {goalWeightLbs} lb</p>
      )}
    </div>
  );
}
