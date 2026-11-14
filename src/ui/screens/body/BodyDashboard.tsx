import { useEffect, useState } from "react";
import { ChevronRight, Droplet, Footprints, HeartPulse, ListChecks, Moon, Scale, Utensils } from "lucide-react";
import type { BeyondDay, HydrationEntry } from "../../../domain/common/types";
import type { WeighIn } from "../../../application/bodyTrendQueries";
import { clockOf, garminFreshness, stepsSoFar, waterByHour, weightChange } from "../../../application/bodyDashboard";
import { mostRecentBoundaryAtOrBefore } from "../../../engine/dayRollover";
import { getBodyDashboardExtras, type BodyDashboardExtras } from "../../../application/bodyDashboardQueries";
import { minuteOfDay, paceReading } from "../../../application/pace";
import { hypnogram, sleepMinutes, stageMinutes, STAGE_ORDER, type StageName } from "../../../domain/health/measuredSeries";
import { livedDayShiftWindow, isOperatorSavedSchedule } from "../../../engine/scheduledContext";
import { MeasuredSheet, STAGE_COLORS } from "../today/MeasuredSheet";
import { WATER_QUICK_ADD_OZ } from "./bodyScreenCopy";
import { CommandBar, Meter, Panel, SourceTag as Source, Sparkline as Spark, SPARK_H, SPARK_W } from "../../foundation/primitives";
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
  /** Lifestyle opens the existing habits page (YOUR LIFE); the quit tracker opens through LOG ("urge"). */
  onOpenHabits?: (() => void) | undefined;
}

const W = SPARK_W, H = SPARK_H;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(Math.round(minutes % 60)).padStart(2, "0")}m`;

/** BODY's panel: the foundation's framed panel with BODY's heading ids and test hooks. */
function Card({ id, ...rest }: Omit<Parameters<typeof Panel>[0], "headingId" | "data"> & { id: string }) {
  return <Panel headingId={`bd-${id}`} data={{ "data-dash": id }} {...rest} />;
}

function WaterBars({ slots, nowSlot }: { slots: readonly number[]; nowSlot: number }) {
  const max = Math.max(16, ...slots), bw = W / 24;
  return (
    <svg className="bd-bars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {[0.5, 1].map((f) => <line key={f} className="bd-bars__guide" x1={0} x2={W} y1={H - f * (H - 6)} y2={H - f * (H - 6)} />)}
      {[6, 12, 18].map((h) => <line key={h} className="bd-bars__tick" x1={h * bw} x2={h * bw} y1={H - 4} y2={H} />)}
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

export function BodyDashboard(p: BodyDashboardProps) {
  const [extras, setExtras] = useState<BodyDashboardExtras | null>(null);
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

  // Water: the lived day's hours from 16:30 (review of #512: not from when the day was started), and your own usual pace.
  const livedStart = p.day ? mostRecentBoundaryAtOrBefore(new Date(p.day.startedAt)).toISOString() : null;
  const slots = livedStart ? waterByHour(p.water.entries, livedStart) : [];
  const nowSlot = livedStart ? Math.floor((nowMs - Date.parse(livedStart)) / 3_600_000) : -1;
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
  // Only real watch data, read as TODAY reads it (review of #512).
  const steps = stepsSoFar(m);
  const restingLatest = m?.any ? [...m.resting].reverse().find((r) => r.value !== null) ?? null : null;
  const restingSeries = m ? m.resting.slice(-14).map((r) => r.value) : [];
  const usualSteps = m?.usual.steps.value ?? null, usualResting = m?.usual.resting.value ?? null;

  const stageMins = night && sleepFromGarmin && stages.length ? stageMinutes(night) : null;
  const log = (target: DashLog, label: string) => (p.onLog ? { label, onClick: () => p.onLog!(target), disabled: p.busy } : undefined);
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();

  return (
    <section className="bf bd" aria-labelledby="bd-title">
      <h2 id="bd-title" className="visually-hidden">Your numbers</h2>
      {/* The app header already says DATA; this command bar carries what it doesn't: BODY, the lived day, LOG. */}
      <CommandBar eyebrow="BODY // HEALTH"
        context={<p className="bf-bar__day" data-dash-day><span className="bf-bar__date">{dateLabel}</span><span className="bf-bar__ctx"><Moon size={14} aria-hidden="true" />{context}{contextBasis === "schedule" ? <em> · schedule</em> : null}</span></p>}
        action={p.onLog ? { text: "LOG", label: "Log a record", disabled: p.busy, onClick: () => p.onLog!("log") } : undefined} />

      <div className="bd-grid">
        <Card id="water" primary icon={<Droplet size={18} />} label="HYDRATION" wide source={<Source>LOGGED</Source>} onOpen={() => p.onOpen("water")} openLabel="Open water history">
          <div className="bd-split">
            <div className="bd-split__num">
              <p className="bf-value bf-value--xl">{p.water.totalOz > 0 ? <>{fmt(p.water.totalOz)}<small> oz</small></> : <span className="bf-none">Not logged</span>}</p>
              <p className="bf-meta" data-dash-water-pace>{pace?.usual.kind === "RANGE" ? <>Usual by now <b>{fmt(pace.usual.low)}–{fmt(pace.usual.high)} oz</b></> : pace ? `Learning your usual · ${pace.usual.days}/${pace.usual.need} days` : "Usual after 10 logged days"}</p>
            </div>
            <div className="bd-viz">{p.day && <><WaterBars slots={slots} nowSlot={nowSlot} /><div className="bd-axis" aria-hidden="true"><span>{clockOf(livedStart!)}</span><span>NOW</span><span>{clockOf(Date.parse(livedStart!) + 86_400_000)}</span></div></>}</div>
          </div>
          <div className="bd-quick" role="group" aria-label="Add water">
            {WATER_QUICK_ADD_OZ.map((oz) => <button key={oz} type="button" disabled={p.busy} onClick={() => p.onAddWater(oz)}>+{oz} oz</button>)}
          </div>
          {p.waterConfirmation ? <p className="bd-confirm" role="status">{p.waterConfirmation}{p.onUndoWater && <button type="button" disabled={p.busy} onClick={p.onUndoWater}>UNDO</button>}</p>
            : lastWater && <p className="bf-meta">Last {clockOf(lastWater.at)} · +{fmt(lastWater.effectiveAmountOz)} oz</p>}
        </Card>

        <Card id="sleep" primary icon={<Moon size={18} />} label="SLEEP" wide source={sleepFromGarmin ? garminSource : p.sleep ? <Source>LOGGED</Source> : null}
          action={log("sleep", "Log sleep")} onOpen={() => p.onOpen("sleep")} openLabel="Open sleep history">
          {sleepFromGarmin && night ? <>
            <div className="bd-split bd-split--sleep">
              <p className="bf-value bf-value--xl">{hm(sleepMinutes(night))}</p>
              <p className="bd-span"><span>{clockOf(night.startTime)}</span><span aria-hidden="true">→</span><span>{clockOf(night.endTime)}</span></p>
            </div>
            {stages.length > 0 ? <StageBar intervals={stages} from={Date.parse(night.startTime)} to={Date.parse(night.endTime)} /> : <p className="bf-meta">No stages in this record.</p>}
            {stageMins && <ul className="bd-stage-key" aria-label="Sleep stages">{STAGE_ORDER.slice().reverse().map((st) => <li key={st}><i style={{ background: STAGE_COLORS[st] }} aria-hidden="true" />{st === "REM" ? "REM" : st[0] + st.slice(1).toLowerCase()} <b>{stageMins[st] === null ? "—" : hm(stageMins[st]!)}</b></li>)}</ul>}
            <p className="bf-meta">{fresh ? fresh.label : "Garmin"}{usualSleep(m)}</p>
          </> : p.sleep ? <>
            <p className="bf-value bf-value--xl">{hm(p.sleep.minutes)}</p>
            <div className="bd-stages bd-stages--own" aria-hidden="true"><i style={{ left: 0, width: "100%" }} /></div>
            <p className="bf-meta">Main sleep, logged{p.sleep.occurredAt ? ` · ${new Date(p.sleep.occurredAt).toLocaleDateString("en-US", { weekday: "short" })} ${clockOf(p.sleep.occurredAt)}` : ""}</p>
          </> : <>
            <p className="bf-value"><span className="bf-none">Not logged</span></p>
            <p className="bf-meta">No main sleep in the last 36 hours.</p>
          </>}
        </Card>

        <Card id="weight" icon={<Scale size={18} />} label="WEIGHT" source={latestWeight ? <Source>LOGGED</Source> : null} action={log("weight", "Log weight")} onOpen={() => p.onOpen("weight")} openLabel="Open weight history">
          <p className="bf-value">{latestWeight ? <>{latestWeight.weightLbs}<small> lb</small></> : <span className="bf-none">Not logged</span>}</p>
          {change && <p className="bf-delta">{change.lbs > 0 ? "▲ +" : change.lbs < 0 ? "▼ " : ""}{change.lbs} lb · {change.days}d</p>}
          <Spark values={weightSeries} tone="own" />
          <p className="bf-meta">{latestWeight ? new Date(latestWeight.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Weigh in to start a trend"}{p.weight.goalLbs ? ` · goal ${p.weight.goalLbs} lb` : ""}</p>
        </Card>

        <Card id="nutrition" icon={<Utensils size={18} />} label="NUTRITION" source={p.nutrition.mealsLogged || p.nutrition.proteinG ? <Source>LOGGED</Source> : null} action={log("meal", "Log food")} onOpen={() => p.onOpen("nutrition")} openLabel="Open nutrition history">
          {/* Review of #512: no bare zero (DENSITY-001). Calories need a logged meal; protein needs a protein record. */}
          {p.nutrition.mealsLogged > 0 || p.nutrition.proteinG > 0 ? <>
            {p.nutrition.mealsLogged > 0 ? <Meter label="Eaten" value={p.nutrition.calories} of={p.nutrition.calorieTargetKcal} unit="kcal" /> : <p className="bf-meta">No meals logged</p>}
            {p.nutrition.proteinG > 0 && <Meter label="Protein" value={p.nutrition.proteinG} of={p.nutrition.proteinTargetG} unit="g" />}
          </> : <p className="bf-value"><span className="bf-none">No food logged</span></p>}
          {burned !== null && <p className="bf-meta bf-meta--garmin" data-dash-burned>Burned (Garmin estimate) {fmt(burned)} kcal</p>}
        </Card>

        <Card id="steps" icon={<Footprints size={18} />} label="STEPS" source={steps !== null ? garminSource : null} onOpen={m?.any ? () => setMeasuredOpen("steps") : undefined} openLabel="Open steps history">
          <p className="bf-value">{steps !== null ? fmt(steps) : <span className="bf-none">Not measured</span>}</p>
          {steps !== null && m!.stepsToday.length > 1 && <Spark values={m!.stepsToday.map((s) => s.total)} tone="garmin" area />}
          <p className="bf-meta">{usualSteps !== null ? `Usual ${m!.usual.steps.dayKind === "WORK" ? "work day" : "day off"} ${fmt(usualSteps)}` : steps !== null ? "So far this lived day" : "From your watch, when synced"}</p>
        </Card>

        <Card id="resting" icon={<HeartPulse size={18} />} label="RESTING HR" source={restingLatest ? garminSource : null} onOpen={m?.any ? () => setMeasuredOpen("resting") : undefined} openLabel="Open resting heart rate history">
          <p className="bf-value">{restingLatest ? <>{Math.round(restingLatest.value!)}<small> bpm</small></> : <span className="bf-none">Not measured</span>}</p>
          {restingSeries.some((v) => v !== null) && <Spark values={restingSeries} tone="garmin" />}
          <p className="bf-meta">{usualResting !== null ? `Usual ${Math.round(usualResting)} bpm` : restingLatest ? "Usual after 14 days" : "From your watch, when synced"}</p>
        </Card>

        <Card id="lifestyle" icon={<ListChecks size={18} />} label="LIFESTYLE" wide>
          <ul className="bd-chips" aria-label="Today's habits and quit tracker">
            {(extras?.habits ?? []).map((h) => <li key={h.name} className={h.done ? "bd-chip bd-chip--done" : "bd-chip"}>{h.name}<span className="visually-hidden">{h.done ? ", done today" : ", not done yet today"}</span><span className="bd-chip__mark" aria-hidden="true">{h.done ? "✓" : "○"}</span></li>)}
            {extras?.quit && <li className={extras.quit.cleanToday ? "bd-chip bd-chip--done" : "bd-chip"}>{extras.quit.habit.name} · {extras.quit.cleanThisMonth} clean this month{extras.quit.cleanToday ? " · today ✓" : ""}</li>}
            {extras && !extras.habits?.length && !extras.quit && <li className="bd-chip bd-chip--empty">No habits or quit tracker set up</li>}
          </ul>
          {/* The existing tools, not an inline form: Habits live in YOUR LIFE, the quit tracker in LOG. */}
          <div className="bd-links">
            {p.onOpenHabits && <button type="button" className="bd-link" onClick={p.onOpenHabits}>HABITS <ChevronRight size={16} aria-hidden="true" /></button>}
            {p.onLog && <button type="button" className="bd-link" disabled={p.busy} onClick={() => p.onLog!("urge")}>QUIT TRACKER <ChevronRight size={16} aria-hidden="true" /></button>}
          </div>
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
