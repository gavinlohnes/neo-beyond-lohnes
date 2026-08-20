import { useEffect, useState } from "react";
import { getHistoryDays, type HistoryDay } from "../../../application/historyQueries";
import { describeEvent } from "./historyCopy";

export function HistoryScreen() {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setDays(await getHistoryDays());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <p className="eyebrow">BEYOND // HISTORY</p>
      <h1 className="title">History</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        Every day and every event, exactly as it happened. Read-only.
      </p>

      {loading && <p className="empty-state">Loading…</p>}
      {!loading && days.length === 0 && (
        <p className="empty-state">
          No days yet. Your first check-in, log, or workout will start today's entry here.
        </p>
      )}

      {days.map(({ day, events }) => {
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
                  {day.status} · {day.workContext} · {events.length} {events.length === 1 ? "event" : "events"}
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
                {events.length === 0 && <p className="meta">No events recorded.</p>}
                {events.map((event) => (
                  <div
                    key={event.id}
                    style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0" }}
                  >
                    <span className="card-body" style={{ margin: 0 }}>{describeEvent(event)}</span>
                    <span className="meta" style={{ whiteSpace: "nowrap" }}>
                      {new Date(event.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
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
