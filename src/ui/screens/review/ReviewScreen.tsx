import { useEffect, useRef, useState } from "react";
import { WeeklyDashboard } from "./WeeklyDashboard";
import { ReviewAnswers } from "./ReviewAnswers";
import { describeError } from "../../errorMessage";
import { getRecommendationLedger, type LedgerDay } from "../../../application/reviewQueries";
import { describeLedgerDecision, describeLedgerDisposition, describeLedgerRating } from "./reviewCopy";

/** REVIEW-001: read-only question hub; the Recommendations section keeps the original ledger contract. */
export function ReviewScreen({ active = true, onOpenHistory }: { active?: boolean; onOpenHistory?: ((id: string) => void) | undefined } = {}) {
  const [days, setDays] = useState<LedgerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    mounted.current = true;
    if (active) void refresh();
    return () => { mounted.current = false; revision.current++; };
  }, [active]);

  async function refresh() {
    const request = ++revision.current;
    setLoading(true);
    setReadError(null);
    try {
      const nextDays = await getRecommendationLedger();
      if (mounted.current && request === revision.current) setDays(nextDays);
    } catch (error) {
      if (mounted.current && request === revision.current) setReadError(describeError(error, "Could not read the recommendation ledger."));
    } finally {
      if (mounted.current && request === revision.current) setLoading(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="eyebrow">COMMAND // REVIEW</h1>
      <WeeklyDashboard active={active} onOpenHistory={onOpenHistory} />
      <ReviewAnswers active={active} onOpenHistory={onOpenHistory} />
      <h2 className="tool-label">RECOMMENDATIONS</h2>
      <p className="card-body" style={{ marginBottom: 16 }}>
        What BEYOND recommended, what you decided, and how you rated it — read-only. For the
        complete raw event log, see HISTORY.
      </p>

      {loading && <p className="empty-state" role="status">Loading…</p>}
      {readError && <div><p role="alert">{readError} The ledger is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY REVIEW</button></div>}
      {!loading && !readError && days.length === 0 && (
        <p className="empty-state">
          No recommendations yet. This fills in as BEYOND recommends things and you decide on them.
        </p>
      )}

      {days.map(({ day, entries }) => {
        const isOpen = expanded[day.id] ?? false;
        return (
          <div className="card" key={day.id}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setExpanded((prev) => ({ ...prev, [day.id]: !isOpen }))}
            >
              <div>
                <p className="card-title" style={{ marginBottom: 2 }}>
                  {new Date(day.startedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="meta">
                  {entries.length} {entries.length === 1 ? "recommendation" : "recommendations"}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: "auto", padding: "8px 14px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((prev) => ({ ...prev, [day.id]: !isOpen }));
                }}
              >
                {isOpen ? "HIDE" : "SHOW"}
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                {entries.map(({ recommendation, decision, rating, disposition }) => (
                  <div key={recommendation.id} style={{ padding: "6px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span className="card-body" style={{ margin: 0 }}>{recommendation.title}</span>
                      <span className="meta" style={{ whiteSpace: "nowrap" }}>
                        {new Date(recommendation.issuedAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="meta" style={{ marginTop: 2 }}>
                      {describeLedgerDecision(decision)} · {describeLedgerRating(rating)} · {describeLedgerDisposition(disposition)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
