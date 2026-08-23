import { useEffect, useState } from "react";
import { getRecommendationLedger, type LedgerDay } from "../../../application/reviewQueries";
import { describeLedgerDecision, describeLedgerRating } from "./reviewCopy";

/**
 * REVIEW 0.1 / Recommendation Ledger (MORE // Records, sibling to
 * HISTORY, not a replacement for it). Read-only. Answers exactly one
 * question: "what did BEYOND recommend, what did I decide, and how did
 * it go?" — reusing the same day-collapsed/SHOW-HIDE pattern HISTORY
 * already established, joined by Recommendation identity (never
 * BeyondDay co-location — see getRecommendationLedger).
 *
 * Deliberately does not: show AdvisoryNotes, show TRAIN/BODY/Mission
 * evidence, aggregate/trend/count anything, or offer any write action
 * (accept/decline/rate stay exclusively on TODAY). HISTORY remains the
 * complete raw audit trail; this reduces the reconstruction work of
 * reading it, it does not replace it.
 */
export function ReviewScreen() {
  const [days, setDays] = useState<LedgerDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setDays(await getRecommendationLedger());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <h1 className="eyebrow">MORE // REVIEW</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        What BEYOND recommended, what you decided, and how you rated it — read-only. For the
        complete raw event log, see HISTORY.
      </p>

      {loading && <p className="empty-state">Loading…</p>}
      {!loading && days.length === 0 && (
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
                {entries.map(({ recommendation, decision, rating }) => (
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
                      {describeLedgerDecision(decision)} · {describeLedgerRating(rating)}
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
