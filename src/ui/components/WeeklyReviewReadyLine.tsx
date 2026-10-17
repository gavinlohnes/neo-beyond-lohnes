import { useEffect, useState } from "react";
import { getWeeklyReviewReadiness } from "../../application/weeklyReviewQueries";
import { mostRecentBoundaryAtOrBefore } from "../../engine/dayRollover";
import type { ShiftClockPhase } from "../screens/today/shiftClock";
const LATER_KEY = "beyond.weeklyReviewLater";
export function WeeklyReviewReadyLine({ phase, now, onOpen, active = true }: { active?: boolean; phase: ShiftClockPhase | null; now: Date; onOpen: () => void }) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("beyond:weekly-review-saved", refresh);
    return () => window.removeEventListener("beyond:weekly-review-saved", refresh);
  }, []);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const livedDay = mostRecentBoundaryAtOrBefore(now).toISOString();
  const minute = Math.floor(now.getTime() / 60_000);
  useEffect(() => {
    if (!active || phase !== "OFF") { setReady(false); return; }
    let alive = true;
    void getWeeklyReviewReadiness(new Date(minute * 60_000)).then((result) => { if (alive) setReady(result.ready); }).catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, [active, phase, minute, revision]);
  let stored: string | null = null;
  try { stored = localStorage.getItem(LATER_KEY); } catch { /* Notice can return if UI bookkeeping is unavailable. */ }
  if (!active || phase !== "OFF" || !ready || stored === livedDay || dismissed === livedDay) return null;
  return <div className="backup-due"><div className="backup-due__row" style={{ borderLeftColor: "var(--border-strong)", flexWrap: "wrap", gap: 8 }}>
    <span>Weekly review ready</span><button type="button" className="btn-secondary" onClick={onOpen}>OPEN REVIEW</button>
    <button type="button" className="btn-secondary" onClick={() => { try { localStorage.setItem(LATER_KEY, livedDay); } catch { /* Session state still dismisses. */ } setDismissed(livedDay); }}>LATER</button>
  </div></div>;
}
