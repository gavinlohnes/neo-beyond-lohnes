import { useEffect, useRef, useState } from "react";
import { getMeasuredSnapshot, type MeasuredSnapshot } from "../../../application/measuredQueries";
import { getImportedSleep, getUnfiledGarminSleep } from "../../../application/externalSleepQueries";
import { average, hypnogram, sleepMinutes, stageMinutes, STAGE_ORDER, type PeriodValue } from "../../../domain/health/measuredSeries";
import type { ExternalSleepRevision, GarminSleepUnfiled } from "../../../domain/health/sleepImport";
import { LogSheet } from "../../components/LogSheet";
import { SleepEvidence } from "../health/ImportedSleepEvidence";
import { hoursMinutes } from "../health/healthFormat";
import { BarChart, Hypnogram, STAGE_COLORS, describeGarminAsOf, describeUsual, SyncGarminLink, UnusualNote } from "./MeasuredSheet";
import { moveSleepWindow, sleepWindow, sleepWindowValues, type SleepZoom } from "./sleepPeriods";

const date = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const month = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric" });
type Data = { snapshot: MeasuredSnapshot; records: ExternalSleepRevision[]; unfiled: Map<string, GarminSleepUnfiled> };

/** NAV-001: navigation over existing measured evidence, never a new sleep ledger or guidance. */
export function SleepMetricSheet({ open, onClose, onAllRecords }: {
  open: boolean; onClose: () => void; onAllRecords?: (() => void) | undefined;
}) {
  return <LogSheet open={open} title="SLEEP" onClose={onClose}>{open && <SleepPeriods active onAllRecords={onAllRecords} />}</LogSheet>;
}

/**
 * The sleep page itself — Day / Week / Month / Year over Garmin's measured sleep, stages on a day.
 * CAVE-DATA D2: shared by the sheet on TODAY and by the cave's VITALS, so there is one sleep page.
 */
export function SleepPeriods({ active, onAllRecords }: { active: boolean; onAllRecords?: (() => void) | undefined }) {
  const open = active;
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState<SleepZoom>("W"), [anchor, setAnchor] = useState(0), [limit, setLimit] = useState(10);
  const periodHeading = useRef<HTMLParagraphElement>(null);
  const focusPeriod = useRef(false);
  const suppressClick = useRef(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false; setData(null); setError(false); setZoom("W"); setLimit(10);
    void Promise.all([getMeasuredSnapshot(), getImportedSleep(), getUnfiledGarminSleep()]).then(([snapshot, records, unfiled]) => {
      if (cancelled) return;
      setData({ snapshot, records, unfiled }); setAnchor(snapshot.current.from);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, attempt]);
  const series = data?.snapshot.sleep ?? [];
  const { days, bars } = sleepWindowValues(series, anchor, zoom);
  const bounds = sleepWindow(anchor, zoom), latest = series.at(-1)?.from ?? 0, earliest = series[0]?.from ?? 0;
  const canEarlier = series.length > 0 && bounds.from > earliest;
  const canLater = series.length > 0 && bounds.to <= latest;
  function move(direction: -1 | 1) {
    if (direction === -1 ? !canEarlier : !canLater) return;
    setAnchor(moveSleepWindow(anchor, zoom, direction)); setLimit(10);
  }
  function select(bar: PeriodValue) { focusPeriod.current = true; setAnchor(bar.from); setZoom(zoom === "Y" ? "M" : "D"); setLimit(10); }
  useEffect(() => { if (focusPeriod.current) { focusPeriod.current = false; periodHeading.current?.focus({ preventScroll: true }); } }, [zoom, anchor]);
  const selectedDay = days[0];
  const nights = data && zoom === "D" && selectedDay ? data.records.filter((r) => {
    const start = Date.parse(r.evidence.startTime); return start >= selectedDay.from && start < selectedDay.to;
  }).sort((a, b) => sleepMinutes(b.evidence) - sleepMinutes(a.evidence)) : [];
  const night = nights[0]?.evidence, stages = night ? stageMinutes(night) : null;
  const mean = average(days), count = days.filter((p) => p.value !== null).length;
  const label = (v: PeriodValue) => `${zoom === "Y" ? month(v.from) : date(v.from)} · ${v.value === null ? "not measured" : hoursMinutes(v.value)}${zoom === "Y" ? " average" : ""}`;
  const title = zoom === "Y" ? `${new Date(anchor).getFullYear()}` : zoom === "M" ? new Date(anchor).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : zoom === "W" ? `Week of ${date(bounds.from)}` : date(anchor);
  return <>
    {!open ? null : error ? <div role="alert"><p>Sleep could not be read. Your records are unchanged.</p><button type="button" className="btn-secondary" onClick={() => setAttempt((n) => n + 1)}>RETRY SLEEP</button></div>
      : !data ? <p role="status">Reading sleep…</p> : <div className="measured-sheet sleep-metric">
      <div className="measured-ranges" role="group" aria-label="SLEEP period">
        {(["D", "W", "M", "Y"] as const).map((id) => <button type="button" className="btn-secondary" key={id} aria-label={{ D: "Day", W: "Week", M: "Month", Y: "Year" }[id]} aria-pressed={zoom === id} onClick={() => { setZoom(id); setLimit(10); }}>{id}</button>)}
      </div>
      <div className="sleep-period-navigation">
        <button type="button" className="btn-secondary" aria-label="Earlier sleep period" disabled={!canEarlier} onClick={() => move(-1)}>‹</button>
        <p ref={periodHeading} tabIndex={-1} className="meta" aria-live="polite">{title}</p>
        <button type="button" className="btn-secondary" aria-label="Later sleep period" disabled={!canLater} onClick={() => move(1)}>›</button>
      </div>
      <div className="sleep-period-chart" onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }} onPointerDown={(e) => { suppressClick.current = false; pointer.current = { x: e.clientX, y: e.clientY }; }} onPointerCancel={() => { pointer.current = null; }} onPointerUp={(e) => {
        const start = pointer.current; pointer.current = null; if (!start) return;
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); suppressClick.current = true; move(dx > 0 ? -1 : 1); }
      }}>
        <p className="measured-hero"><b>{mean === null ? "—" : hoursMinutes(mean)}</b> <span>{zoom === "D" ? "measured sleep" : "average a night"}</span></p>
        <p className="meta">{count} measured {count === 1 ? "night" : "nights"} · Garmin</p>
        {mean === null ? <p className="meta">Not enough data. No Garmin sleep measured in this period. Missing nights are not zero.</p>
          : zoom === "D" && night ? <>{hypnogram(night).length ? <Hypnogram sleep={night} /> : <p className="meta">Garmin sent no sleep stages for this night.</p>}
            <dl className="measured-stages">{STAGE_ORDER.map((stage) => <div key={stage}><dt><i style={{ background: STAGE_COLORS[stage] }} aria-hidden="true" />{stage === "REM" ? stage : stage[0] + stage.slice(1).toLowerCase()}</dt><dd>{stages![stage] === null ? "Not recorded" : hoursMinutes(stages![stage]!)}</dd></div>)}</dl></>
          : bars.length > 0 && <BarChart metric="sleep" values={bars} selected={-1} onSelect={(i) => select(bars[i]!)} label={label} usual={null} interactive />}
      </div>
      {zoom !== "D" && <details className="measured-table"><summary>Show nights and records</summary>
        <p className="meta">Select a {zoom === "Y" ? "month" : "night"} for its records.</p>
        {[...bars].reverse().slice(0, limit).map((v) => <button type="button" className="btn-secondary sleep-record-row" key={v.from} onClick={() => select(v)}>{label(v)}</button>)}
        {bars.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 10)}>SHOW MORE</button>}
      </details>}
      {zoom === "D" && nights.slice(0, limit).map((r) => <SleepEvidence key={r.id} revision={r} unfiled={data.unfiled.get(r.recordKey)} />)}
      {zoom === "D" && nights.length > limit && <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + 10)}>SHOW MORE</button>}
      {zoom !== "D" && <p className="meta">Tap a bar to inspect {zoom === "Y" ? "that month" : "that night"}. Swipe right for earlier, left for later.</p>}
      <p className="meta">Chart: longest Garmin session per BEYOND day. Logged or corrected main sleep can differ; inspect all sleep records to review or correct it. Nothing here changes advice.</p>
      <p className="meta">Chart history starts {date(earliest)}. {bounds.from < earliest ? "This period has partial history." : ""}</p>
      {data.snapshot.garminAsOf !== null && <p className="meta">{describeGarminAsOf(data.snapshot.garminAsOf, data.snapshot.readAt)}</p>}
      <UnusualNote metric="sleep" reading={data.snapshot.unusual.sleep} />
      <p className="meta">{describeUsual("sleep", data.snapshot.usual.sleep)}</p>
      <SyncGarminLink />
      {onAllRecords && <button type="button" className="btn-secondary" onClick={onAllRecords}>ALL SLEEP RECORDS</button>}
    </div>}
  </>;
}
