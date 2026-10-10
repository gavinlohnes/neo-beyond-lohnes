import { useEffect, useRef, useState } from "react";
import { describeError } from "../../errorMessage";
import { getHistoryDays, type HistoryDay } from "../../../application/historyQueries";
import { getExerciseNames } from "../../../application/exerciseLibraryQueries";
import { describeEvent, describeHistoryDayMeta } from "./historyCopy";

export function HistoryScreen({ focusDayId = null }: { focusDayId?: string | null } = {}) {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const mounted = useRef(true);
  // FIND-001: a search result opens its day already expanded, scrolled into view.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => (focusDayId ? { [focusDayId]: true } : {}));
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (loading || readError || !focusDayId) return;
    document.getElementById(`history-day-${focusDayId}`)?.scrollIntoView({ block: "start" });
  }, [loading, readError, focusDayId]);

  async function refresh() {
    setLoading(true);
    setReadError(null);
    try {
      const [nextDays, names] = await Promise.all([getHistoryDays(), getExerciseNames()]);
      if (!mounted.current) return;
      setDays(nextDays);
      setExerciseNames(names);
    } catch (error) {
      if (mounted.current) setReadError(describeError(error, "Could not read history."));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <div className="screen">
      {/* FIELD ALPHA Phase 4: identity zone quieted, same principle as
          TODAY/TRAIN/BODY/MORE — HISTORY is evidence, not a destination
          that needs its own big display title. */}
      <h1 className="eyebrow">MORE // HISTORY</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        Every day and every event, exactly as it happened. Read-only.
      </p>

      {loading && <p className="empty-state" role="status">Loading…</p>}
      {readError && <div><p role="alert">{readError} History is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY HISTORY</button></div>}
      {!loading && !readError && days.length === 0 && (
        <p className="empty-state">
          No days yet. Your first check-in, log, or workout will start today's entry here.
        </p>
      )}

      {days.map(({ day, events }) => {
        const isOpen = expanded[day.id] ?? false;
        return (
          <div className="card" key={day.id} id={`history-day-${day.id}`}>
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
                  {describeHistoryDayMeta(day.status, day.workContext, events.length)}
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
                    <span className="card-body" style={{ margin: 0 }}>{describeEvent(event, exerciseNames)}</span>
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
