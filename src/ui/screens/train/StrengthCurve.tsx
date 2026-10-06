import { useEffect, useState } from "react";
import { getStrengthCurve, type StrengthPoint } from "../../../application/viewQueries";
import { formatShortDate } from "../../../application/bodyTrendQueries";

/**
 * VIEWS-001 (owner brief 2026-10-05): a lift's strength curve — the heaviest
 * counted set in each finished session, oldest to newest, with PR sessions
 * marked (a red-outlined square, the PR tag's own language) and a text
 * summary for anyone not reading the chart. Read only; opened from a record
 * card, closed with CLOSE.
 */
const W = 320;
const H = 140;
const PAD = 12;

export function describeStrengthCurve(points: readonly StrengthPoint[]): string {
  if (points.length === 0) return "No finished sessions with this lift yet.";
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const prs = points.filter((p) => p.pr).length;
  const prText = `${prs} PR ${prs === 1 ? "session" : "sessions"}`;
  if (points.length === 1) return `One session so far: ${last.topWeight} lb (${formatShortDate(last.at)}) · ${prText}. The curve starts with the next.`;
  return `${first.topWeight} lb (${formatShortDate(first.at)}) → ${last.topWeight} lb (${formatShortDate(last.at)}) over ${points.length} sessions · ${prText}`;
}

export function StrengthCurve({ exerciseId, exerciseName, onClose }: { exerciseId: string; exerciseName: string; onClose: () => void }) {
  const [points, setPoints] = useState<StrengthPoint[] | null>(null);
  useEffect(() => {
    let current = true;
    void getStrengthCurve(exerciseId).then((next) => {
      if (current) setPoints(next);
    });
    return () => {
      current = false;
    };
  }, [exerciseId]);

  return (
    <section aria-labelledby="curve-heading">
      <h2 id="curve-heading" className="section-label">{exerciseName}</h2>
      {points === null ? (
        <p className="meta">Loading…</p>
      ) : (
        <>
          {points.length > 1 && <CurveChart points={points} />}
          <p className="meta" data-curve-summary style={{ margin: "8px 0 12px" }}>{describeStrengthCurve(points)}</p>
        </>
      )}
      <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={onClose}>
        CLOSE
      </button>
    </section>
  );
}

function CurveChart({ points }: { points: readonly StrengthPoint[] }) {
  const times = points.map((p) => new Date(p.at).getTime());
  const weights = points.map((p) => p.topWeight);
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const w0 = Math.min(...weights);
  const w1 = Math.max(...weights);
  const x = (t: number) => PAD + (t1 === t0 ? (W - 2 * PAD) / 2 : ((t - t0) / (t1 - t0)) * (W - 2 * PAD));
  const y = (w: number) => H - PAD - (w1 === w0 ? (H - 2 * PAD) / 2 : ((w - w0) / (w1 - w0)) * (H - 2 * PAD));
  const line = points.map((p) => `${x(new Date(p.at).getTime()).toFixed(1)},${y(p.topWeight).toFixed(1)}`).join(" ");
  return (
    <svg className="strength-curve" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Strength curve; the summary below says the same in words">
      <polyline points={line} fill="none" stroke="var(--text-2)" strokeWidth={1.5} />
      {points.map((p) => {
        const cx = x(new Date(p.at).getTime());
        const cy = y(p.topWeight);
        return p.pr ? (
          <rect key={p.sessionId} data-pr-marker x={cx - 4} y={cy - 4} width={8} height={8} fill="var(--bg)" stroke="var(--red)" strokeWidth={1.5} />
        ) : (
          <circle key={p.sessionId} cx={cx} cy={cy} r={2.5} fill="var(--text-2)" />
        );
      })}
      {/* Scale labels in the top-left and bottom-right corners, away from a rising curve's ends. */}
      <text x={PAD} y={10} className="strength-curve__label">{w1} lb</text>
      <text x={W - PAD} y={H - 1} textAnchor="end" className="strength-curve__label">{w0} lb</text>
    </svg>
  );
}
