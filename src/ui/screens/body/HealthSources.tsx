import { HoldButton } from "../../components/HoldButton";
import { useEffect, useRef, useState } from "react";
import { getHealthSources, type HealthHistoryDestination, type HealthRecord, type HealthSources as Sources } from "../../../application/healthRecordQueries";
import type { InsightMetric, InsightPoint } from "../../../application/bodyInsightsQueries";
import { describeRecord } from "./DailyHealthRecord";
import { formatDuration } from "./bodyScreenCopy";

export interface SourceSelection { point: InsightPoint; metric: InsightMetric }
function originalValue(record: HealthRecord) {
  switch (record.kind) {
    case "WATER": return `${record.entry.originalAmountOz} oz`;
    case "SLEEP": return formatDuration(record.entry.originalDurationMinutes);
    case "WEIGHT": return `${record.entry.originalWeightLbs} lbs`;
    case "PROTEIN": return `${record.entry.originalGrams} g`;
    case "MEAL": return `${record.entry.originalCalories} kcal · ${record.entry.originalProteinG} g protein`;
  }
}

/** Inspection never writes. A current-day correction explicitly returns to its existing form. */
export function HealthSources({ selection, revision, active, activeDayId, onCorrect, onHistory, onClose, allowHistoricalCorrection = false, returnLabel = "BACK TO TREND" }: {
  returnLabel?: string;
  selection: SourceSelection; revision: number; active: boolean; activeDayId: string | undefined;
  onCorrect: (record: HealthRecord, sourceDayId?: string) => void;
  allowHistoricalCorrection?: boolean;
  onHistory?: ((destination: HealthHistoryDestination) => void) | undefined;
  onClose: () => void;
}) {
  const reading = useRef(false);
  const loadedFor = useRef<SourceSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const historyOrigin = useRef<{ root: string | null; scrollY: number } | null>(null);
  function openHistory(destination: HealthHistoryDestination, root: string | null) {
    historyOrigin.current = { root, scrollY: window.scrollY };
    onHistory?.(destination);
  }
  const [data, setData] = useState<Sources | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active) return;
    let live = true;
    reading.current = true;
    if (loadedFor.current !== selection) setData(null);
    setRefreshing(true); setFailed(false);
    void getHealthSources(selection.point, selection.metric).then((next) => { if (live) { reading.current = false; loadedFor.current = selection; setRefreshing(false); setData(next); } }).catch(() => { if (live) { reading.current = false; setRefreshing(false); setData(null); setFailed(true); } });
    return () => { live = false; };
  }, [selection, revision, active, retry]);
  useEffect(() => {
    if (!active || reading.current || (!data && !failed) || !historyOrigin.current) return;
    const origin = historyOrigin.current;
    historyOrigin.current = null;
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (focused && focused !== document.body && focused.id !== "meal-surface-heading" && focused.id !== "health-source-heading" && !focused.closest("[hidden]")) return;
      const row = [...document.querySelectorAll<HTMLElement>("[data-source-root]")].find((el) => el.dataset.sourceRoot === origin.root);
      const target = failed ? document.getElementById("health-source-retry") : row?.querySelector<HTMLElement>("button") ?? document.getElementById("health-source-heading");
      target?.focus({ preventScroll: true }); window.scrollTo({ top: origin.scrollY, behavior: "instant" });
    });
  }, [data, failed, active]);
  return <section className="health-sources" aria-labelledby="health-source-heading">
    <div className="health-day-heading"><h2 id="health-source-heading" tabIndex={-1} className="insights-title">Source records</h2><button type="button" className="btn-secondary" onClick={onClose}>{returnLabel}</button></div>
    <p className="meta">{selection.metric === "workouts" ? "Finished sessions" : "Effective recorded entries"} behind the selected observation. {allowHistoricalCorrection ? "Corrections preserve original records." : "Historical records are read-only here."}</p>
    {refreshing && data && <p className="meta" role="status">Refreshing source records…</p>}
    {failed ? <div role="alert"><p>Could not read the source records. Your data is unchanged.</p><button type="button" className="btn-secondary" id="health-source-retry" onClick={() => setRetry((n) => n + 1)}>RETRY SOURCES</button></div> : !data ? <p className="meta" role="status">Reading source records…</p> : <>
      {data.records.length === 0 && data.workouts.length === 0 && <p className="meta">{selection.metric === "workouts" ? "No finished sessions in this recorded day." : "No standing entries for this observation now. It may have been undone; reopen the trend to refresh."}</p>}
      {data.records.map(({ beyondDayId, record }) => <article key={record.entry.rootEventId} className="health-source-row" data-source-root={record.entry.rootEventId}>
        <h3 className="health-source-name">{describeRecord(record)}</h3>
        {record.kind === "MEAL" && <p className="meta">{record.entry.effectiveCalories} kcal · {record.entry.effectiveProteinG} g protein · consumed snapshot</p>}
        <p className="meta">Recorded {new Date(record.entry.recordedAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</p>
        <p className="meta">{record.entry.correctionCount ? `Original: ${originalValue(record)} · ${record.entry.correctionCount} corrections; effective value shown above.` : "Original recorded value · no corrections"}</p>
        <div className="health-source-actions">
          {onHistory && <button type="button" className="btn-secondary" onClick={() => openHistory({ dayId: beyondDayId, eventId: record.entry.headEventId }, record.entry.rootEventId)}>FULL HISTORY</button>}
          {allowHistoricalCorrection ? <HoldButton className="btn-secondary" disabled={refreshing} hint="Hold to open correction or deletion. Original records stay." onConfirm={() => onCorrect(record, beyondDayId)}>CORRECT / DELETE</HoldButton> : beyondDayId === activeDayId && <button type="button" className="btn-secondary" disabled={refreshing} onClick={() => onCorrect(record, beyondDayId)}>CORRECT ENTRY</button>}
        </div>
      </article>)}
      {data.workouts.map((session) => <article className="health-source-row" key={session.id}><h3 className="health-source-name">{session.templateId} · {session.sessionType}</h3><p className="meta">{session.status} · {new Date(session.startedAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</p></article>)}
      {onHistory && data.days.map((day) => <button type="button" className="btn-secondary" key={day.id} onClick={() => openHistory({ dayId: day.id }, null)}>COMPLETE DAY HISTORY</button>)}
    </>}
  </section>;
}
