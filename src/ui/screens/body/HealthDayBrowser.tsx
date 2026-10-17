import { useEffect, useState } from "react";
import { getHealthDay, healthDayStart, offsetHealthDay, type HealthDay, type HealthHistoryDestination } from "../../../application/healthRecordQueries";
import type { InsightMetric } from "../../../application/bodyInsightsQueries";
import { HealthMeasure, describeRecord } from "./DailyHealthRecord";
import type { SourceSelection } from "./HealthSources";
import { formatDuration } from "./bodyScreenCopy";
import "./connectedHealth.css";

function dayDate(start: string) { return new Date(start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
const localDate = (start: string) => { const d = new Date(start); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function HealthDayBrowser({ selected, onSelect, onExplore, refreshKey, visible, onInspect, disabled, onHistory }: {
  onHistory?: ((destination: HealthHistoryDestination) => void) | undefined;
  onInspect: (selection: SourceSelection) => void; disabled: boolean;
  selected: string | null; onSelect: (start: string | null) => void; onExplore: (metric: InsightMetric, dayId?: string) => void;
  refreshKey: number; visible: boolean;
}) {
  const current = healthDayStart();
  const [record, setRecord] = useState<HealthDay | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!visible || !selected) return;
    let live = true;
    setRefreshing(true); setError(false);
    void getHealthDay(selected).then((data) => { if (live) { setRefreshing(false); setRecord(data); } }).catch(() => { if (live) { setRefreshing(false); setError(true); } });
    return () => { live = false; };
  }, [selected, visible, refreshKey, retry]);
  const start = selected ?? current;
  const recent = Array.from({ length: 7 }, (_, i) => offsetHealthDay(current, i - 6));
  const records = record?.records.map((source) => source.record) ?? [];
  const sum = (kind: "WATER" | "MEAL" | "PROTEIN", field: "water" | "calories" | "protein") => {
    const matching = records.filter((r) => r.kind === kind || (field === "protein" && r.kind === "MEAL"));
    if (!matching.length) return "Not recorded";
    const total = matching.reduce((n, r) => n + (r.kind === "WATER" ? r.entry.effectiveAmountOz : r.kind === "MEAL" ? field === "calories" ? r.entry.effectiveCalories : r.entry.effectiveProteinG : r.kind === "PROTEIN" ? r.entry.effectiveGrams : 0), 0);
    return <>{total}<span> {field === "water" ? "oz" : field === "calories" ? "kcal" : "g"}</span></>;
  };
  const mains = records.filter((r) => r.kind === "SLEEP" && r.entry.kind === "PRIMARY");
  const naps = records.flatMap((r) => r.kind === "SLEEP" && r.entry.kind === "SUPPLEMENTAL" ? [r.entry] : []);
  const weights = records.flatMap((r) => r.kind === "WEIGHT" ? [r.entry] : []);
  const main = mains.at(-1);
  return <section className="health-day-browser" aria-label="Browse health days">
    <details className="health-day-controls"><summary>Browse health days</summary>
    <div className="health-day-heading"><span className="meta">{selected ? dayDate(start) : "Your current day"}</span><button disabled={disabled} type="button" className="btn-secondary" aria-pressed={!selected} onClick={() => onSelect(null)}>CURRENT DAY</button></div>
    <div className="health-day-strip" role="group" aria-label="Seven lived days">
      {recent.map((at) => <button disabled={disabled} type="button" key={at} aria-label={`Inspect ${dayDate(at)}`} aria-pressed={at === start} onClick={() => onSelect(at === current ? null : at)}>
        <span>{new Date(at).toLocaleDateString([], { weekday: "short" })}</span><strong>{new Date(at).getDate()}</strong>
      </button>)}
    </div>
    <details className="health-earlier"><summary>Choose another day</summary><label>Health record date<input disabled={disabled} className="input" type="date" max={localDate(current)} value={localDate(start)} onChange={(event) => {
      const value = event.target.value;
      if (!value || value > localDate(current)) return;
      const [year, month, date] = value.split("-").map(Number);
      if (!year || !month || !date) return;
      const next = new Date(year, month - 1, date, 16, 30).toISOString();
      onSelect(next === current ? null : next);
    }} /></label></details>
    </details>
    {selected && <div className="health-past-day" role="region" aria-label="Selected health day" aria-live="polite">
      <p className="meta">Past day · read-only. New records are always logged in your current day.</p>
      <p className="meta">{new Date(start).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} → {new Date(offsetHealthDay(start, 1)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
      {error ? <div role="alert"><p>Could not read this day. It is unavailable, not empty.</p><button disabled={disabled} type="button" className="btn-secondary" onClick={() => setRetry((n) => n + 1)}>RETRY DAY</button></div> : !record || record.start !== selected ? <p role="status" className="meta">Reading the selected day…</p> : <>
        {refreshing && <p className="meta" role="status">Refreshing recorded values…</p>}
        <p className="meta">{record.context === "UNKNOWN" ? "Work context not recorded" : record.context === "WORK" ? "Working · recorded context" : "Off · recorded context"}{record.days.length > 1 ? ` · ${record.days.length} recorded day segments` : ""}</p>
        {!record.days.length && <p className="meta">Nothing recorded in this lived day. No day has been created.</p>}
        <div className="readout-grid readout-grid--primary health-nutrition">
          <HealthMeasure label="CALORIES" value={sum("MEAL", "calories")} metric="calories" onExplore={(metric) => onExplore(metric, record?.days.at(-1)?.id)} />
          <HealthMeasure label="PROTEIN" value={sum("PROTEIN", "protein")} metric="protein" onExplore={(metric) => onExplore(metric, record?.days.at(-1)?.id)} />
        </div>
        <div className="readout-grid health-readings">
          <HealthMeasure label="WATER" value={sum("WATER", "water")} metric="water" onExplore={(metric) => onExplore(metric, record?.days.at(-1)?.id)} />
          <HealthMeasure label="RECORDED WEIGHT" value={weights.length ? `${weights.at(-1)!.effectiveWeightLbs} lbs` : "Not recorded"} metric="weight" onExplore={(metric) => onExplore(metric, record?.days.at(-1)?.id)} detail={weights.length > 1 ? `Latest of ${weights.length} weigh-ins` : undefined} />
          <HealthMeasure label="MAIN SLEEP" value={main?.kind === "SLEEP" ? formatDuration(main.entry.effectiveDurationMinutes) : "Not recorded"} metric="sleep" onExplore={(metric) => onExplore(metric, record?.days.at(-1)?.id)} detail={mains.length > 1 ? `Latest of ${mains.length} main-sleep records; not combined` : undefined} />
          <div className="readout"><p className="tool-label">NAPS</p><p className="readout__value">{naps.length ? formatDuration(naps.reduce((n, entry) => n + entry.effectiveDurationMinutes, 0)) : "Not recorded"}</p></div>
        </div>
        {record.records.some(({ record: r }) => Date.parse(r.entry.recordedAt) >= Date.parse(record.end)) && <p className="meta">Some entries belong to an older day record that spans this window. Their recorded ownership is preserved.</p>}
        <p className="meta">Recorded amounts only. Unlogged intake is unknown; historical targets are not reconstructed.</p>
        <details><summary>Recorded entries · {records.length}</summary><ul className="health-past-records">{record.records.map(({ beyondDayId, record: r }) => <li key={r.entry.rootEventId}><strong>{describeRecord(r)}</strong><span>{new Date(r.entry.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {r.entry.correctionCount} corrections</span><button disabled={disabled} type="button" className="btn-secondary" onClick={() => onInspect({ metric: r.kind === "WATER" ? "water" : r.kind === "WEIGHT" ? "weight" : r.kind === "SLEEP" ? "sleep" : r.kind === "MEAL" ? "calories" : "protein", point: { id: r.entry.rootEventId, at: r.entry.recordedAt, value: r.kind === "WATER" ? r.entry.effectiveAmountOz : r.kind === "WEIGHT" ? r.entry.effectiveWeightLbs : r.kind === "SLEEP" ? r.entry.effectiveDurationMinutes / 60 : r.kind === "MEAL" ? r.entry.effectiveCalories : r.entry.effectiveGrams, source: { beyondDayId, rootEventId: r.entry.rootEventId } } })} aria-label={`Source of ${describeRecord(r)}`}>INSPECT SOURCE</button></li>)}</ul></details>
        {onHistory && record.days.map((day, index) => <button key={day.id} type="button" className="btn-secondary" disabled={disabled} onClick={() => onHistory({ dayId: day.id })}>{record.days.length > 1 ? `FULL DAY HISTORY · SEGMENT ${index + 1}` : "FULL DAY HISTORY"}</button>)}
      </>}
    </div>}
  </section>;
}
