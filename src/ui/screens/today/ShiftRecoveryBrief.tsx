import { useEffect, useState } from "react";
import { getShiftRecoveryBrief } from "../../../application/shiftRecoveryQueries";
import type { ShiftRecoveryBrief as Brief } from "../../../application/rotationProjection";
import { describeError } from "../../errorMessage";
import { useDayRolloverRefresh } from "../../hooks/useDayRolloverRefresh";

const livedDayKey = (now: Date) => {
  const boundary = new Date(now);
  boundary.setHours(16, 30, 0, 0);
  if (now.getTime() < boundary.getTime()) boundary.setDate(boundary.getDate() - 1);
  return boundary.getTime();
};

/** Optional TODAY depth. It explains recorded context and never competes with Engine guidance. */
export function ShiftRecoveryBrief({ active, now, read = getShiftRecoveryBrief }: { active: boolean; now: Date; read?: typeof getShiftRecoveryBrief }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [rollover, setRollover] = useState(0);
  useDayRolloverRefresh(() => setRollover((key) => key + 1));
  useEffect(() => {
    setBrief(null);
    setError(null);
    if (!active) return;
    let current = true;
    void read(now).then((next) => { if (current) setBrief(next); })
      .catch((cause: unknown) => { if (current) { setBrief(null); setError(describeError(cause, "Recovery context is unavailable.")); } });
    return () => { current = false; };
  }, [active, livedDayKey(now), read, retry, rollover]);
  if (!active || (!brief && !error)) return null;
  if (error) return <div className="shift-recovery-brief"><p role="alert">{error} No plan or record was changed.</p><button type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY RECOVERY CONTEXT</button></div>;
  return <details className="shift-recovery-brief">
    <summary><span><small>{brief!.label}</small><strong>{brief!.headline}</strong></span><span aria-hidden="true">+</span></summary>
    <div><p>{brief!.detail}</p>{brief!.evidence ? <p><strong>Your records:</strong> {brief!.evidence}</p> : <p>More recorded rotations are needed before BEYOND can show a personal pattern.</p>}
      <p className="meta">Schedule position is a forecast. Historical comparisons use recorded work/day-off context. No medical advice, recovery verdict or automatic scheduling.</p></div>
  </details>;
}
