import { useEffect, useState } from "react";
import { getMetricDetail, type MetricDetail } from "../../application/metricDetailQueries";
import { DETAIL_RANGES, rangeValues, summarise, WEEK_MODE, type DetailMetric, type DetailRange } from "../../application/metricDetail";
import type { PeriodValue } from "../../domain/health/measuredSeries";
import { LogSheet } from "../components/LogSheet";
import { SourceTag } from "../foundation/primitives";
import { describeGarminAsOf, SyncGarminLink, UnusualNote } from "../screens/today/MeasuredSheet";
import { askAlfred } from "../components/AlfredSheet";
import "../foundation/foundation.css";
import "./metricDetail.css";

/**
 * METRIC-PAGE-001 (pilot, Gavin 2026-11-14: "Build and validate a reusable metric-detail foundation using Hydration and
 * Steps"): one page shape for a number, with each metric keeping its own meaning.
 * - TODAY shows the lived day from 16:30: water by hour (your logs), steps as Garmin's running total.
 * - 7D and 30D show one bar per lived day; a day with no record has no bar and is counted as missing, never 0.
 * - 1Y shows the year by week: water as the average of its logged days, steps as the week's measured total.
 * - Your usual (median of 28 finished days), and work days against days off, from your recorded work context.
 * - The existing routes: water's records (corrections) and logging; Garmin sync and Alfred for steps.
 * Read only. Your logs are white; Garmin's measurements are Garmin blue (GARMIN-004). Nothing here changes advice.
 */
const TITLE: Record<DetailMetric, string> = { water: "HYDRATION", steps: "STEPS" };
const NOUN: Record<DetailMetric, { none: string; unit: string }> = { water: { none: "not logged", unit: "oz" }, steps: { none: "not measured", unit: "steps" } };
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const withUnit = (metric: DetailMetric, n: number) => metric === "water" ? `${fmt(n)} oz` : `${fmt(n)} steps`;
const clock = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const day = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const week = (t: number) => `Week of ${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max)), steps = [1, 2, 2.5, 5, 10];
  return steps.map((s) => s * magnitude).find((s) => s >= max)!;
}
const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : `${v}`);
const W = 320, H = 150, LEFT = 32, BOTTOM = 18, TOP = 8;

/** One bar per period. A missing period draws a short dashed stub at the baseline, so a gap reads as a gap. */
function Bars({ metric, values, selected, onSelect, usual, label }: {
  metric: DetailMetric; values: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; usual: number | null; label: (v: PeriodValue) => string;
}) {
  const max = niceMax(Math.max(...values.map((v) => v.value ?? 0), usual ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / values.length, barW = Math.max(2, Math.min(22, slot - 2));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const recorded = values.filter((v) => v.value !== null).length;
  return <svg className={`md-chart md-chart--${metric}`} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${values.length} bars, ${recorded} with a record, ${values.length - recorded} ${NOUN[metric].none}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {usual !== null && <line className="md-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {values.map((v, i) => {
      const x = LEFT + i * slot + (slot - barW) / 2;
      return <g key={v.from} className="md-bar" data-missing={v.value === null ? "" : undefined} role="button" tabIndex={0} aria-label={label(v)} aria-pressed={i === selected}
        onClick={() => onSelect(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } }}>
        <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH} fill="transparent" />
        {v.value === null ? <line className="md-missing" x1={x} x2={x + barW} y1={TOP + plotH - 1.5} y2={TOP + plotH - 1.5} />
          : v.value > 0 && <rect className={`md-fill${i === selected ? " md-fill--on" : ""}`} x={x} y={y(v.value)} width={barW} height={TOP + plotH - y(v.value)} opacity={v.partial ? 0.6 : 1} />}
      </g>;
    })}
    <text className="md-axis" x={LEFT} y={H - 4}>{values.length > 40 ? week(values[0]!.from) : day(values[0]!.from)}</text>
    <text className="md-axis" x={W} y={H - 4} textAnchor="end">{values.at(-1)!.partial ? "now" : day(values.at(-1)!.from)}</text>
  </svg>;
}

/** Water today: what you logged in each hour of the lived day, from 16:30, with now marked. */
function WaterHours({ today }: { today: Extract<MetricDetail["today"], { kind: "hours" }> }) {
  const max = niceMax(Math.max(8, ...today.slots)), plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / 24;
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  return <svg className="md-chart md-chart--water" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Water by hour since ${clock(today.from)}: ${fmt(today.slots.reduce((a, b) => a + b, 0))} oz in ${today.entries} logs.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {today.slots.map((oz, i) => oz > 0 && <rect key={i} className="md-fill" x={LEFT + i * slot + 1} width={slot - 2} y={y(oz)} height={TOP + plotH - y(oz)} />)}
    {today.nowSlot >= 0 && today.nowSlot < 24 && <line className="md-now" x1={LEFT + (today.nowSlot + 0.5) * slot} x2={LEFT + (today.nowSlot + 0.5) * slot} y1={TOP} y2={TOP + plotH} />}
    {[0, 6, 12, 18].map((h) => <text key={h} className="md-axis" x={LEFT + h * slot} y={H - 4} textAnchor={h ? "middle" : "start"}>{clock(today.from + h * 3_600_000)}</text>)}
  </svg>;
}

/** Steps today: Garmin's running total through the lived day, with your usual for this kind of day. */
function StepsRunning({ today, usual }: { today: Extract<MetricDetail["today"], { kind: "running" }>; usual: number | null }) {
  const last = today.points.at(-1)!, span = 24 * 3_600_000;
  const max = niceMax(Math.max(last.total, usual ?? 0)), plotW = W - LEFT, plotH = H - BOTTOM - TOP;
  const x = (t: number) => LEFT + ((t - today.from) / span) * plotW, y = (v: number) => TOP + plotH - (v / max) * plotH;
  return <svg className="md-chart md-chart--steps" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Running step total: ${fmt(last.total)} by ${clock(last.t)}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {usual !== null && <><line className="md-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} /><text className="md-axis" x={W} y={y(usual) - 4} textAnchor="end">usual</text></>}
    <polyline className="md-line" points={today.points.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
    <circle className="md-dot" cx={x(last.t)} cy={y(last.total)} r={4} />
    {[0, 6, 12, 18].map((h) => <text key={h} className="md-axis" x={x(today.from + h * 3_600_000)} y={H - 4} textAnchor={h ? "middle" : "start"}>{clock(today.from + h * 3_600_000)}</text>)}
  </svg>;
}

export function MetricDetailSheet({ open, metric, onClose, onRecords, onLog, refreshKey = 0 }: {
  open: boolean; metric: DetailMetric; onClose: () => void;
  /** The metric's existing records view, where corrections live (water: health records or water history). */
  onRecords?: (() => void) | undefined;
  /** The metric's existing logging route (water: LOG's water sheet). */
  onLog?: (() => void) | undefined;
  refreshKey?: number;
}) {
  const [detail, setDetail] = useState<MetricDetail | null | "ERROR">(null);
  const [range, setRange] = useState<DetailRange>("today");
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { if (open) { setRange("today"); setSelected(null); } }, [open, metric]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setDetail(null);
    void getMetricDetail(metric).then((d) => { if (live) setDetail(d); }, () => { if (live) setDetail("ERROR"); });
    return () => { live = false; };
  }, [open, metric, refreshKey]);

  const d = detail && detail !== "ERROR" ? detail : null;
  const garmin = d?.source === "GARMIN";
  const values = d && range !== "today" ? rangeValues(d.series, range, WEEK_MODE[metric]) : [];
  const index = selected ?? values.length - 1;
  const byWeek = range === "1y";
  const label = (v: PeriodValue) => `${byWeek ? week(v.from) : day(v.from)} · ${v.value === null ? NOUN[metric].none : `${withUnit(metric, v.value)}${byWeek ? (WEEK_MODE[metric] === "sum" ? " that week" : " a logged day") : ""}`}${v.partial ? " so far" : ""}`;
  const sum = summarise(values.filter((v) => !v.partial));
  const todayValue = d?.series.at(-1)?.value ?? null;
  // Close first, then follow the route once focus is back on the tile that opened the page, so that route's BACK
  // returns there (the shell remembers the focused element as the origin).
  const go = (fn?: () => void) => (fn ? () => { onClose(); requestAnimationFrame(() => requestAnimationFrame(fn)); } : undefined);

  return <LogSheet open={open} title={TITLE[metric]} onClose={onClose}>
    {!open ? null : detail === "ERROR" ? <p role="alert" className="md-meta">Couldn't read {TITLE[metric].toLowerCase()}. Your records are unchanged.</p>
      : !d ? <p role="status" className="md-meta">Reading…</p>
      : <div className="bf md" data-metric={metric}>
      <div className="md-source">
        <SourceTag garmin={garmin}>{garmin ? "GARMIN" : "LOGGED"}</SourceTag>
        <span className="md-meta">{garmin ? (d.asOf !== null ? describeGarminAsOf(d.asOf, d.readAt) : "No Garmin data yet.") : "Your logs. Garmin hydration isn't imported."}</span>
      </div>

      <div role="group" aria-label={`${TITLE[metric]} range`} className="md-ranges">
        {DETAIL_RANGES.map(([id, text, name]) => <button key={id} type="button" aria-pressed={range === id} aria-label={name} onClick={() => { setRange(id); setSelected(null); }}>{text}</button>)}
      </div>

      {garmin && <UnusualNote metric="steps" reading={d.unusual} />}

      {range === "today" ? <>
        <p className="md-hero" data-md-hero><b>{todayValue === null ? "—" : fmt(todayValue)}</b> <span>{todayValue === null ? `${NOUN[metric].none} yet this lived day` : `${NOUN[metric].unit} so far · since ${clock(d.today.from)}`}</span></p>
        {d.today.kind === "hours"
          ? (d.today.entries ? <WaterHours today={d.today} /> : <p className="md-meta">No water logged yet this lived day.</p>)
          : (d.today.points.length > 1 ? <StepsRunning today={d.today} usual={d.usual.value} /> : <p className="md-meta">No steps measured yet this lived day. Send from the helper to update.</p>)}
      </> : <>
        <p className="md-hero" data-md-hero><b>{sum.average === null ? "—" : fmt(sum.average)}</b> <span>{byWeek ? (WEEK_MODE[metric] === "sum" ? "steps a week, on average" : "oz a logged day, on average") : `${NOUN[metric].unit} a day, on average`}</span></p>
        <p className="md-meta" data-md-coverage>{sum.recorded} of {sum.total} {byWeek ? "weeks" : "finished days"} {garmin ? "measured" : "logged"}{sum.total - sum.recorded ? ` · ${sum.total - sum.recorded} ${NOUN[metric].none}, left out` : ""} · this lived day not counted</p>
        <Bars metric={metric} values={values} selected={index} onSelect={setSelected} label={label} usual={byWeek && WEEK_MODE[metric] === "sum" ? null : d.usual.value} />
        <p className="md-readout" aria-live="polite">{label(values[index]!)}</p>
        <details className="md-table"><summary>Show as table</summary>
          <table><tbody>{[...values].reverse().map((v) => <tr key={v.from}><th scope="row">{byWeek ? week(v.from) : day(v.from)}</th><td>{v.value === null ? (garmin ? "Not measured" : "Not logged") : withUnit(metric, v.value)}{v.partial ? " so far" : ""}</td></tr>)}</tbody></table>
        </details>
      </>}

      <section className="md-split" aria-label="Work days and days off">
        {(["work", "off"] as const).map((k) => <div key={k} className="md-split__side" data-md-split={k}>
          <p className="md-split__label">{k === "work" ? "WORK DAYS" : "DAYS OFF"}</p>
          <p className="md-split__value">{d.split[k].median === null ? <span className="md-none">Not enough yet</span> : <>{fmt(d.split[k].median!)}<small> {NOUN[metric].unit}</small></>}</p>
          <p className="md-meta">{d.split[k].days} recorded {d.split[k].days === 1 ? "day" : "days"} · last 8 weeks</p>
        </div>)}
      </section>

      <p className="md-meta" data-md-usual>{d.usual.value !== null
        ? `Usual${metric === "steps" && d.usual.dayKind ? (d.usual.dayKind === "OFF" ? " on days off" : " on work days") : ""}: ${withUnit(metric, d.usual.value)} · median of the last 28 finished days.`
        : metric === "steps" && d.usual.dayKind === null ? "Usual steps need today set as a work day or a day off."
        : `Your usual appears after ${d.usual.need} ${garmin ? "measured" : "logged"} days (${d.usual.samples} so far).`}</p>

      <div className="md-actions">
        {metric === "water" && onLog && <button type="button" className="md-act" onClick={go(onLog)}>LOG WATER</button>}
        {metric === "water" && onRecords && <button type="button" className="md-act" onClick={go(onRecords)}>WATER RECORDS</button>}
        {garmin && <SyncGarminLink />}
        <button type="button" className="md-act" onClick={() => { onClose(); askAlfred(`About my ${TITLE[metric].toLowerCase()} lately: what's the pattern against my shifts, and what would help?`); }}>ASK ALFRED</button>
      </div>
      <p className="md-meta">{garmin ? "Measured by Garmin. A day with no measurement is missing, not zero." : "A day with nothing logged is missing, not zero. Corrections live in the records."} Nothing here changes BEYOND's advice.</p>
    </div>}
  </LogSheet>;
}
