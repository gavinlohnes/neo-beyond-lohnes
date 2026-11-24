import { useEffect, useRef, useState } from "react";
import { describeError } from "../../errorMessage";
import { getHistoryDays, type HistoryDay } from "../../../application/historyQueries";
import { getExerciseNames } from "../../../application/exerciseLibraryQueries";
import { describeCheckInFix, describeEvent, describeHistoryDayMeta } from "./historyCopy";
import { checkInChains } from "../../../domain/checkInCorrections";
import type { CheckInCorrectedPayload, DomainEvent, StateCheckIn } from "../../../domain/common/types";
import { undoCheckInCorrection, type CheckInCorrectionResult } from "../../../application/checkInCorrectionCommands";
import { FIX_UNDO_MS, useUndoWindow } from "../../hooks/useUndoWindow";
import { captureCommitFeedback } from "../../feel/feedback";
import { CheckInFixSheet, FixUndoBanner } from "../today/CheckInFix";

/** GRAYSON-CHECKIN-EDIT-001: FIX's name says which check-in it fixes; the fix row's FIX says "again". */
function fixLabel(event: DomainEvent): string {
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (event.type === "CHECK_IN_CORRECTED") return `Fix the check-in from ${time((event.payload as CheckInCorrectedPayload).checkIn.recordedAt)} again`;
  return `Fix the check-in from ${time((event.payload as StateCheckIn).recordedAt)}`;
}

/** GRAYSON-CHECKIN-EDIT-001: the check-in row id a History row stands for, if it is a check-in or a fix of one. */
function checkInRowId(event: DomainEvent): string | undefined {
  if (event.type === "STATE_CHECKED_IN") return (event.payload as StateCheckIn).id;
  if (event.type === "CHECK_IN_CORRECTED") return (event.payload as CheckInCorrectedPayload).checkIn.id;
  return undefined;
}

export function HistoryScreen({ focusDayId = null, focusEventId = null, active = true, requestKey = 0 }: { focusDayId?: string | null; focusEventId?: string | null; active?: boolean; requestKey?: number } = {}) {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const mounted = useRef(true);
  const readRevision = useRef(0);
  const positioned = useRef<string | null>(null);
  // FIND-001: a search result opens its day already expanded, scrolled into view.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => (focusDayId ? { [focusDayId]: true } : {}));
  useEffect(() => {
    if (focusDayId) setExpanded((previous) => ({ ...previous, [focusDayId]: true }));
  }, [focusDayId, requestKey]);
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});
  // GRAYSON-CHECKIN-EDIT-001: any check-in row opens fix mode on that check-in's current answers.
  const [fixCheckInId, setFixCheckInId] = useState<string | null>(null);
  const [fixUndo, setFixUndo] = useUndoWindow<{ message: string; correctionEventId?: string }>(FIX_UNDO_MS);
  const [undoing, setUndoing] = useState(false);

  async function handleFixed(result: CheckInCorrectionResult) {
    if (result.status === "CORRECTED") setFixUndo({ message: "Check-in fixed.", correctionEventId: result.correctionEventId });
    else if (result.status === "UNDONE") setFixUndo({ message: "Fix put back." });
    else if (result.status === "NO_OP") setFixUndo({ message: "Nothing changed." });
    await refresh();
  }

  async function handleUndo() {
    const acknowledge = captureCommitFeedback();
    const target = fixUndo?.correctionEventId;
    if (!target || undoing) return;
    setUndoing(true);
    try {
      const result = await undoCheckInCorrection(target);
      if (result.status === "UNDONE") acknowledge("MEDIUM");
      setFixUndo({ message: result.status === "UNDONE" ? "Fix undone." : "That fix was already changed." });
      await refresh();
    } catch (error) {
      setFixUndo({ message: describeError(error, "Undo didn't save. Try again.") });
    } finally {
      setUndoing(false);
    }
  }

  useEffect(() => {
    if (!active) return;
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; readRevision.current += 1; };
  }, [active, requestKey]);

  useEffect(() => {
    if (!active || loading || readError || !focusDayId || !expanded[focusDayId]) return;
    const key = `${requestKey}:${focusDayId}:${focusEventId ?? ""}`;
    if (positioned.current === key) return;
    const target = document.getElementById(focusEventId ? `history-event-${focusEventId}` : `history-day-${focusDayId}`);
    if (!target) return;
    positioned.current = key;
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  }, [active, requestKey, loading, readError, focusDayId, focusEventId, expanded]);

  // UX-COHESION-001: fourteen days at a time; a day opened from search is always included.
  const [limit, setLimit] = useState(14);
  const focusIndex = focusDayId ? days.findIndex(({ day }) => day.id === focusDayId) : -1;
  const shown = days.slice(0, Math.max(limit, focusIndex + 1));

  async function refresh() {
    const revision = ++readRevision.current;
    positioned.current = null;
    setLoading(true);
    setReadError(null);
    try {
      const [nextDays, names] = await Promise.all([getHistoryDays(), getExerciseNames()]);
      if (!mounted.current || revision !== readRevision.current) return;
      setDays(nextDays);
      setExerciseNames(names);
    } catch (error) {
      if (mounted.current && revision === readRevision.current) setReadError(describeError(error, "Could not read history."));
    } finally {
      if (mounted.current && revision === readRevision.current) setLoading(false);
    }
  }

  return (
    <div className="screen">
      {/* FIELD ALPHA Phase 4: identity zone quieted, same principle as
          TODAY/TRAIN/BODY/MORE — HISTORY is evidence, not a destination
          that needs its own big display title. */}
      <h1 className="eyebrow">MORE // HISTORY</h1>
      <p className="card-body" style={{ marginBottom: 16 }}>
        Every day and every event, exactly as it happened. A check-in can be fixed; the original stays here.
      </p>
      <CheckInFixSheet checkInId={fixCheckInId} onClose={() => setFixCheckInId(null)} onChanged={handleFixed} />
      {fixUndo && <FixUndoBanner message={fixUndo.message} busy={undoing} onUndo={fixUndo.correctionEventId ? () => void handleUndo() : undefined} />}

      {loading && <p className="empty-state" role="status">Loading…</p>}
      {readError && <div><p role="alert">{readError} History is unavailable, not empty.</p><button type="button" className="btn-secondary" onClick={() => void refresh()}>RETRY HISTORY</button></div>}
      {!loading && !readError && days.length === 0 && (
        <p className="empty-state">
          No days yet. Your first check-in, log, or workout will start today's entry here.
        </p>
      )}

      {shown.map(({ day, events }) => {
        const isOpen = expanded[day.id] ?? false;
        const editedCheckIns = new Set(checkInChains(events).filter((c) => c.fixes.length > 0).map((c) => c.originalCheckInId));
        return (
          <div className="card" key={day.id} id={`history-day-${day.id}`} tabIndex={-1}>
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
                    key={event.id} id={`history-event-${event.id}`} tabIndex={-1} className={focusEventId === event.id ? "health-history-focus" : undefined}
                    style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0" }}
                  >
                    <span className="card-body" style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>
                      {event.type === "CHECK_IN_CORRECTED" ? describeCheckInFix(event, events) : describeEvent(event, exerciseNames)}
                      {event.type === "STATE_CHECKED_IN" && editedCheckIns.has((event.payload as StateCheckIn).id) ? " · edited" : ""}
                    </span>
                    <span className="history-event-end">
                      <span className="meta" style={{ whiteSpace: "nowrap" }}>
                        {new Date(event.occurredAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}
                      </span>
                      {checkInRowId(event) && <button type="button" className="btn-secondary history-fix" aria-label={fixLabel(event)}
                        onClick={() => setFixCheckInId(checkInRowId(event) ?? null)}>FIX</button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {!loading && !readError && days.length > shown.length && <button type="button" className="btn-secondary" onClick={() => setLimit(shown.length + 14)}>SHOW MORE DAYS</button>}
    </div>
  );
}
