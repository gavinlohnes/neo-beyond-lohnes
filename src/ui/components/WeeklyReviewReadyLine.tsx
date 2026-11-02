import { useEffect, useState } from "react";
import { getWeeklyReviewReadiness } from "../../application/weeklyReviewQueries";
import { getMonthlyCadence } from "../../application/monthlyReviewQueries";
import { mostRecentBoundaryAtOrBefore } from "../../engine/dayRollover";
import type { ShiftClockPhase } from "../screens/today/shiftClock";
const LATER_KEY = "beyond.weeklyReviewLater";
export function WeeklyReviewReadyLine({ phase, now, onOpen, active = true, onAvailabilityChange }: { onAvailabilityChange?: (available: boolean) => void; active?: boolean; phase: ShiftClockPhase | null; now: Date; onOpen: () => void }) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("beyond:weekly-review-saved", refresh);
    return () => window.removeEventListener("beyond:weekly-review-saved", refresh);
  }, []);
  const [ready, setReady] = useState(false);
  // REVIEW-001: every 4th week from the first saved review is the monthly review.
  const [monthly, setMonthly] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const livedDay = mostRecentBoundaryAtOrBefore(now).toISOString();
  const minute = Math.floor(now.getTime() / 60_000);
  useEffect(() => {
    if (!active || phase !== "OFF") { setReady(false); return; }
    let alive = true;
    void getWeeklyReviewReadiness(new Date(minute * 60_000))
      .then(async (result) => {
        const cadence = result.ready ? await getMonthlyCadence(result.week).catch(() => ({ monthly: false })) : { monthly: false };
        if (alive) { setReady(result.ready); setMonthly(cadence.monthly); }
      })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, [active, phase, minute, revision]);
  let stored: string | null = null;
  try { stored = localStorage.getItem(LATER_KEY); } catch { /* Notice can return if UI bookkeeping is unavailable. */ }
  const available = active && phase === "OFF" && ready && stored !== livedDay && dismissed !== livedDay;
  useEffect(() => { onAvailabilityChange?.(available); }, [available, onAvailabilityChange]);
  if (!available) return null;
  return <div className="backup-due"><div className="backup-due__row" style={{ borderLeftColor: "var(--border-strong)", flexWrap: "wrap", gap: 8 }}>
    <span>{monthly ? "Monthly review ready" : "Weekly review ready"}</span><button type="button" className="btn-secondary" onClick={onOpen}>OPEN REVIEW</button>
    <button type="button" className="btn-secondary" onClick={() => { try { localStorage.setItem(LATER_KEY, livedDay); } catch { /* Session state still dismisses. */ } setDismissed(livedDay); }}>LATER</button>
  </div></div>;
}
