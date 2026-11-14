import { useEffect, useState } from "react";
import type { MeasuredSnapshot } from "../../../application/measuredQueries";
import { BASELINE_MIN_SAMPLES, type Baseline } from "../../../domain/health/baselines";
import { hypnogram, STAGE_ORDER, type PeriodValue, type StageName } from "../../../domain/health/measuredSeries";
import { hoursMinutes, localTime } from "../health/healthFormat";
import { describeUnusual } from "./unusualCopy";
import type { UnusualReading } from "../../../domain/health/unusual";
import "./measuredSheet.css";
import "../../charts/suitData.css";

/**
 * GARMIN-004 (owner approval 2026-10-22): shared pieces for Garmin readings. The sheet itself was retired by
 * METRIC-PAGE-001 (slice 4): steps, resting heart rate and calories open the metric page; sleep has its own page.
 */
export type MeasuredMetric = "steps" | "resting" | "sleep" | "calories";
/** The sleep stage ramp: one hue, light (awake) to dark (deep), validated as an ordinal ramp on the dark surface. */
export const STAGE_COLORS: Record<StageName, string> = { AWAKE: "#cde2fb", REM: "#6da7ec", LIGHT: "#2a78d6", DEEP: "#184f95" };
const STAGE_LABELS: Record<StageName, string> = { AWAKE: "Awake", REM: "REM", LIGHT: "Light", DEEP: "Deep" };
const MARK = "#3987e5", MARK_SELECTED = "#86b6ef";

const count = (n: number) => Math.round(n).toLocaleString("en-US");
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
export function formatMeasured(metric: MeasuredMetric, value: number): string {
  return metric === "steps" ? count(value) : metric === "resting" ? `${value} bpm` : metric === "calories" ? `${count(value)} kcal` : hoursMinutes(value);
}
import { markGarminSyncRequested } from "../../healthSyncRequest";
import { askAlfred } from "../../components/AlfredSheet";
import { buildBridgePlan, helperSyncUrl } from "../../../application/bridgePlan";

/** SYNC-001: opens BEYOND Health Bridge (beyond-bridge://sync), which reads Health Connect and sends to BEYOND. */
export const HELPER_SYNC_URL = "intent://sync#Intent;scheme=beyond-bridge;package=app.beyond.healthbridge;end";
/** The helper exists only on Android; elsewhere the link would go nowhere, so it isn't shown. */
export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}
/** BRIDGE-MOMENTS-001: the link also hands the Bridge this week's key moments and Alfred's brief. */
export async function bridgeSyncUrl(): Promise<string> {
  try {
    let brief = "";
    try { brief = (JSON.parse(localStorage.getItem("beyond.alfredBrief") ?? "null") as { text?: string } | null)?.text ?? ""; } catch { /* none */ }
    return helperSyncUrl(await buildBridgePlan(new URL(import.meta.env.BASE_URL, window.location.origin).toString(), brief));
  } catch { return HELPER_SYNC_URL; }
}
export function SyncGarminLink() {
  const [href, setHref] = useState(HELPER_SYNC_URL);
  useEffect(() => { let live = true; void bridgeSyncUrl().then((url) => { if (live) setHref(url); }); return () => { live = false; }; }, []);
  if (!isAndroid()) return null;
  // SYNC-002: remember the tap, so what the helper sends back imports straight away.
  return <a className="btn-secondary measured-sync" href={href} onClick={() => markGarminSyncRequested()}>SYNC GARMIN</a>;
}

/** "Garmin as of 14:20" today, otherwise with the date. */
export function describeGarminAsOf(at: number, now: number): string {
  const sameDay = new Date(at).toDateString() === new Date(now).toDateString();
  return `Garmin as of ${sameDay ? localTime(at) : `${dayLabel(at)}, ${localTime(at)}`}.`;
}
const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
const weekLabel = (t: number) => `Week of ${new Date(t).toLocaleDateString("en-US", { day: "numeric", month: "short" })}`;

/** "Usual on work days: 4,900" — or how many more measured days a usual needs. */
/** ROTATION-002: the multi-day "unusual for you" reading, shown only when there is one. */
export function UnusualNote({ metric, reading }: { metric: "resting" | "sleep" | "steps"; reading: UnusualReading | null }) {
  if (!reading) return null;
  const copy = describeUnusual(metric, reading);
  return <div className="measured-unusual" data-unusual={metric}><p>{copy.headline}</p><p className="meta">{copy.basis}</p></div>;
}

export function describeUsual(metric: MeasuredMetric, usual: Baseline & { dayKind?: "WORK" | "OFF" | null }): string {
  if (metric === "steps" && usual.dayKind === null) return "Usual steps need today set as a work day or a day off.";
  // DELTA-004: the floor said as what unlocks it.
  if (usual.value === null) return `Wear your Garmin for ${BASELINE_MIN_SAMPLES - usual.samples} more ${BASELINE_MIN_SAMPLES - usual.samples === 1 ? "day" : "days"}. Unlocks: your usual (${usual.samples} of ${BASELINE_MIN_SAMPLES} days).`;
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

export { clock as measuredClock };
