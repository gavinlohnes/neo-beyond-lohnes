import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Droplet, Footprints, HeartPulse, ListChecks, Moon, Plus, Scale, Utensils } from "lucide-react";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { clockOf, garminFreshness, waterByHour, weightChange } from "../../../application/bodyDashboard";
import { getBodyDashboardExtras, type BodyDashboardExtras } from "../../../application/bodyDashboardQueries";
import { minuteOfDay, paceReading } from "../../../application/pace";
import { hypnogram, sleepMinutes, type StageName } from "../../../domain/health/measuredSeries";
import { livedDayShiftWindow, isOperatorSavedSchedule } from "../../../engine/scheduledContext";
import { MeasuredSheet, STAGE_COLORS } from "../today/MeasuredSheet";
import { WATER_QUICK_ADD_OZ } from "./bodyScreenCopy";
import "./bodyDashboard.css";

/**
 * BODY-DASH-001 (Gavin, 2026-11-14; approved Protected change to DATA's primary information architecture): DATA opens
 * on the numbers. A compact header with the lived day's context and LOG, then adaptive cards — hydration and sleep
 * wide, the rest paired — each with its value, a picture of it, where it came from, and the way in to its existing
 * history or logging. Everything is read from BEYOND's existing queries; every write is an existing command. Garmin's
 * watch measurements wear Garmin blue and say how fresh they are; your own logs are white. Nothing is invented: a
 * missing reading says so, and no goal appears that you didn't set. The cave and every shortcut stay below.
 */
export type DashMetric = "water" | "sleep" | "weight" | "nutrition";
export type DashLog = "log" | "meal" | "weight" | "sleep" | "urge";

export interface BodyDashboardProps {
  day: BeyondDay | null;
  now: Date;
  water: { totalOz: number; entries: readonly HydrationEntry[] };
  sleep: { minutes: number; occurredAt?: string | undefined; fromGarmin: boolean } | null;
  weight: { history: readonly WeighIn[]; goalLbs?: number | undefined };
  nutrition: { calories: number; mealsLogged: number; proteinG: number; proteinTargetG?: number | undefined; calorieTargetKcal?: number | undefined };
  busy: boolean;
  refreshKey: number;
  /** The water quick-add's own confirmation (BODY's existing command and undo). */
  waterConfirmation?: string | null;
  onAddWater: (oz: number) => void;
  onUndoWater?: (() => void) | undefined;
  onOpen: (metric: DashMetric) => void;
  onLog?: ((target: DashLog) => void) | undefined;
  /** The Lifestyle card's existing tools (habits, the quit tracker), shown in place. */
  lifestyle?: ReactNode;
}

const W = 240, H = 44;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, "0")}m`;

function Card({ id, icon, label, source, wide, children, onOpen, openLabel }: {
  id: string; icon: ReactNode; label: string; source?: ReactNode; wide?: boolean; children: ReactNode; onOpen?: (() => void) | undefined; openLabel?: string;
}) {
  return (
    <article className={`bd-card${wide ? " bd-card--wide" : ""}`} aria-labelledby={`bd-${id}`} data-dash={id}>
      <header className="bd-card__head">
        <span className="bd-card__icon" aria-hidden="true">{icon}</span>
        <h3 id={`bd-${id}`} className="bd-card__label">{label}</h3>
        {wide && source}
        {onOpen && <button type="button" className="bd-card__open" aria-label={openLabel ?? `Open ${label.toLowerCase()} history`} onClick={onOpen}><ChevronRight size={18} aria-hidden="true" /></button>}
      </header>
      {/* Narrow cards give their source its own line, so it never crowds the title. */}
      {!wide && source && <p className="bd-card__srcline">{source}</p>}
      {children}
    </article>
  );
}

const Source = ({ garmin, children }: { garmin?: boolean; children: ReactNode }) => <span className={`bd-src${garmin ? " bd-src--garmin" : ""}`}>{children}</span>;

/** A line over values (null breaks the line). Pure SVG, decorative: the card's text carries the same facts. */
function Spark({ values, tone, area }: { values: readonly (number | null)[]; tone: "own" | "garmin"; area?: boolean }) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const lo = Math.min(...known), hi = Math.max(...known), span = hi - lo || 1;
  const x = (i: number) => (values.length === 1 ? W : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 10);
  const pts = values.map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`));
  const runs: string[][] = [[]];
  for (const p of pts) { if (p) runs.at(-1)!.push(p); else if (runs.at(-1)!.length) runs.push([]); }
  const lastI = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1)!;
  return (
    <svg className={`bd-spark bd-spark--${tone}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {area && runs.map((r, i) => r.length > 1 && <polygon key={`a${i}`} className="bd-spark__area" points={`${r[0]!.split(",")[0]},${H} ${r.join(" ")} ${r.at(-1)!.split(",")[0]},${H}`} />)}
      {runs.map((r, i) => r.length > 1 && <polyline key={i} className="bd-spark__line" points={r.join(" ")} />)}
      <circle className="bd-spark__dot" cx={x(lastI)} cy={y(values[lastI]!)} r={3} />
    </svg>
  );
}

function WaterBars({ slots, nowSlot }: { slots: readonly number[]; nowSlot: number }) {
  const max = Math.max(16, ...slots), bw = W / 24;
  return (
    <svg className="bd-bars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="bd-bars__base" x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} />
      {slots.map((oz, i) => oz > 0 && <rect key={i} className="bd-bars__bar" x={i * bw + 1} width={bw - 2} y={H - (oz / max) * (H - 6)} height={(oz / max) * (H - 6)} />)}
      {nowSlot >= 0 && nowSlot < 24 && <line className="bd-bars__now" x1={(nowSlot + 0.5) * bw} x2={(nowSlot + 0.5) * bw} y1={0} y2={H} />}
    </svg>
  );
}

function StageBar({ intervals, from, to }: { intervals: readonly { from: number; to: number; stage: StageName }[]; from: number; to: number }) {
  const span = to - from || 1;
  return (
    <div className="bd-stages" aria-hidden="true">
      {intervals.map((s) => <i key={`${s.from}-${s.stage}`} style={{ left: `${((s.from - from) / span) * 100}%`, width: `${Math.max(0.6, ((s.to - s.from) / span) * 100)}%`, background: STAGE_COLORS[s.stage] }} />)}
    </div>
  );
}

function Meter({ label, value, of, unit }: { label: string; value: number; of?: number | undefined; unit: string }) {
  return (
    <div className="bd-meter">
      <div className="bd-meter__row"><span>{label}</span><span><b>{fmt(value)}</b>{of ? ` / ${fmt(of)}` : ""} {unit}</span></div>
      {of ? <div className="bd-meter__track" aria-hidden="true"><i style={{ width: `${Math.min(100, (value / of) * 100)}%` }} /></div> : null}
    </div>
  );
}

export function BodyDashboard(p: BodyDashboardProps) {
  const [extras, setExtras] = useState<BodyDashboardExtras | null>(null);
  const [lifestyleOpen, setLifestyleOpen] = useState(false);
  // Steps and resting HR open GARMIN-004's own detail sheet (today, 7D, 4W, 1Y, table view).
  const [measuredOpen, setMeasuredOpen] = useState<"steps" | "resting" | null>(null);
  const dayId = p.day?.id ?? null;
  useEffect(() => {
    let live = true;
    void getBodyDashboardExtras(p.day, new Date()).then((e) => { if (live) setExtras(e); }, () => { if (live) setExtras({ measured: null, pace: null, habits: null, quit: null, schedule: null }); });
    return () => { live = false; };
    // Re-read when the day, the data or BODY's refresh changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, p.refreshKey, p.water.totalOz, p.nutrition.calories]);

  const now = p.now, nowMs = now.getTime();
  const m = extras?.measured ?? null;
  const fresh = m?.any ? garminFreshness(m.garminAsOf, nowMs) : null;
  const garminSource = fresh ? <Source garmin>{fresh.stale ? "GARMIN · OLD" : "GARMIN"}</Source> : null;

  // Header: the lived day and, from the record or the saved schedule, its shift.
  const shift = p.day && extras?.schedule && isOperatorSavedSchedule(extras.schedule) && p.day.workContext !== "OFF" ? livedDayShiftWindow(new Date(p.day.startedAt), extras.schedule) : null;
  const context = !p.day ? "No day started" : p.day.workContext === "OFF" ? "Day off" : shift ? `${shift.end.toDateString() !== shift.start.toDateString() ? "Night shift" : "Shift"} ${clockOf(shift.start.getTime())}–${clockOf(shift.end.getTime())}` : p.day.workContext === "WORK" ? "Work day" : "Work or off not set";
  const contextBasis = !p.day ? null : p.day.workContext === "UNKNOWN" ? (shift ? "schedule" : null) : "recorded";

  // Water: today's hours, and your own usual pace (never a goal).
  const slots = p.day ? waterByHour(p.water.entries, p.day.startedAt) : [];
  const nowSlot = p.day ? Math.floor((nowMs - Date.parse(p.day.startedAt)) / 3_600_000) : -1;
  const pace = p.day && extras?.pace ? paceReading("water", p.water.totalOz, extras.pace.water, minuteOfDay(p.day.startedAt, now)) : null;
  const lastWater = [...p.water.entries].filter((e) => e.effectiveAmountOz > 0).sort((a, b) => b.at.localeCompare(a.at))[0];

  // Sleep: Garmin's night (with stages) when it is the main sleep; otherwise your logged main sleep.
  const night = m?.lastNight ?? null;
  const sleepFromGarmin = !!night && (p.sleep?.fromGarmin ?? !p.sleep);
  const stages = night && sleepFromGarmin ? hypnogram(night) : [];

  // Weight, nutrition, steps, resting HR.
  const latestWeight = [...p.weight.history].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).at(-1) ?? null;
  const change = weightChange(p.weight.history);
  const weightSeries = [...p.weight.history].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).filter((w) => Date.parse(w.recordedAt) > nowMs - 30 * 86_400_000).map((w) => w.weightLbs);
  const burned = m?.anyCalories ? m.burnedToday.at(-1)?.total ?? null : null;
  // Only real watch data: the snapshot's running total is zero-filled when nothing was measured.
  const steps = m?.any && m.steps.some((s) => s.value !== null) && m.stepsToday.length ? m.stepsToday.at(-1)!.total : null;
  const restingLatest = m?.any ? [...m.resting].reverse().find((r) => r.value !== null) ?? null : null;
  const restingSeries = m ? m.resting.slice(-14).map((r) => r.value) : [];
  const usualSteps = m?.usual.steps.value ?? null, usualResting = m?.usual.resting.value ?? null;

  return (
    <section className="bd" aria-labelledby="bd-title">
      <h2 id="bd-title" className="visually-hidden">Your numbers</h2>
      <header className="bd-head">
        <div className="bd-head__id">
          {/* The app header already names DATA for screen readers; this is its large title. */}
          <p className="bd-head__title" aria-hidden="true">DATA</p>
          <p className="bd-head__sub">BODY / HEALTH</p>
        </div>
        {p.onLog && <button type="button" className="bd-head__log" aria-label="Log a record" disabled={p.busy} onClick={() => p.onLog!("log")}>LOG <Plus size={18} aria-hidden="true" /></button>}
      </header>
      <div className="bd-day" data-dash-day>
        <span className="bd-day__date">{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</span>
        <span className="bd-day__ctx"><Moon size={16} aria-hidden="true" />{context}{contextBasis === "schedule" ? <em> · schedule</em> : null}</span>
      </div>

      <div className="bd-grid">
        <Card id="water" icon={<Droplet size={18} />} label="HYDRATION" wide source={<Source>LOGGED</Source>} onOpen={() => p.onOpen("water")} openLabel="Open water history">
          <div className="bd-row">
            <p className="bd-value">{p.water.totalOz > 0 ? <>{fmt(p.water.totalOz)}<small> oz</small></> : <span className="bd-none">Not logged</span>}</p>
            <div className="bd-viz">{p.day && <><WaterBars slots={slots} nowSlot={nowSlot} /><div className="bd-axis" aria-hidden="true"><span>{clockOf(p.day.startedAt)}</span><span>NOW</span><span>{clockOf(Date.parse(p.day.startedAt) + 86_400_000)}</span></div></>}</div>
          </div>
          <p className="bd-meta" data-dash-water-pace>
            {pace?.usual.kind === "RANGE" ? `Your usual by now: ${fmt(pace.usual.low)}–${fmt(pace.usual.high)} oz` : pace ? `Learning your usual: ${pace.usual.days} of ${pace.usual.need} days` : "Your usual appears after 10 logged days"}
            {lastWater ? ` · last ${clockOf(lastWater.at)} +${fmt(lastWater.effectiveAmountOz)} oz` : ""}
          </p>
          <div className="bd-quick" role="group" aria-label="Add water">
            {WATER_QUICK_ADD_OZ.map((oz) => <button key={oz} type="button" disabled={p.busy} onClick={() => p.onAddWater(oz)}>+{oz} oz</button>)}
          </div>
          {p.waterConfirmation && <p className="bd-confirm" role="status">{p.waterConfirmation}{p.onUndoWater && <button type="button" disabled={p.busy} onClick={p.onUndoWater}>UNDO</button>}</p>}
        </Card>

        <Card id="sleep" icon={<Moon size={18} />} label="SLEEP" wide source={sleepFromGarmin ? garminSource : p.sleep ? <Source>LOGGED</Source> : null} onOpen={() => p.onOpen("sleep")} openLabel="Open sleep history">
          {sleepFromGarmin && night ? <>
            <p className="bd-value">{hm(sleepMinutes(night))}<small className="bd-value__aside">{clockOf(night.startTime)} – {clockOf(night.endTime)}</small></p>
            {stages.length > 0 ? <StageBar intervals={stages} from={Date.parse(night.startTime)} to={Date.parse(night.endTime)} /> : <p className="bd-meta">No stages in this record.</p>}
            <p className="bd-meta">Main sleep{fresh ? ` · ${fresh.label}` : ""}{usualSleep(m)}</p>
          </> : p.sleep ? <>
            <p className="bd-value">{hm(p.sleep.minutes)}</p>
            <div className="bd-stages bd-stages--own" aria-hidden="true"><i style={{ left: 0, width: "100%" }} /></div>
            <p className="bd-meta">Main sleep, logged{p.sleep.occurredAt ? ` · ${new Date(p.sleep.occurredAt).toLocaleDateString("en-US", { weekday: "short" })} ${clockOf(p.sleep.occurredAt)}` : ""}</p>
          </> : <>
            <p className="bd-value"><span className="bd-none">Not logged</span></p>
            <p className="bd-meta">No main sleep in the last 36 hours.</p>
          </>}
          {p.onLog && <div className="bd-quick bd-quick--one"><button type="button" disabled={p.busy} aria-label="Log sleep from the dashboard" onClick={() => p.onLog!("sleep")}>LOG SLEEP</button></div>}
        </Card>

        <Card id="weight" icon={<Scale size={18} />} label="WEIGHT" source={latestWeight ? <Source>LOGGED</Source> : null} onOpen={() => p.onOpen("weight")} openLabel="Open weight history">
          <p className="bd-value">{latestWeight ? <>{latestWeight.weightLbs}<small> lb</small></> : <span className="bd-none">Not logged</span>}</p>
          {change && <p className={`bd-delta${change.lbs < 0 ? " bd-delta--down" : change.lbs > 0 ? " bd-delta--up" : ""}`}>{change.lbs > 0 ? "▲ +" : change.lbs < 0 ? "▼ " : ""}{change.lbs} lb ({change.days}d)</p>}
          <Spark values={weightSeries} tone="own" />
          <p className="bd-meta">{latestWeight ? new Date(latestWeight.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Weigh in to start a trend"}{p.weight.goalLbs ? ` · Goal ${p.weight.goalLbs} lb` : ""}</p>
          {p.onLog && <div className="bd-quick bd-quick--one"><button type="button" disabled={p.busy} aria-label="Log weight from the dashboard" onClick={() => p.onLog!("weight")}>LOG WEIGHT</button></div>}
        </Card>

        <Card id="nutrition" icon={<Utensils size={18} />} label="NUTRITION" source={p.nutrition.mealsLogged ? <Source>LOGGED</Source> : null} onOpen={() => p.onOpen("nutrition")} openLabel="Open nutrition history">
          {p.nutrition.mealsLogged > 0 || p.nutrition.proteinG > 0 ? <>
            <Meter label="Eaten" value={p.nutrition.calories} of={p.nutrition.calorieTargetKcal} unit="kcal" />
            <Meter label="Protein" value={p.nutrition.proteinG} of={p.nutrition.proteinTargetG} unit="g" />
          </> : <p className="bd-value"><span className="bd-none">No food logged</span></p>}
          {burned !== null && <p className="bd-meta bd-meta--garmin" data-dash-burned>Burned (Garmin estimate): {fmt(burned)} kcal</p>}
          {p.onLog && <div className="bd-quick bd-quick--one"><button type="button" disabled={p.busy} aria-label="Log food from the dashboard" onClick={() => p.onLog!("meal")}>LOG FOOD</button></div>}
        </Card>

        <Card id="steps" icon={<Footprints size={18} />} label="STEPS" source={steps !== null ? garminSource : null} onOpen={m?.any ? () => setMeasuredOpen("steps") : undefined} openLabel="Open steps history">
          <p className="bd-value">{steps !== null ? fmt(steps) : <span className="bd-none">Not measured</span>}</p>
          {steps !== null && <Spark values={m!.stepsToday.map((s) => s.total)} tone="garmin" area />}
          <p className="bd-meta">{usualSteps !== null ? `Usual ${m!.usual.steps.dayKind === "WORK" ? "work day" : "day off"}: ${fmt(usualSteps)}` : steps !== null ? "So far this lived day" : "From your watch, when synced"}</p>
        </Card>

        <Card id="resting" icon={<HeartPulse size={18} />} label="RESTING HR" source={restingLatest ? garminSource : null} onOpen={m?.any ? () => setMeasuredOpen("resting") : undefined} openLabel="Open resting heart rate history">
          <p className="bd-value">{restingLatest ? <>{Math.round(restingLatest.value!)}<small> bpm</small></> : <span className="bd-none">Not measured</span>}</p>
          {restingSeries.some((v) => v !== null) && <Spark values={restingSeries} tone="garmin" />}
          <p className="bd-meta">{usualResting !== null ? `Usual: ${Math.round(usualResting)} bpm` : restingLatest ? "Your usual appears after 14 days" : "From your watch, when synced"}</p>
        </Card>

        <Card id="lifestyle" icon={<ListChecks size={18} />} label="LIFESTYLE" wide>
          <ul className="bd-chips" aria-label="Today's habits and quit tracker">
            {(extras?.habits ?? []).map((h) => <li key={h.name} className={h.done ? "bd-chip bd-chip--done" : "bd-chip"}>{h.name}<span className="visually-hidden">{h.done ? ", done today" : ", not done yet today"}</span><span className="bd-chip__mark" aria-hidden="true">{h.done ? "✓" : "○"}</span></li>)}
            {extras?.quit && <li className={extras.quit.cleanToday ? "bd-chip bd-chip--done" : "bd-chip"}>{extras.quit.habit.name}: {extras.quit.cleanThisMonth} clean this month{extras.quit.cleanToday ? " · today ✓" : ""}</li>}
            {extras && !extras.habits?.length && !extras.quit && <li className="bd-chip bd-chip--empty">No habits or quit tracker set up</li>}
          </ul>
          {p.lifestyle && <button type="button" className="bd-card__more" aria-expanded={lifestyleOpen} aria-controls="bd-lifestyle-tools" onClick={() => setLifestyleOpen((o) => !o)}>{lifestyleOpen ? "HIDE HABITS AND QUIT" : "HABITS AND QUIT"}</button>}
          {p.lifestyle && lifestyleOpen && <div id="bd-lifestyle-tools" className="bd-lifestyle">{p.lifestyle}</div>}
        </Card>
      </div>
      <MeasuredSheet open={measuredOpen !== null} metric={measuredOpen ?? "steps"} snapshot={m} onClose={() => setMeasuredOpen(null)} />
    </section>
  );
}

function usualSleep(m: BodyDashboardExtras["measured"]): string {
  const v = m?.usual.sleep.value;
  return v ? ` · usual ${hm(v)}` : "";
}
