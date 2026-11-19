import { useEffect, useState } from "react";
import { getMetricDetail, type MetricDetail } from "../../application/metricDetailQueries";
import { DIGITS, direction90, weekCompare, rangesFor, rangeValues, summarise, WEEK_MODE, type DetailMetric, type DetailRange, type Direction } from "../../application/metricDetail";
import { formatShortDate } from "../../application/bodyTrendQueries";
import type { PeriodValue } from "../../domain/health/measuredSeries";
import { LogSheet } from "../components/LogSheet";
import { SourceTag } from "../foundation/primitives";
import { FoodSources } from "./FoodSources";
import { describeGarminAsOf, SyncGarminLink, UnusualNote } from "../screens/today/MeasuredSheet";
import { askAlfred } from "../components/AlfredSheet";
import { garminFreshness } from "../../application/bodyDashboard";
import { WeightTrend } from "../screens/body/WeightTrend";
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
 * - METRIC-PAGE-002 slice 1: weight, your weigh-ins. LATEST carries BODY's weight trend whole (the 60-day line,
 *   best-since, milestone, projected goal date); 30D and 1Y draw dots on an axis fitted to your weights, because bars
 *   from zero would hide every change worth seeing. Records (corrections) and logging stay on weight's own routes.
 * - METRIC-PAGE-002 slice 2: protein, your logs (white). TODAY is the running total stepping up at each meal or quick
 *   log; days are bars like water's; BEYOND's protein target, where it can be worked out, is a dashed line labelled
 *   "target" and a plain figure, never a deficit or a "remaining". Where it came from reuses FoodSources.
 * Read only. Your logs are white; Garmin's measurements are Garmin blue (GARMIN-004). Nothing here changes advice.
 */
const TITLE: Record<DetailMetric, string> = { water: "HYDRATION", steps: "STEPS", resting: "RESTING HEART RATE", calories: "CALORIES", weight: "WEIGHT", protein: "PROTEIN" };
const NOUN: Record<DetailMetric, { none: string; unit: string }> = {
  water: { none: "not logged", unit: "oz" }, steps: { none: "not measured", unit: "steps" }, resting: { none: "not measured", unit: "bpm" },
  calories: { none: "not measured", unit: "kcal" }, weight: { none: "not weighed", unit: "lb" }, protein: { none: "not logged", unit: "g" },
};
/** How 1Y's headline reads: a week's total, or the average of the days that have a record. */
const YEAR_HERO: Record<DetailMetric, string> = {
  water: "oz a logged day, on average", steps: "steps a week, on average", resting: "bpm a measured day, on average", calories: "kcal a day, on average",
  weight: "lb a weighed day, on average", protein: "g a logged day, on average",
};
/** 7D and 30D's headline: an average per day, or (weight) the average of the days you weighed in. */
const RANGE_HERO = (metric: DetailMetric) => (metric === "weight" ? "lb a weighed day, on average" : `${NOUN[metric].unit} a day, on average`);
/** What a week's mean is the mean of, in 1Y's readout. */
const MEAN_DAY: Partial<Record<DetailMetric, string>> = { weight: " a weighed day" };
/** The metrics you log yourself keep their own LOG and RECORDS routes (where corrections live). */
const OWN_ROUTES: Partial<Record<DetailMetric, { log: string; records: string; source: string }>> = {
  water: { log: "LOG WATER", records: "WATER RECORDS", source: "Your logs. Garmin hydration isn't imported." },
  weight: { log: "LOG WEIGHT", records: "WEIGHT RECORDS", source: "Your weigh-ins. Garmin weight isn't imported." },
  protein: { log: "LOG PROTEIN", records: "PROTEIN RECORDS", source: "Your logs: meal protein and quick protein logs." },
};
const fmt = (n: number, digits = 0) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const num = (metric: DetailMetric, n: number) => fmt(n, DIGITS[metric]);
const withUnit = (metric: DetailMetric, n: number) => `${num(metric, n)} ${NOUN[metric].unit}`;
const clock = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const day = (t: number) => new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const week = (t: number) => `Week of ${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

/** DIRECTION-90-001: what counts as "about the same", in each metric's own unit. */
const SAME_FLOOR: Record<DetailMetric, number> = { water: 1, steps: 100, resting: 1, calories: 25, weight: 1, protein: 5 };
/** Weight's "about the same" is its floor alone: 5% of a body weight would hide a change of several pounds. */
const SAME_SHARE: Partial<Record<DetailMetric, number>> = { weight: 0 };
const PER_DAY: Record<DetailMetric, string> = { water: "oz a day", steps: "steps a day", resting: "bpm", calories: "kcal a day", weight: "lb", protein: "g a day" };
const way = (d: Direction) => (d.way === "SAME" ? "about the same as" : d.way === "HIGHER" ? "higher than" : "lower than");
/** One plain sentence: the last 90 days against the last year. Quiet (null) until there's enough. Never a judgement. */
function directionLine(d: MetricDetail): string | null {
  if (d.metric === "calories") {
    const e = direction90(d.eaten!.series, SAME_FLOOR.calories), b = direction90(d.series, SAME_FLOOR.calories);
    const part = (what: string, x: Direction) => `${what} ${fmt(x.recent)} kcal a day, ${way(x)} your year's ${fmt(x.year)}`;
    const parts = [e && part("eaten", e), b && part("burned", b)].filter(Boolean);
    return parts.length ? `Last 90 days: ${parts.join("; ")}. Medians of recorded days.` : null;
  }
  const x = direction90(d.series, SAME_FLOOR[d.metric], SAME_SHARE[d.metric]);
  return x ? `Last 90 days: ${num(d.metric, x.recent)} ${PER_DAY[d.metric]}, ${way(x)} your year's ${num(d.metric, x.year)}. Medians of ${d.source === "GARMIN" ? "measured" : d.metric === "weight" ? "weighed" : "logged"} days.` : null;
}

/**
 * METRIC-CHANGE-001: this lived week against last week, one plain sentence, quiet until both weeks have two recorded
 * days. Calories keeps its pair of series and its own 90-day line, so it shows none.
 */
function weekLine(d: MetricDetail): string | null {
  if (d.metric === "calories") return null;
  const x = weekCompare(d.series, SAME_FLOOR[d.metric], SAME_SHARE[d.metric], DIGITS[d.metric]);
  if (!x) return null;
  const unit = d.metric === "weight" ? "lb on average" : PER_DAY[d.metric];
  const lastUnit = d.metric === "weight" ? "lb" : NOUN[d.metric].unit;
  const kind = d.source === "GARMIN" ? "measured" : d.metric === "weight" ? "weighed" : "logged";
  const change = x.way === "SAME" ? "about the same as" : x.way === "HIGHER" ? "up from" : "down from";
  return `This week: ${num(d.metric, x.thisWeek)} ${unit}, ${change} ${num(d.metric, x.lastWeek)} ${lastUnit} last week · ${x.thisDays} and ${x.lastDays} ${kind} days.`;
}

/** Calories' usual, one for each series: the median of the last 28 finished days, once there are enough. */
function caloriesUsual(d: MetricDetail): string {
  const part = (name: string, u: { value: number | null; samples: number; need: number }, verb: string) =>
    u.value !== null ? `${name} ${fmt(u.value)} kcal` : `${name.toLowerCase()} appears after ${u.need} ${verb} days (${u.samples} so far)`;
  const e = d.eaten!.usual, b = d.usual;
  const text = `${part("Usual eaten", e, "logged")} · ${part("usual burned", b, "measured")}`;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}${e.value !== null || b.value !== null ? " · median of the last 28 finished days" : ""}.`;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max)), steps = [1, 2, 2.5, 5, 10];
  return steps.map((s) => s * magnitude).find((s) => s >= max)!;
}
const tick = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : `${v}`);
const W = 320, H = 150, LEFT = 32, BOTTOM = 18, TOP = 8;

/** One bar per period. A missing period draws a short dashed stub at the baseline, so a gap reads as a gap. */
function Bars({ metric, values, selected, onSelect, usual, label, target }: {
  metric: DetailMetric; values: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; usual: number | null; label: (v: PeriodValue) => string;
  /** Protein only: BEYOND's existing target, drawn as a labelled dashed line. Never a deficit or a "remaining". */
  target?: number | undefined;
}) {
  const max = niceMax(Math.max(...values.map((v) => v.value ?? 0), usual ?? 0, target ?? 0));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / values.length, barW = Math.max(2, Math.min(22, slot - 2));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const recorded = values.filter((v) => v.value !== null).length;
  return <svg className={`md-chart md-chart--${metric}`} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${values.length} bars, ${recorded} with a record, ${values.length - recorded} ${NOUN[metric].none}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {usual !== null && <line className="md-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {target !== undefined && <><line className="md-target" x1={LEFT} x2={W} y1={y(target)} y2={y(target)} /><text className="md-axis" x={W} y={y(target) - 4} textAnchor="end">target</text></>}
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

/**
 * Weight over a range: one dot per weighed period on an axis fitted to your weights (never from zero, which would
 * flatten every change). A period without a weigh-in has no dot and a short dashed stub, so a gap reads as a gap;
 * nothing is carried forward between weigh-ins.
 */
function Dots({ values, selected, onSelect, usual, label }: {
  values: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; usual: number | null; label: (v: PeriodValue) => string;
}) {
  const present = values.flatMap((v) => (v.value === null ? [] : [v.value]));
  const lo = Math.floor(Math.min(...present, ...(usual !== null ? [usual] : [])) - 1), hi = Math.ceil(Math.max(...present, ...(usual !== null ? [usual] : [])) + 1);
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / values.length;
  const y = (v: number) => TOP + plotH - ((v - lo) / (hi - lo)) * plotH;
  return <svg className="md-chart md-chart--weight" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${values.length} ${values.length > 40 ? "weeks" : "days"}, ${present.length} weighed, ${values.length - present.length} not weighed.`}>
    {[lo, (lo + hi) / 2, hi].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{+g.toFixed(1)}</text></g>)}
    {usual !== null && <line className="md-usual" x1={LEFT} x2={W} y1={y(usual)} y2={y(usual)} />}
    {values.map((v, i) => {
      const cx = LEFT + (i + 0.5) * slot, half = Math.max(1, Math.min(6, slot / 2 - 1));
      return <g key={v.from} className="md-bar" data-missing={v.value === null ? "" : undefined} role="button" tabIndex={0} aria-label={label(v)} aria-pressed={i === selected}
        onClick={() => onSelect(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } }}>
        <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH} fill="transparent" />
        {v.value === null ? <line className="md-missing" x1={cx - half} x2={cx + half} y1={TOP + plotH - 1.5} y2={TOP + plotH - 1.5} />
          : <circle className={`md-dot md-dot--logged${i === selected ? " md-dot--on" : ""}`} cx={cx} cy={y(v.value)} r={i === selected ? 5 : 3.5} opacity={v.partial ? 0.6 : 1} />}
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

/** Protein today: your running total through the lived day (white), stepping up at each meal or quick log, with the
 *  target as a labelled dashed line where one is set. */
function LoggedRunning({ metric, today, readAt, target }: { metric: DetailMetric; today: Extract<MetricDetail["today"], { kind: "logged" }>; readAt: number; target: number | undefined }) {
  const points = [...today.points, { t: Math.max(readAt, today.points.at(-1)!.t), total: today.points.at(-1)!.total }];
  const stairs = points.flatMap((p, i) => (i === 0 ? [p] : [{ t: p.t, total: points[i - 1]!.total }, p]));
  const end = points.at(-1)!, span = 24 * 3_600_000;
  const max = niceMax(Math.max(end.total, target ?? 0)), plotW = W - LEFT, plotH = H - BOTTOM - TOP;
  const x = (t: number) => LEFT + ((t - today.from) / span) * plotW, y = (v: number) => TOP + plotH - (v / max) * plotH;
  return <svg className={`md-chart md-chart--${metric}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Running ${TITLE[metric].toLowerCase()} total: ${withUnit(metric, end.total)} so far${target !== undefined ? `, target ${withUnit(metric, target)}` : ""}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {target !== undefined && <><line className="md-target" x1={LEFT} x2={W} y1={y(target)} y2={y(target)} /><text className="md-axis" x={W} y={y(target) - 4} textAnchor="end">target</text></>}
    <polyline className="md-line md-line--logged" points={stairs.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
    <circle className="md-dot md-dot--logged" cx={x(end.t)} cy={y(end.total)} r={4} />
    {[0, 6, 12, 18].map((h) => <text key={h} className="md-axis" x={x(today.from + h * 3_600_000)} y={H - 4} textAnchor={h ? "middle" : "start"}>{clock(today.from + h * 3_600_000)}</text>)}
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

type Running = { t: number; total: number }[];
/** Calories today: two running totals through the lived day. Eaten (your logs, white) steps up at each meal; burned
 *  (Garmin, blue) climbs hour by hour. Drawn side by side, never subtracted. */
function CaloriesRunning({ today, readAt }: { today: Extract<MetricDetail["today"], { kind: "pair" }>; readAt: number }) {
  const eaten: Running = [...today.eaten, { t: Math.max(readAt, today.eaten.at(-1)!.t), total: today.eaten.at(-1)!.total }];
  const burned = today.burned, span = 24 * 3_600_000;
  const max = niceMax(Math.max(eaten.at(-1)!.total, burned.at(-1)?.total ?? 0));
  const plotW = W - LEFT - 40, plotH = H - BOTTOM - TOP;
  const x = (t: number) => LEFT + ((t - today.from) / span) * plotW, y = (v: number) => TOP + plotH - (v / max) * plotH;
  const stairs = eaten.flatMap((p, i) => (i === 0 ? [p] : [{ t: p.t, total: eaten[i - 1]!.total }, p]));
  const endE = eaten.at(-1)!, endB = burned.at(-1);
  return <svg className="md-chart md-chart--calories" viewBox={`0 0 ${W} ${H}`} role="img"
    aria-label={`Today so far: eaten ${fmt(endE.total)} kcal${burned.length > 1 ? `, burned ${fmt(endB!.total)} kcal` : ", burned not measured yet"}.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={LEFT + plotW} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {burned.length > 1 && <><polyline className="md-line" points={burned.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
      <circle className="md-dot" cx={x(endB!.t)} cy={y(endB!.total)} r={4} /><text className="md-axis" x={x(endB!.t) + 7} y={y(endB!.total) + 3}>burned</text></>}
    <polyline className="md-line md-line--logged" points={stairs.map((p) => `${x(p.t)},${y(p.total)}`).join(" ")} />
    <circle className="md-dot md-dot--logged" cx={x(endE.t)} cy={y(endE.total)} r={4} /><text className="md-axis" x={x(endE.t) + 7} y={y(endE.total) + 3}>eaten</text>
    {[0, 6, 12, 18].map((h) => <text key={h} className="md-axis" x={x(today.from + h * 3_600_000)} y={H - 4} textAnchor={h ? "middle" : "start"}>{clock(today.from + h * 3_600_000)}</text>)}
  </svg>;
}

/** Eaten and burned side by side per period. Each missing side draws its own dashed stub, so a gap reads as a gap. */
function PairBars({ eaten, burned, selected, onSelect, label }: {
  eaten: readonly PeriodValue[]; burned: readonly PeriodValue[]; selected: number; onSelect: (i: number) => void; label: (i: number) => string;
}) {
  const max = niceMax(Math.max(...eaten.map((v) => v.value ?? 0), ...burned.map((v) => v.value ?? 0)));
  const plotW = W - LEFT, plotH = H - BOTTOM - TOP, slot = plotW / burned.length, barW = Math.max(1, Math.min(11, (slot - 2) / 2 - 0.5));
  const y = (v: number) => TOP + plotH - (v / max) * plotH;
  const bar = (x: number, v: PeriodValue | undefined, cls: string, on: boolean) => !v || v.value === null
    ? <line className="md-missing" x1={x} x2={x + barW} y1={TOP + plotH - 1.5} y2={TOP + plotH - 1.5} />
    : v.value > 0 && <rect className={`md-fill ${cls}${on ? " md-fill--on" : ""}`} x={x} y={y(v.value)} width={barW} height={TOP + plotH - y(v.value)} opacity={v.partial ? 0.6 : 1} />;
  const both = burned.filter((b, i) => b.value !== null || eaten[i]?.value != null).length;
  return <svg className="md-chart md-chart--calories" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${burned.length} pairs of bars, eaten and burned; ${both} with a record.`}>
    {[0, max / 2, max].map((g) => <g key={g}><line className="md-grid" x1={LEFT} x2={W} y1={y(g)} y2={y(g)} /><text className="md-axis" x={LEFT - 4} y={y(g) + 3} textAnchor="end">{tick(g)}</text></g>)}
    {burned.map((b, i) => {
      const x0 = LEFT + i * slot + (slot - (barW * 2 + 1)) / 2;
      return <g key={b.from} className="md-bar" data-missing={b.value === null && eaten[i]?.value == null ? "" : undefined} role="button" tabIndex={0} aria-label={label(i)} aria-pressed={i === selected}
        onClick={() => onSelect(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(i); } }}>
        <rect x={LEFT + i * slot} y={TOP} width={slot} height={plotH} fill="transparent" />
        {bar(x0, eaten[i], "md-fill--logged", i === selected)}
        {bar(x0 + barW + 1, b, "md-fill--garmin", i === selected)}
      </g>;
    })}
    <text className="md-axis" x={LEFT} y={H - 4}>{burned.length > 40 ? week(burned[0]!.from) : day(burned[0]!.from)}</text>
    <text className="md-axis" x={W} y={H - 4} textAnchor="end">{burned.at(-1)!.partial ? "now" : day(burned.at(-1)!.from)}</text>
  </svg>;
}

const Legend = () => <p className="md-legend"><span><i className="md-key md-key--logged" aria-hidden="true" />Eaten (logged)</span><span><i className="md-key md-key--garmin" aria-hidden="true" />Burned (Garmin)</span></p>;
const kcal = (v: number | null | undefined, none: string) => (v == null ? none : `${fmt(v)} kcal`);

/** GARMIN-005 on the shared page: eaten and burned side by side, each with its own coverage, usual and split. */
function CaloriesBody({ d, range, selected, onSelect }: { d: MetricDetail; range: DetailRange; selected: number | null; onSelect: (i: number) => void }) {
  const eatenSeries = d.eaten!.series;
  if (range === "today" && d.today.kind === "pair") {
    const eaten = eatenSeries.at(-1)?.value ?? null, burned = d.series.at(-1)?.value ?? null;
    return <>
      <p className="md-hero md-hero--pair" data-md-hero><span><b>{eaten === null ? "—" : fmt(eaten)}</b> eaten</span><span><b>{burned === null ? "—" : fmt(burned)}</b> burned</span></p>
      <p className="md-meta">kcal so far · since {clock(d.today.from)}{eaten === null ? " · no meals logged yet" : ""}{burned === null ? " · no Garmin calories yet this lived day" : ""}</p>
      <Legend />
      <CaloriesRunning today={d.today} readAt={d.readAt} />
    </>;
  }
  if (range === "today") return null;
  const byWeek = range === "1y";
  const eaten = rangeValues(eatenSeries, range, "mean"), burned = rangeValues(d.series, range, "mean");
  const index = selected ?? burned.length - 1;
  // The year's averages weigh each recorded day equally, as water's and resting heart rate's do.
  const pool = (s: readonly PeriodValue[], v: readonly PeriodValue[]) => (byWeek ? s.slice(-52 * 7) : v).filter((p) => !p.partial);
  const sE = summarise(pool(eatenSeries, eaten)), sB = summarise(pool(d.series, burned));
  const when = (v: PeriodValue) => (byWeek ? `${week(v.from)} (a day)` : day(v.from));
  const label = (i: number) => `${when(burned[i]!)} · eaten ${kcal(eaten[i]?.value, "not logged")} · burned ${kcal(burned[i]!.value, "not measured")}${burned[i]!.partial ? " so far" : ""}`;
  return <>
    <p className="md-hero md-hero--pair" data-md-hero><span><b>{sE.average === null ? "—" : fmt(sE.average)}</b> eaten</span><span><b>{sB.average === null ? "—" : fmt(sB.average)}</b> burned</span></p>
    <p className="md-meta" data-md-coverage>kcal a day, on average · of {sB.total} finished {byWeek ? "days in the last year" : "days"}, {sE.recorded} logged and {sB.recorded} measured{sE.recorded < sB.total || sB.recorded < sB.total ? "; days without a record left out" : ""} · this lived day not counted</p>
    <Legend />
    <PairBars eaten={eaten} burned={burned} selected={index} onSelect={onSelect} label={label} />
    <p className="md-readout" aria-live="polite">{label(index)}</p>
    <details className="md-table"><summary>Show as table</summary>
      <table><thead><tr><th scope="col">{byWeek ? "Week (a day)" : "Day"}</th><th scope="col">Eaten</th><th scope="col">Burned</th></tr></thead>
        <tbody>{burned.map((b, i) => ({ b, e: eaten[i] })).reverse().map(({ b, e }) => <tr key={b.from}><th scope="row">{byWeek ? week(b.from) : day(b.from)}</th>
          <td>{e?.value == null ? "Not logged" : fmt(e.value)}</td><td>{b.value === null ? "Not measured" : fmt(b.value)}{b.partial ? " so far" : ""}</td></tr>)}</tbody></table>
    </details>
  </>;
}

export function MetricDetailSheet({ open, metric, onClose, onRecords, onLog, refreshKey = 0 }: {
  open: boolean; metric: DetailMetric; onClose: () => void;
  /** The metric's existing records view, where corrections live (water: health records or water history; weight: its weigh-ins). */
  onRecords?: (() => void) | undefined;
  /** The metric's existing logging route (water: LOG's water sheet; weight: LOG's weight sheet). */
  onLog?: (() => void) | undefined;
  refreshKey?: number;
}) {
  const [detail, setDetail] = useState<MetricDetail | null | "ERROR">(null);
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<DetailRange>("today");
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { if (open) { setRange("today"); setSelected(null); } }, [open, metric]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setDetail(null);
    void getMetricDetail(metric).then((d) => { if (live) setDetail(d); }, () => { if (live) setDetail("ERROR"); });
    return () => { live = false; };
  }, [open, metric, refreshKey, attempt]);

  const d = detail && detail !== "ERROR" && detail.metric === metric ? detail : null;
  const garmin = d?.source === "GARMIN", calories = metric === "calories";
  const fresh = garmin && d ? garminFreshness(d.asOf, d.readAt) : null;
  const weight = metric === "weight";
  const logged = weight ? "weighed" : "logged";
  const values = d && range !== "today" ? rangeValues(d.series, range, WEEK_MODE[metric], DIGITS[metric]) : [];
  const index = selected ?? values.length - 1;
  const byWeek = range === "1y";
  const label = (v: PeriodValue) => `${byWeek ? week(v.from) : day(v.from)} · ${v.value === null ? NOUN[metric].none : `${withUnit(metric, v.value)}${byWeek ? (WEEK_MODE[metric] === "sum" ? " that week" : garmin ? " a measured day" : MEAN_DAY[metric] ?? " a logged day") : ""}`}${v.partial ? " so far" : ""}`;
  // A yearly average (water, resting heart rate) weighs each recorded day equally, even when weeks have different
  // coverage; steps' year stays a weekly total.
  const dailyYear = byWeek && WEEK_MODE[metric] === "mean";
  const summaryValues = dailyYear ? d?.series.slice(-52 * 7) ?? [] : values;
  const sum = summarise(summaryValues.filter((v) => !v.partial), DIGITS[metric]);
  const todayValue = d?.series.at(-1)?.value ?? null;
  // Close first, then follow the route once focus is back on the tile that opened the page, so that route's BACK
  // returns there (the shell remembers the focused element as the origin).
  const go = (fn?: () => void) => (fn ? () => { onClose(); requestAnimationFrame(() => requestAnimationFrame(fn)); } : undefined);

  // A retained closed sheet carries no stale metric title into another workspace. Keep its node mounted
  // so LogSheet can close normally and restore the original trigger and scroll position.
  return <LogSheet open={open} title={open ? TITLE[metric] : ""} onClose={onClose}>
    {!open ? null : detail === "ERROR" ? <div className="bf md"><p role="alert" className="md-meta">Couldn't read {TITLE[metric].toLowerCase()}. Your records are unchanged.</p><button type="button" className="md-act" onClick={() => setAttempt((n) => n + 1)}>RETRY</button></div>
      : !d ? <p role="status" className="md-meta">Reading…</p>
      : <div className="bf md" data-metric={metric}>
      {calories ? <div className="md-source">
        <SourceTag>LOGGED</SourceTag><SourceTag garmin>{fresh?.stale ? "GARMIN · OLD" : "GARMIN"}</SourceTag>
        <span className="md-meta">Eaten is what you logged. Burned is Garmin's estimate, resting plus active; watch estimates can be off by 10–20%. {d.asOf !== null ? describeGarminAsOf(d.asOf, d.readAt) : "No Garmin calories yet."}</span>
      </div> : <div className="md-source">
        <SourceTag garmin={garmin}>{garmin ? (fresh?.stale ? "GARMIN · OLD" : "GARMIN") : "LOGGED"}</SourceTag>
        <span className="md-meta">{garmin ? (d.asOf !== null ? describeGarminAsOf(d.asOf, d.readAt) : "No Garmin data yet.") : OWN_ROUTES[metric]?.source}</span>
      </div>}

      <div role="group" aria-label={`${TITLE[metric]} range`} className="md-ranges">
        {rangesFor(metric).map(([id, text, name]) => <button key={id} type="button" aria-pressed={range === id} aria-label={name} onClick={() => { setRange(id); setSelected(null); }}>{text}</button>)}
      </div>

      {garmin && !calories && <UnusualNote metric={metric === "resting" ? "resting" : "steps"} reading={d.unusual} />}

      {calories ? <CaloriesBody d={d} range={range} selected={selected} onSelect={setSelected} /> : range === "today" && d.today.kind === "latest" ? <>
        {/* Resting heart rate is one reading a day: the newest one, with the lived day it belongs to. */}
        <p className="md-hero" data-md-hero><b>{d.today.value === null ? "—" : fmt(d.today.value)}</b> <span>{d.today.value === null ? "not measured in the last two lived days" : `bpm · ${d.today.from !== null && d.today.from === d.series.at(-1)?.from ? "this lived day" : `lived day of ${day(d.today.from!)}`}`}</span></p>
        <p className="md-meta">Garmin publishes resting heart rate once a day, so the newest reading can be yesterday's.</p>
      </> : range === "today" && d.today.kind === "weighin" ? <>
        {/* Weight is a weigh-in now and then: the newest one, then BODY's weight trend whole, from its own functions. */}
        <p className="md-hero" data-md-hero><b>{d.today.latest === null ? "—" : fmt(d.today.latest.weightLbs, 1)}</b> <span>{d.today.latest === null ? "no weigh-ins recorded yet" : `lb · ${(d.series.at(-1)?.value ?? null) !== null ? "this lived day" : formatShortDate(d.today.latest.recordedAt)}`}</span></p>
        {d.today.history.length < 2
          ? <p className="md-meta">{d.today.history.length ? "One weigh-in recorded. A trend needs more than one." : "Log a weigh-in and it shows here."}</p>
          : <WeightTrend history={d.today.history} goalWeightLbs={d.today.goalWeightLbs} />}
      </> : range === "today" ? <>
        <p className="md-hero" data-md-hero><b>{todayValue === null ? "—" : fmt(todayValue)}</b> <span>{todayValue === null ? `${NOUN[metric].none} yet this lived day` : `${NOUN[metric].unit} so far · since ${clock(d.series.at(-1)!.from)}`}</span></p>
        {d.today.kind === "hours"
          ? (d.today.entries ? <WaterHours today={d.today} /> : <p className="md-meta">No water logged yet this lived day.</p>)
          : d.today.kind === "logged" ? <>
            {d.target !== undefined && <p className="md-meta" data-md-target>Target {withUnit(metric, d.target)} a day, from your protein setting and latest weigh-in.</p>}
            {d.today.points.length > 1 ? <LoggedRunning metric={metric} today={d.today} readAt={d.readAt} target={d.target} /> : <p className="md-meta">No protein logged yet this lived day.</p>}
          </>
          : d.today.kind === "running" && (d.today.points.length > 1 ? <StepsRunning today={d.today} usual={d.usual.value} /> : <p className="md-meta">No steps measured yet this lived day. Send from the helper to update.</p>)}
      </> : <>
        <p className="md-hero" data-md-hero><b>{sum.average === null ? "—" : num(metric, sum.average)}</b> <span>{byWeek ? YEAR_HERO[metric] : RANGE_HERO(metric)}</span></p>
        <p className="md-meta" data-md-coverage>{sum.recorded} of {sum.total} {byWeek && !dailyYear ? "finished weeks" : "finished days"} {garmin ? "measured" : logged}{sum.total - sum.recorded ? ` · ${sum.total - sum.recorded} ${NOUN[metric].none}, left out` : ""} · {byWeek && !dailyYear ? "week in progress" : "this lived day"} not counted</p>
        {weight ? (values.some((v) => v.value !== null)
          ? <Dots values={values} selected={index} onSelect={setSelected} label={label} usual={d.usual.value} />
          : <p className="md-meta">No weigh-ins in this range.</p>)
          : <Bars metric={metric} values={values} selected={index} onSelect={setSelected} label={label} usual={byWeek && WEEK_MODE[metric] === "sum" ? null : d.usual.value} target={d.target} />}
        <p className="md-readout" aria-live="polite">{label(values[index]!)}</p>
        <details className="md-table"><summary>Show as table</summary>
          <table><tbody>{[...values].reverse().map((v) => <tr key={v.from}><th scope="row">{byWeek ? week(v.from) : day(v.from)}</th><td>{v.value === null ? (garmin ? "Not measured" : weight ? "Not weighed" : "Not logged") : withUnit(metric, v.value)}{v.partial ? " so far" : ""}</td></tr>)}</tbody></table>
        </details>
      </>}

      {/* FOOD-SOURCES-001: what made up the eaten side, over the range's days. */}
      {(calories || metric === "protein") && (range === "7d" || range === "30d") && <FoodSources nutrient={calories ? "calories" : "protein"} windowDays={range === "7d" ? 7 : 30} refreshKey={refreshKey} />}

      {calories ? <section className="md-split" aria-label="Work days and days off">
        {(["work", "off"] as const).map((k) => <div key={k} className="md-split__side" data-md-split={k}>
          <p className="md-split__label">{k === "work" ? "WORK DAYS" : "DAYS OFF"}</p>
          {([["eaten", d.eaten!.split[k]], ["burned", d.split[k]]] as const).map(([what, side]) => <p key={what} className="md-split__value md-split__value--pair">
            {side.median === null ? <span className="md-none">{what === "eaten" ? "Eaten" : "Burned"}: not enough yet</span> : <>{fmt(side.median)}<small> {what}</small></>}</p>)}
          <p className="md-meta">{d.eaten!.split[k].days} logged · {d.split[k].days} measured · last 8 weeks</p>
        </div>)}
      </section> : <section className="md-split" aria-label="Work days and days off">
        {(["work", "off"] as const).map((k) => <div key={k} className="md-split__side" data-md-split={k}>
          <p className="md-split__label">{k === "work" ? "WORK DAYS" : "DAYS OFF"}</p>
          <p className="md-split__value">{d.split[k].median === null ? <span className="md-none">Not enough yet</span> : <>{num(metric, d.split[k].median!)}<small> {NOUN[metric].unit}</small></>}</p>
          <p className="md-meta">{d.split[k].days} recorded {d.split[k].days === 1 ? "day" : "days"} · last 8 weeks</p>
        </div>)}
      </section>}

      <p className="md-meta" data-md-usual>{calories ? caloriesUsual(d) : d.usual.value !== null
        ? `Usual${metric === "steps" && d.usual.dayKind ? (d.usual.dayKind === "OFF" ? " on days off" : " on work days") : ""}: ${withUnit(metric, d.usual.value)} · median of the last 28 finished days.`
        : metric === "steps" && d.usual.dayKind === null ? "Usual steps need today set as a work day or a day off."
        : `Your usual appears after ${d.usual.need} ${garmin ? "measured" : logged} days (${d.usual.samples} so far).`}</p>

      {directionLine(d) !== null && <p className="md-meta" data-md-direction>{directionLine(d)}</p>}
      {weekLine(d) !== null && <p className="md-meta" data-md-week>{weekLine(d)}</p>}

      <div className="md-actions">
        {OWN_ROUTES[metric] && onLog && <button type="button" className="md-act" onClick={go(onLog)}>{OWN_ROUTES[metric]!.log}</button>}
        {OWN_ROUTES[metric] && onRecords && <button type="button" className="md-act" onClick={go(onRecords)}>{OWN_ROUTES[metric]!.records}</button>}
        {garmin && <SyncGarminLink />}
        <button type="button" className="md-act" onClick={() => { onClose(); askAlfred(`About my ${TITLE[metric].toLowerCase()} lately: what's the pattern against my shifts, and what would help?`); }}>ASK ALFRED</button>
      </div>
      <p className="md-meta">{calories ? "A day with no meals logged, or no Garmin measurement, is missing, not zero. Eaten and burned stay separate numbers." : garmin ? "Measured by Garmin. A day with no measurement is missing, not zero." : weight ? "A day without a weigh-in is missing, not zero, and the last weigh-in isn't carried forward. Corrections live in the records." : "A day with nothing logged is missing, not zero. Corrections live in the records."} Nothing here changes BEYOND's advice.</p>
    </div>}
  </LogSheet>;
}
