import { useEffect, useState } from "react";
import type { MeasuredSnapshot } from "../../../application/measuredQueries";
import type { Baseline } from "../../../domain/health/baselines";
import { average, hypnogram, sleepMinutes, stageMinutes, STAGE_ORDER, weekly, type PeriodValue, type StageName } from "../../../domain/health/measuredSeries";
import { LogSheet } from "../../components/LogSheet";
import { hoursMinutes, localTime } from "../health/healthFormat";
import "./measuredSheet.css";

/**
 * GARMIN-004 (owner approval 2026-10-22): the detail behind TODAY's Garmin tiles, as a sheet over
 * TODAY. Display only — measured values, your own usual, and nothing that changes guidance.
 */
export type MeasuredMetric = "steps" | "resting" | "sleep";
type Range = "today" | "lastNight" | "7d" | "4w" | "1y";

const TITLES: Record<MeasuredMetric, string> = { steps: "STEPS", resting: "RESTING HEART RATE", sleep: "SLEEP" };
const RANGES: Record<MeasuredMetric, readonly [Range, string][]> = {
  steps: [["today", "TODAY"], ["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
  resting: [["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
  sleep: [["lastNight", "LAST NIGHT"], ["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
};
/** The sleep stage ramp: one hue, light (awake) to dark (deep), validated as an ordinal ramp on the dark surface. */
export const STAGE_COLORS: Record<StageName, string> = { AWAKE: "#cde2fb", REM: "#6da7ec", LIGHT: "#2a78d6", DEEP: "#184f95" };
const STAGE_LABELS: Record<StageName, string> = { AWAKE: "Awake", REM: "REM", LIGHT: "Light", DEEP: "Deep" };
const MARK = "#3987e5", MARK_SELECTED = "#86b6ef";

const count = (n: number) => Math.round(n).toLocaleString("en-US");
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
export function formatMeasured(metric: MeasuredMetric, value: number): string {
  return metric === "steps" ? count(value) : metric === "resting" ? `${value} bpm` : hoursMinutes(value);
}
const unitWord = (metric: MeasuredMetric) => (metric === "steps" ? "steps" : metric === "resting" ? "bpm" : "asleep");
const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
const weekLabel = (t: number) => `Week of ${new Date(t).toLocaleDateString("en-US", { day: "numeric", month: "short" })}`;

/** "Usual on work days: 4,900" — or how many more measured days a usual needs. */
export function describeUsual(metric: MeasuredMetric, usual: Baseline & { dayKind?: "WORK" | "OFF" | null }): string {
  if (metric === "steps" && usual.dayKind === null) return "Usual steps need today set as a work day or a day off.";
  if (usual.value === null) return `Your usual appears after 14 days of Garmin data (${usual.samples} so far).`;
  const kind = metric === "steps" ? (usual.dayKind === "OFF" ? " on days off" : " on work days") : "";
  return `Usual${kind}: ${formatMeasured(metric, usual.value)} · median of the last 28 days.`;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max)), steps = [1, 2, 2.5, 5, 10];
  return steps.map((s) => s * magnitude).find((s) => s >= max)!;
}
const tick = (metric: MeasuredMetric, v: number) => metric === "sleep" ? `${Math.round(v / 60)}h` : v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : `${v}`;

const W = 320, H = 150, LEFT = 30, BOTTOM = 18, TOP = 8;

function BarChart({ metric, values, selected, onSelect, label, usual }: {
  metric: MeasuredMetric; values: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; label: (v: PeriodValue) => string; usual: number | null;
}) {
  const max = niceMax(Math.max(...values.map((v) => v.value ?? 0), usual ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / values.length;
  const barW = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const measured = values.filter((v) => v.value !== null).length;
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${values.length} bars, ${measured} measured. Highest ${formatMeasured(metric, Math.max(...values.map((v) => v.value ?? 0)))}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="measured-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="measured-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(metric, g)}</text></g>)}
    {usual !== null && <line className="measured-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {values.map((v, i) => {
      const x = LEFT + i * slot + (slot - barW) / 2;
      const top = v.value === null ? null : y(v.value), r = Math.min(4, barW / 2);
      return <g key={v.from} className="measured-bar" onClick={() => onSelect(i)}>
        <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH} fill="transparent" />
        {top !== null && v.value! > 0 && <path d={`M${x},${TOP + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${TOP + plotH} Z`}
          fill={i === selected ? MARK_SELECTED : MARK} opacity={v.partial ? 0.6 : 1} />}
        <title>{label(v)}</title>
      </g>;
    })}
    <text className="measured-axis" x={LEFT} y={H - 4}>{values.length > 8 ? (values.length > 40 ? weekLabel(values[0]!.from) : dayLabel(values[0]!.from)) : dayLabel(values[0]!.from)}</text>
    <text className="measured-axis" x={W} y={H - 4} textAnchor="end">{values.at(-1)!.partial ? "today" : dayLabel(values.at(-1)!.from)}</text>
  </svg>;
}

function TodayLine({ snapshot }: { snapshot: MeasuredSnapshot }) {
  const points = snapshot.stepsToday, from = snapshot.current.from, span = 24 * 3600_000;
  const usual = snapshot.usual.steps.value;
  const max = niceMax(Math.max(points.at(-1)?.total ?? 0, usual ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP;
  const x = (t: number) => LEFT + ((t - from) / span) * plotW, y = (v: number) => TOP + plotH - (v / max) * plotH;
  const last = points.at(-1)!;
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Running step total today: ${count(last.total)} by ${localTime(last.t)}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="measured-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="measured-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick("steps", g)}</text></g>)}
    {usual !== null && <><line className="measured-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} /><text className="measured-axis" x={W} y={y(usual) - 4} textAnchor="end">usual</text></>}
    <polyline className="measured-line" points={points.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
    <circle className="measured-dot" cx={x(last.t)} cy={y(last.total)} r={4} />
    {[0, 6, 12, 18].map((h) => <text key={h} className="measured-axis" x={x(from + h * 3600_000)} y={H - 4} textAnchor={h ? "middle" : "start"}>{localTime(from + h * 3600_000)}</text>)}
  </svg>;
}

function Hypnogram({ sleep }: { sleep: NonNullable<MeasuredSnapshot["lastNight"]> }) {
  const from = Date.parse(sleep.startTime), to = Date.parse(sleep.endTime), span = Math.max(1, to - from);
  const rowH = (H - BOTTOM - TOP) / 4, plotW = W - LEFT - 6;
  const x = (t: number) => LEFT + ((t - from) / span) * plotW;
  const intervals = hypnogram(sleep);
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sleep stages from ${localTime(from)} to ${localTime(to)}.`}>
    {STAGE_ORDER.map((stage, i) => <g key={stage}><line className="measured-grid" x1={LEFT} x2={W} y1={TOP + (i + 1) * rowH} y2={TOP + (i + 1) * rowH} /><text className="measured-axis" x={LEFT - 4} y={TOP + i * rowH + rowH / 2 + 3} textAnchor="end">{STAGE_LABELS[stage]}</text></g>)}
    {intervals.map((s) => { const row = STAGE_ORDER.indexOf(s.stage); return <rect key={`${s.from}-${s.stage}`} x={x(s.from)} y={TOP + row * rowH + 2} width={Math.max(1, x(s.to) - x(s.from))} height={rowH - 4} rx={2} fill={STAGE_COLORS[s.stage]} />; })}
    <text className="measured-axis" x={LEFT} y={H - 4}>{localTime(from)}</text>
    <text className="measured-axis" x={W} y={H - 4} textAnchor="end">{localTime(to)}</text>
  </svg>;
}

export function MeasuredSheet({ open, metric, snapshot, onClose, onAllRecords }: {
  open: boolean; metric: MeasuredMetric; snapshot: MeasuredSnapshot | null; onClose: () => void; onAllRecords?: (() => void) | undefined;
}) {
  const [range, setRange] = useState<Range>(RANGES[metric][0]![0]);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { if (open) { setRange(RANGES[metric][0]![0]); setSelected(null); } }, [open, metric]);
  const series = !snapshot ? [] : metric === "steps" ? snapshot.steps : metric === "resting" ? snapshot.resting : snapshot.sleep;
  const values = range === "7d" ? series.slice(-7) : range === "4w" ? series.slice(-28) : range === "1y" ? weekly(series, metric === "steps" ? "sum" : "mean") : [];
  const index = selected ?? values.length - 1;
  const usual = snapshot ? (metric === "steps" ? snapshot.usual.steps : metric === "resting" ? snapshot.usual.resting : snapshot.usual.sleep) : null;
  const label = (v: PeriodValue) => `${range === "1y" ? weekLabel(v.from) : dayLabel(v.from)} · ${v.value === null ? "not measured" : `${formatMeasured(metric, v.value)}${range === "1y" && metric === "steps" ? " that week" : ""}`}${v.partial ? " so far" : ""}`;
  const night = snapshot?.lastNight ?? null;
  const stages = night ? stageMinutes(night) : null;
  const avg = average(values);

  return <LogSheet open={open} title={TITLES[metric]} onClose={onClose}>
    {/* Rendered only while open, so a closed sheet adds nothing to the page. */}
    {!open ? null : !snapshot ? <p className="meta">Garmin data could not be read.</p> : <div className="measured-sheet">
      <div role="group" aria-label={`${TITLES[metric]} range`} className="measured-ranges">
        {RANGES[metric].map(([id, text]) => <button key={id} type="button" className="btn-secondary" aria-pressed={range === id} onClick={() => { setRange(id); setSelected(null); }}>{text}</button>)}
      </div>

      {range === "today" && <>
        <p className="measured-hero"><b>{series.at(-1)?.value === null || series.at(-1) === undefined ? "—" : count(series.at(-1)!.value!)}</b> <span>steps so far today</span></p>
        {snapshot.stepsToday.length > 1 ? <TodayLine snapshot={snapshot} /> : <p className="meta">No steps measured yet today. Send from the helper to update.</p>}
      </>}

      {range === "lastNight" && (night ? <>
        <p className="measured-hero"><b>{hoursMinutes(sleepMinutes(night))}</b> <span>asleep · {localTime(night.startTime)} → {localTime(night.endTime)}</span></p>
        {hypnogram(night).length ? <Hypnogram sleep={night} /> : <p className="meta">Garmin sent no sleep stages for this night.</p>}
        <dl className="measured-stages">{STAGE_ORDER.map((stage) => <div key={stage}><dt><i style={{ background: STAGE_COLORS[stage] }} aria-hidden="true" />{STAGE_LABELS[stage]}</dt><dd>{stages![stage] === null ? "Not recorded" : hoursMinutes(stages![stage]!)}</dd></div>)}</dl>
      </> : <p className="meta">No Garmin sleep in the last 24 hours.</p>)}

      {values.length > 0 && <>
        <p className="measured-hero"><b>{avg === null ? "—" : formatMeasured(metric, avg)}</b> <span>{range === "1y" && metric === "steps" ? "average a week" : `average ${metric === "sleep" ? "a night" : "a day"}`}</span></p>
        <BarChart metric={metric} values={values} selected={index} onSelect={setSelected} label={label} usual={range === "1y" && metric === "steps" ? null : usual?.value ?? null} />
        <p className="meta measured-readout" aria-live="polite">{label(values[index]!)}</p>
        {metric === "steps" && range !== "1y" && <p className="meta">{count(values.reduce((sum, v) => sum + (v.value ?? 0), 0))} steps in {values.filter((v) => v.value !== null).length} measured days.</p>}
        <details className="measured-table"><summary>Show as table</summary>
          <table><tbody>{[...values].reverse().map((v) => <tr key={v.from}><th scope="row">{range === "1y" ? weekLabel(v.from) : dayLabel(v.from)}</th><td>{v.value === null ? "Not measured" : formatMeasured(metric, v.value)}{v.partial ? " so far" : ""}</td></tr>)}</tbody></table>
        </details>
      </>}

      {usual && <p className="meta measured-usual-line">{describeUsual(metric, usual)}</p>}
      <p className="meta">Measured by Garmin. A day with no measurement is missing, not zero. Nothing here changes BEYOND’s advice.</p>
      {metric === "sleep" && onAllRecords && <button type="button" className="btn-secondary" onClick={onAllRecords}>ALL SLEEP RECORDS</button>}
    </div>}
  </LogSheet>;
}

export { clock as measuredClock };
