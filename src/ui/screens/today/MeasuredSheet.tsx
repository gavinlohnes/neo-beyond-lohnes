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
export type MeasuredMetric = "steps" | "resting" | "sleep" | "calories";
type Range = "today" | "lastNight" | "7d" | "4w" | "1y";

const TITLES: Record<MeasuredMetric, string> = { steps: "STEPS", resting: "RESTING HEART RATE", sleep: "SLEEP", calories: "CALORIES" };
const RANGES: Record<MeasuredMetric, readonly [Range, string][]> = {
  steps: [["today", "TODAY"], ["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
  resting: [["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
  sleep: [["lastNight", "LAST NIGHT"], ["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
  calories: [["today", "TODAY"], ["7d", "7D"], ["4w", "4W"], ["1y", "1Y"]],
};
/** GARMIN-005: burned wears Garmin blue, eaten BEYOND aqua — a validated pair on the dark surface; red stays the action color. */
export const BURNED_COLOR = "#3987e5", EATEN_COLOR = "#199e70";
/** The sleep stage ramp: one hue, light (awake) to dark (deep), validated as an ordinal ramp on the dark surface. */
export const STAGE_COLORS: Record<StageName, string> = { AWAKE: "#cde2fb", REM: "#6da7ec", LIGHT: "#2a78d6", DEEP: "#184f95" };
const STAGE_LABELS: Record<StageName, string> = { AWAKE: "Awake", REM: "REM", LIGHT: "Light", DEEP: "Deep" };
const MARK = "#3987e5", MARK_SELECTED = "#86b6ef";

const count = (n: number) => Math.round(n).toLocaleString("en-US");
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
export function formatMeasured(metric: MeasuredMetric, value: number): string {
  return metric === "steps" ? count(value) : metric === "resting" ? `${value} bpm` : metric === "calories" ? `${count(value)} kcal` : hoursMinutes(value);
}
/** SYNC-001: opens BEYOND Health Bridge (beyond-bridge://sync), which reads Health Connect and sends to BEYOND. */
export const HELPER_SYNC_URL = "intent://sync#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end";
/** The helper exists only on Android; elsewhere the link would go nowhere, so it isn't shown. */
export function SyncGarminLink() {
  if (typeof navigator === "undefined" || !/Android/i.test(navigator.userAgent)) return null;
  return <a className="btn-secondary measured-sync" href={HELPER_SYNC_URL}>SYNC GARMIN</a>;
}

/** "Garmin as of 14:20" today, otherwise with the date. */
export function describeGarminAsOf(at: number, now: number): string {
  const sameDay = new Date(at).toDateString() === new Date(now).toDateString();
  return `Garmin as of ${sameDay ? localTime(at) : `${dayLabel(at)}, ${localTime(at)}`}.`;
}
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

export function BarChart({ metric, values, selected, onSelect, label, usual, interactive = false }: {
  metric: MeasuredMetric; values: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; label: (v: PeriodValue) => string; usual: number | null; interactive?: boolean;
}) {
  const max = niceMax(Math.max(...values.map((v) => v.value ?? 0), usual ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / values.length;
  const barW = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const measured = values.filter((v) => v.value !== null).length;
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role={interactive ? "group" : "img"} aria-label={`${values.length} bars, ${measured} measured. Highest ${formatMeasured(metric, Math.max(...values.map((v) => v.value ?? 0)))}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="measured-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="measured-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(metric, g)}</text></g>)}
    {usual !== null && <line className="measured-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {values.map((v, i) => {
      const x = LEFT + i * slot + (slot - barW) / 2;
      const top = v.value === null ? null : y(v.value), r = Math.min(4, barW / 2);
      return <g key={v.from} className="measured-bar" role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? label(v) : undefined} onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } } : undefined} onClick={() => onSelect(i)}>
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

export function Hypnogram({ sleep }: { sleep: NonNullable<MeasuredSnapshot["lastNight"]> }) {
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
  const series = !snapshot ? [] : metric === "steps" ? snapshot.steps : metric === "resting" ? snapshot.resting : metric === "calories" ? snapshot.burned : snapshot.sleep;
  const values = range === "7d" ? series.slice(-7) : range === "4w" ? series.slice(-28) : range === "1y" ? weekly(series, metric === "steps" ? "sum" : "mean") : [];
  const index = selected ?? values.length - 1;
  const usual = snapshot ? (metric === "steps" ? snapshot.usual.steps : metric === "resting" ? snapshot.usual.resting : metric === "calories" ? snapshot.usual.burned : snapshot.usual.sleep) : null;
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

      {metric === "calories" ? <CaloriesBody snapshot={snapshot} range={range} selected={selected} onSelect={setSelected} /> : <>
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

      </>}

      {usual && <p className="meta measured-usual-line">{metric === "calories" ? describeUsual(metric, usual).replace("Usual:", "Usual burned:") : describeUsual(metric, usual)}</p>}
      {(metric === "calories" ? snapshot.caloriesAsOf : snapshot.garminAsOf) !== null && <p className="meta measured-asof">{describeGarminAsOf((metric === "calories" ? snapshot.caloriesAsOf : snapshot.garminAsOf)!, snapshot.readAt)}</p>}
      <SyncGarminLink />
      {metric === "calories" && <p className="meta">Burned is Garmin’s estimate, resting plus active; watch estimates can be off by 10–20%. Eaten is what you logged.</p>}
      <p className="meta">Measured by Garmin. A day with no measurement is missing, not zero. Nothing here changes BEYOND’s advice.</p>
      {metric === "sleep" && onAllRecords && <button type="button" className="btn-secondary" onClick={onAllRecords}>ALL SLEEP RECORDS</button>}
    </div>}
  </LogSheet>;
}

/** Two running totals through today: eaten (logged meals, steps at each meal) and burned (Garmin, hourly). */
function CaloriesTodayLine({ snapshot }: { snapshot: MeasuredSnapshot }) {
  const from = snapshot.current.from, span = 24 * 3600_000;
  const eaten = [...snapshot.eatenToday, { t: snapshot.readAt, total: snapshot.eatenToday.at(-1)!.total }];
  const burned = snapshot.burnedToday;
  const max = niceMax(Math.max(eaten.at(-1)!.total, burned.at(-1)!.total));
  const plotW = W - LEFT - 34, plotH = H - BOTTOM - TOP;
  const x = (t: number) => LEFT + ((t - from) / span) * plotW, y = (v: number) => TOP + plotH - (v / max) * plotH;
  // Eaten steps up at each meal, so it is drawn as a stair line.
  const stairs = eaten.flatMap((p, i) => (i === 0 ? [p] : [{ t: p.t, total: eaten[i - 1]!.total }, p]));
  const end = (points: { t: number; total: number }[]) => points.at(-1)!;
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Today so far: eaten ${count(end(eaten).total)} kcal, burned ${count(end(burned).total)} kcal.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="measured-grid" x1={LEFT} x2={LEFT + plotW} y1={y(g)} y2={y(g)} /><text className="measured-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick("calories", g)}</text></g>)}
    {burned.length > 1 && <polyline className="measured-line" style={{ stroke: BURNED_COLOR }} points={burned.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />}
    <polyline className="measured-line" style={{ stroke: EATEN_COLOR }} points={stairs.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
    {burned.length > 1 && <><circle className="measured-dot" style={{ fill: BURNED_COLOR }} cx={x(end(burned).t)} cy={y(end(burned).total)} r={4} /><text className="measured-axis" x={x(end(burned).t) + 7} y={y(end(burned).total) + 3}>burned</text></>}
    <circle className="measured-dot" style={{ fill: EATEN_COLOR }} cx={x(end(eaten).t)} cy={y(end(eaten).total)} r={4} /><text className="measured-axis" x={x(end(eaten).t) + 7} y={y(end(eaten).total) + 3}>eaten</text>
    {[0, 6, 12, 18].map((h) => <text key={h} className="measured-axis" x={x(from + h * 3600_000)} y={H - 4} textAnchor={h ? "middle" : "start"}>{localTime(from + h * 3600_000)}</text>)}
  </svg>;
}

/** Eaten and burned side by side per day (or per week, as daily averages). */
function PairBars({ eaten, burned, selected, onSelect, usual, weeks }: {
  eaten: readonly PeriodValue[]; burned: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; usual: number | null; weeks: boolean;
}) {
  const max = niceMax(Math.max(...eaten.map((v) => v.value ?? 0), ...burned.map((v) => v.value ?? 0), usual ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / burned.length;
  const barW = Math.max(1, Math.min(12, (slot - 2) / 2 - 1));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const bar = (x: number, v: number | null, color: string, faded: boolean) => {
    if (v === null || v <= 0) return null;
    const top = y(v), r = Math.min(4, barW / 2);
    return <path d={`M${x},${TOP + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${TOP + plotH} Z`} fill={color} opacity={faded ? 0.55 : 1} />;
  };
  return <svg className="measured-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Eaten and burned for ${burned.length} ${weeks ? "weeks" : "days"}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="measured-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="measured-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick("calories", g)}</text></g>)}
    {usual !== null && <line className="measured-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {burned.map((b, i) => {
      const x0 = LEFT + i * slot + (slot - (barW * 2 + 2)) / 2;
      return <g key={b.from} className="measured-bar" onClick={() => onSelect(i)}>
        <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH} fill="transparent" />
        {bar(x0, eaten[i]?.value ?? null, EATEN_COLOR, i !== selected)}
        {bar(x0 + barW + 2, b.value, BURNED_COLOR, i !== selected)}
      </g>;
    })}
    <text className="measured-axis" x={LEFT} y={H - 4}>{weeks ? weekLabel(burned[0]!.from) : dayLabel(burned[0]!.from)}</text>
    <text className="measured-axis" x={W} y={H - 4} textAnchor="end">{burned.at(-1)!.partial ? "today" : dayLabel(burned.at(-1)!.from)}</text>
  </svg>;
}

function CaloriesBody({ snapshot, range, selected, onSelect }: { snapshot: MeasuredSnapshot; range: Range; selected: number | null; onSelect: (i: number) => void }) {
  const legend = <p className="measured-legend"><span><i style={{ background: EATEN_COLOR }} aria-hidden="true" />Eaten (logged)</span><span><i style={{ background: BURNED_COLOR }} aria-hidden="true" />Burned (Garmin)</span></p>;
  if (range === "today") {
    const eaten = snapshot.eaten.at(-1)?.value ?? null, burned = snapshot.burned.at(-1)?.value ?? null;
    return <>
      <p className="measured-hero measured-pair"><span><b>{eaten === null ? "—" : count(eaten)}</b> eaten</span><span><b>{burned === null ? "—" : count(burned)}</b> burned</span></p>
      <p className="meta">kcal so far today{eaten === null ? " · no meals logged yet" : ""}{burned === null ? " · no Garmin calories yet today" : ""}</p>
      {legend}
      <CaloriesTodayLine snapshot={snapshot} />
    </>;
  }
  const weeks = range === "1y";
  const pick = (series: readonly PeriodValue[]) => (range === "7d" ? series.slice(-7) : range === "4w" ? series.slice(-28) : weekly(series, "mean"));
  const eaten = pick(snapshot.eaten), burned = pick(snapshot.burned);
  const index = selected ?? burned.length - 1;
  const when = (v: PeriodValue) => (weeks ? `${weekLabel(v.from)} (a day)` : dayLabel(v.from));
  const line = (i: number) => `${when(burned[i]!)} · eaten ${eaten[i]?.value == null ? "not logged" : count(eaten[i]!.value!)} · burned ${burned[i]!.value === null ? "not measured" : count(burned[i]!.value!)}${burned[i]!.partial ? " so far" : ""}`;
  const finished = (series: readonly PeriodValue[]) => series.filter((v) => !v.partial);
  const avgEaten = average(finished(eaten)), avgBurned = average(finished(burned));
  const logged = finished(eaten).filter((v) => v.value !== null).length, measured = finished(burned).filter((v) => v.value !== null).length;
  return <>
    <p className="measured-hero measured-pair"><span><b>{avgEaten === null ? "—" : count(avgEaten)}</b> eaten</span><span><b>{avgBurned === null ? "—" : count(avgBurned)}</b> burned</span></p>
    <p className="meta">kcal a day on average · {logged} logged {weeks ? "weeks" : "days"}, {measured} measured · today left out</p>
    {legend}
    <PairBars eaten={eaten} burned={burned} selected={index} onSelect={onSelect} usual={weeks ? null : snapshot.usual.burned.value} weeks={weeks} />
    <p className="meta measured-readout" aria-live="polite">{line(index)}</p>
    <details className="measured-table"><summary>Show as table</summary>
      <table><thead><tr><th scope="col">{weeks ? "Week (a day)" : "Day"}</th><td>Eaten</td><td>Burned</td></tr></thead>
        <tbody>{burned.map((b, i) => ({ b, e: eaten[i]! })).reverse().map(({ b, e }) => <tr key={b.from}><th scope="row">{weeks ? weekLabel(b.from) : dayLabel(b.from)}</th><td>{e.value === null ? "Not logged" : count(e.value)}</td><td>{b.value === null ? "Not measured" : count(b.value)}{b.partial ? " so far" : ""}</td></tr>)}</tbody></table>
    </details>
  </>;
}

export { clock as measuredClock };
