import { useMemo, useState } from "react";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { formatShortDate } from "../../../application/bodyTrendQueries";
import { INSIGHT_DAY_MS, insightPoints, insightWindow, type BodyInsights, type InsightMetric, type InsightPoint } from "../../../application/bodyInsightsQueries";
import { Readout, ReadoutGrid } from "../../components/ReadoutGrid";
import "./insights.css";

const METRICS: Record<InsightMetric, { label: string; unit: string; decimals: number }> = {
  weight: { label: "Weight", unit: "lb", decimals: 1 },
  calories: { label: "Meal calories", unit: "kcal", decimals: 0 },
  protein: { label: "Protein", unit: "g", decimals: 0 },
  water: { label: "Water", unit: "oz", decimals: 0 },
  sleep: { label: "Main sleep", unit: "hr", decimals: 1 },
  workouts: { label: "Finished workouts", unit: "workouts", decimals: 1 },
};
export function insightValue(value: number | undefined, metric: InsightMetric): string {
  if (value === undefined) return "Not recorded";
  return `${value.toFixed(METRICS[metric].decimals)} ${METRICS[metric].unit}`;
}

export interface InsightExploration { metric: InsightMetric; range: number; pointId: string | null; focusDayId: string | null }
export function InsightsExplorer({ data, weights, goalWeightLbs, hideChart = false, exploration, onExploreChange, onSources }: {
  exploration?: InsightExploration;
  onExploreChange?: (next: InsightExploration) => void;
  onSources?: ((point: InsightPoint, metric: InsightMetric) => void) | undefined;
  data: BodyInsights; weights: readonly WeighIn[]; goalWeightLbs?: number | undefined; hideChart?: boolean;
}) {
  const [local, setLocal] = useState<InsightExploration>({ metric: "weight", range: 28, pointId: null, focusDayId: null });
  const state = exploration ?? local;
  const change = (next: InsightExploration) => { setLocal(next); onExploreChange?.(next); };
  const { range, metric } = state;
  const window = useMemo(() => insightWindow(insightPoints(data, weights, metric), data.readAt, range), [data, weights, metric, range]);
  const meals = insightWindow(insightPoints(data, weights, "calories"), data.readAt, range);
  const protein = insightWindow(insightPoints(data, weights, "protein"), data.readAt, range);
  const days = data.days.filter((day) => Date.parse(day.at) > Date.parse(data.readAt) - range * INSIGHT_DAY_MS && Date.parse(day.at) <= Date.parse(data.readAt));
  const ambiguous = days.filter((day) => day.mainSleepEntries > 1).length;
  const paired = days.filter((day) => day.protein !== undefined && day.sleep !== undefined).length;
  const macros = days.filter((day) => day.carbs !== undefined && day.fat !== undefined);
  const macroMean = (field: "carbs" | "fat") => macros.length ? macros.reduce((sum, day) => sum + day[field]!, 0) / macros.length : undefined;
  const last = window.current.at(-1);
  return <section className="body-insights" aria-label="Progress insights">
    <p className="meta">Your recorded health, over time.</p>
    <div role="group" aria-label="Progress time range" className="insights-ranges">
      {[7, 28, 90].map((days) => <button key={days} type="button" className="btn-secondary" aria-pressed={range === days} onClick={() => change({ ...state, range: days, pointId: null })}>{days} DAYS</button>)}
    </div>
    <p className="meta insights-window">{formatShortDate(new Date(Date.parse(data.readAt) - range * INSIGHT_DAY_MS))} – {formatShortDate(data.readAt)} · rolling {range} × 24 hours</p>
    <label className="tool-label insights-label" htmlFor="insight-measure">EXPLORE A MEASURE</label>
    <select id="insight-measure" className="input" value={metric} onChange={(event) => change({ ...state, metric: event.target.value as InsightMetric, pointId: null })}>
      {Object.entries(METRICS).map(([id, spec]) => <option key={id} value={id}>{spec.label}</option>)}
    </select>
    <div className="insights-measure" aria-live="polite">
      <h3 className="tool-label">{METRICS[metric].label}</h3>
      <p className="insights-value">{insightValue(window.average, metric)}</p>
      <p className="meta">{metric === "weight" ? "Average per weigh-in" : "Average per recorded day segment"} · {window.current.length} {metric === "weight" ? "weigh-ins" : "observations"}</p>
      {(metric === "calories" || metric === "protein") && <p className="meta">Recorded intake only; active days may be partial.</p>}
    </div>
    {hideChart ? <p className="meta">The chart is hidden while your accomplishment timeline is open.</p> : <ObservationChart points={window.current} metric={metric} readAt={data.readAt} days={range}
      pointId={state.pointId} focusDayId={state.focusDayId}
      onSelect={(pointId) => change({ ...state, pointId })} onSources={onSources} />}
    <div className="insights-context">
      {hideChart && last && <p className="meta">Latest in range: {insightValue(last.value, metric)} · {formatShortDate(last.at)}</p>}
      {window.change !== undefined ? <p className="meta">{window.change >= 0 ? "+" : "−"}{insightValue(Math.abs(window.change), metric)} average change vs preceding {range} days ({window.previous.length} observations).</p>
        : <p className="meta">Comparison needs records in both this range and the preceding {range} days.</p>}
      {metric === "weight" && goalWeightLbs !== undefined && <p className="meta">Existing goal: {goalWeightLbs} lb. {last ? last.value === goalWeightLbs ? "Latest in range matches it." : `Latest in range is ${Math.abs(last.value - goalWeightLbs).toFixed(1)} lb ${last.value > goalWeightLbs ? "above" : "below"} it.` : "No weigh-in in this range to compare."}</p>}
      {metric === "sleep" && <p className="meta">One main-sleep entry per recorded day segment; naps excluded. {ambiguous} {ambiguous === 1 ? "day" : "days"} with multiple main-sleep entries excluded, not combined into a night.</p>}
      {metric === "workouts" && <p className="meta">{window.current.reduce((sum, point) => sum + point.value, 0)} finished workouts in {window.current.length} recorded day segments. COMPLETED and PARTIAL only; absent days are not assumed rest days.</p>}
    </div>
    <ReadoutGrid className="insights-nutrition">
      <Readout label="MEAL CALORIES" value={insightValue(meals.average, "calories")} detail={`Average across ${meals.current.length} meal-logged day segments`} />
      <Readout label="PROTEIN" value={insightValue(protein.average, "protein")} detail={`Average across ${protein.current.length} protein-logged day segments`} />
    </ReadoutGrid>
    <p className="meta">Logged totals, not measured total intake. A day with no entry is missing, not zero; active days may be partial.</p>
    <details className="insights-inspect"><summary>Nutrition detail & coverage</summary>
      <p className="meta">Meal carbohydrates: {macroMean("carbs") === undefined ? "Not recorded" : `${macroMean("carbs")!.toFixed(0)} g average`}. Meal fat: {macroMean("fat") === undefined ? "Not recorded" : `${macroMean("fat")!.toFixed(0)} g average`}. Across {macros.length} meal-logged day segments, not all days.</p>
      <p className="meta">Fiber is not recorded in the current meal schema. It is not estimated.</p>
      <p className="meta">Comparisons may cover different recorded days in each period; they do not measure unlogged intake or adherence.</p>
      <p className="meta">{paired} recorded day segments have both protein and unambiguous main sleep recorded. Co-recording is an observation, not evidence that one caused the other. Your existing YOUR USUAL comparison remains available below.</p>
    </details>
    <details className="insights-inspect"><summary>Recorded observations & calculation</summary>
      <p className="meta">Read {new Date(data.readAt).toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}. Effective corrected entries; undone/deleted entries excluded. Nutrition, sleep and workouts retain their recorded lived-day ownership, including overnight work. Weight uses each weigh-in's recording time. No goals or recommendations are changed.</p>
      <p className="meta">Early-ended and restarted day records remain separate chart observations; the day browser groups their lived window. Mean = sum ÷ available observations; change = this mean minus the preceding equal-length range's mean. Zero is included only when recorded. Weight lines connect recorded weigh-ins, not measured values between them. Other series stop across gaps longer than 36 hours; missing records are never filled. Sleep excludes days with multiple main entries.</p>
      {!window.current.length ? <p className="meta">No observations in this range.</p> : <ul className="insights-observations">{window.current.map((point) => <li key={point.id}><span>{new Date(point.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span><strong>{insightValue(point.value, metric)}</strong></li>)}</ul>}
      <p className="meta">Open an entry in BODY → History to correct it. The full event trail is in COMMAND → HISTORY.</p>
    </details>
  </section>;
}

function ObservationChart({ points, metric, readAt, days, pointId, focusDayId, onSelect, onSources }: {
  points: readonly InsightPoint[]; metric: InsightMetric; readAt: string; days: number;
  pointId: string | null; focusDayId: string | null; onSelect: (id: string) => void;
  onSources?: ((point: InsightPoint, metric: InsightMetric) => void) | undefined;
}) {
  const found = pointId ? points.findIndex((point) => point.id === pointId) : focusDayId ? points.map((point) => point.source?.beyondDayId).lastIndexOf(focusDayId) : -1;
  const index = found >= 0 ? found : Math.max(0, points.length - 1);
  if (!points.length) return <p className="insights-empty">No {METRICS[metric].label.toLowerCase()} recorded in this range. Try another measure or range; missing records are not a trend.</p>;
  const selected = points[index] ?? points.at(-1)!;
  const end = Date.parse(readAt), start = end - days * INSIGHT_DAY_MS;
  const values = points.map((point) => point.value);
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const x = (at: string) => 12 + ((Date.parse(at) - start) / (end - start)) * 296;
  const y = (value: number) => 140 - ((value - lo) / span) * 116;
  const path = points.map((point, i) => `${i === 0 || (metric !== "weight" && Date.parse(point.at) - Date.parse(points[i - 1]!.at) > 1.5 * INSIGHT_DAY_MS) ? "M" : "L"}${x(point.at)},${y(point.value)}`).join(" ");
  return <div className="insights-chart">
    <div className="insights-scale"><span>High {insightValue(hi, metric)}</span><span>Low {insightValue(lo, metric)}</span></div>
    <svg viewBox="0 0 320 160" role="img" aria-label={`${METRICS[metric].label}: ${points.length} recorded observations; values and dates can be inspected below`} onPointerDown={(event) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const target = start + (((event.clientX - bounds.left) / bounds.width * 320 - 12) / 296) * (end - start);
      let closest = 0;
      points.forEach((point, i) => { if (Math.abs(Date.parse(point.at) - target) < Math.abs(Date.parse(points[closest]!.at) - target)) closest = i; });
      onSelect(points[closest]!.id);
    }}>
      <path d={path} fill="none" stroke="var(--text-2)" strokeWidth="2" />
      {points.map((point) => <circle key={point.id} cx={x(point.at)} cy={y(point.value)} r="2.5" fill="var(--text-2)" />)}
      <line x1={x(selected.at)} x2={x(selected.at)} y1="12" y2="150" stroke="var(--text-3-strong)" strokeDasharray="4 4" />
      <circle cx={x(selected.at)} cy={y(selected.value)} r="5" fill="var(--text-1)" />
    </svg>
    <p role="status" className="insights-selected">{formatShortDate(selected.at)} · {insightValue(selected.value, metric)} · observation {index + 1} of {points.length}</p>
    {points.length > 1 ? <label className="insights-point-control">RECORDED OBSERVATION<input type="range" min="0" max={points.length - 1} value={index} aria-label="Open recorded observation" aria-valuetext={`${formatShortDate(selected.at)}, ${insightValue(selected.value, metric)}`} onChange={(event) => onSelect(points[Number(event.target.value)]!.id)} /></label>
      : <p className="meta">One observation is a record, not a trend.</p>}
    {onSources && <button type="button" id="insight-view-records" className="btn-secondary" disabled={!selected.source} onClick={() => onSources(selected, metric)}>VIEW RECORDS</button>}
    {onSources && !selected.source && <p className="meta">Source ownership is unavailable for this observation. Full History remains available in COMMAND.</p>}
    {focusDayId && !points.some((point) => point.source?.beyondDayId === focusDayId) && <p className="meta">The selected day's reading is not in this rolling range. These are the available observations; open the selected day in BODY → History.</p>}
    <div className="insights-scale"><span>{formatShortDate(new Date(start))}</span><span>{formatShortDate(readAt)}</span></div>
  </div>;
}
