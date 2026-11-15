import { useEffect, useState } from "react";
import { getTodayBriefing, type BriefingOpen, type TodayBriefing } from "../../../application/todayBriefing";
import { OperatorHeader } from "../../components/OperatorHeader";
import "./todayBriefing.css";
import "./todayFoundation.css";
import "./console.css";

/**
 * BEYOND 4.0-d: opt-in briefing preview. Read only; BACK TO TODAY returns to the
 * current TODAY. Existing Plan Today and BODY sleep surfaces own any follow-up.
 */
export function TodayBriefingPreview({
  active,
  onBack,
  onOpen,
}: {
  active: boolean;
  onBack: () => void;
  onOpen?: (destination: BriefingOpen) => void;
}) {
  const [briefing, setBriefing] = useState<TodayBriefing | null>(null);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError(false);
    setBriefing(null);
    void getTodayBriefing().then(
      (next) => { if (!cancelled) setBriefing(next); },
      () => { if (!cancelled) { setBriefing(null); setError(true); } },
    );
    return () => { cancelled = true; };
  }, [active, refreshKey]);

  return (
    <div className="screen command-console today-field today-briefing">
      <OperatorHeader destination="mission">BEYOND // BRIEFING PREVIEW</OperatorHeader>
      <p className="today-briefing__notice">Preview only. Current TODAY is unchanged.</p>
      <div className="today-briefing__tools">
        <button type="button" className="btn-secondary" onClick={onBack}>BACK TO TODAY</button>
      </div>
      {error && (
        <p className="today-briefing__error" role="alert">
          The briefing could not be read.{" "}
          <button type="button" className="btn-secondary" onClick={() => setRefreshKey((n) => n + 1)}>RETRY BRIEFING</button>
        </p>
      )}
      {briefing && (
        <div role="region" aria-label="TODAY briefing preview">
          <section className="today-briefing__section" aria-labelledby="briefing-now">
            <h2 id="briefing-now">NOW</h2>
            <p className="today-briefing__label">{briefing.now.label}</p>
            <p className="today-briefing__line">{briefing.now.line}</p>
            {briefing.now.guidance && (
              <div className="today-briefing__guidance">
                <p className="today-briefing__label">GUIDANCE</p>
                <p className="today-briefing__line">{briefing.now.guidance.title}</p>
                <p className="today-briefing__detail">{briefing.now.guidance.rationale}</p>
                <p className="today-briefing__detail">Recorded Engine guidance. Your call stays on TODAY.</p>
              </div>
            )}
            <details className="today-briefing__why">
              <summary>WHY {briefing.now.label}</summary>
              <ul>{briefing.now.why.map((line) => <li key={line}>{line}</li>)}</ul>
            </details>
          </section>
          <section className="today-briefing__section" aria-labelledby="briefing-next">
            <h2 id="briefing-next">NEXT</h2>
            {briefing.next ? (
              <>
                <p className="today-briefing__line">{briefing.next.line}</p>
                <p className="today-briefing__detail">{briefing.next.why}</p>
                {onOpen && <button type="button" className="btn-secondary" onClick={() => onOpen("PLAN")}>OPEN WEEK AHEAD</button>}
              </>
            ) : <p className="today-briefing__empty">Nothing next is known yet.</p>}
          </section>
          <section className="today-briefing__section" aria-labelledby="briefing-handled">
            <h2 id="briefing-handled">WHAT BEYOND HANDLED</h2>
            {briefing.handled.length === 0 ? (
              <p className="today-briefing__empty">Nothing BEYOND has imported to show here yet.</p>
            ) : (
              <ul className="today-briefing__handled">
                {briefing.handled.map((item) => (
                  <li key={item.id}>
                    <p className="today-briefing__line">{item.line}</p>
                    <p className="today-briefing__detail">{item.detail}</p>
                    {onOpen && <button type="button" className="btn-secondary" onClick={() => onOpen(item.open)}>REVIEW SLEEP</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
