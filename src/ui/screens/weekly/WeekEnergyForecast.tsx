import { useState } from "react";
import type { ForecastDay, WeekEnergyForecast } from "../../../application/weekEnergyForecast";
import { RUN_MEAN_FLOOR } from "../../../application/rotationProjection";
import { SLEEP_NEED_MINUTES } from "../../../application/monthQueries";

/**
 * WEEK ENERGY FORECAST: the week's summary and each day's line. Information only; it shows recorded history
 * at the same place in past runs and never changes a plan or feeds the Engine.
 */
const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const energy = (n: number) => `${n.toFixed(1)} of 5`;
const hoursMinutes = (minutes: number) => { const m = Math.round(minutes); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m`; };
// The sleep need is the same constant getSleepDebt measures against, so the wording follows the maths.
const need = `${SLEEP_NEED_MINUTES / 60} h`;

function place(day: ForecastDay): string {
  if (day.position === undefined) return day.work === "WORK" ? "A run of shifts over 3 weeks long" : "Over 3 weeks off";
  const of = day.length === undefined ? "" : ` of ${day.length}`;
  return day.work === "WORK" ? `Shift ${day.position}${of}` : `Day off ${day.position}${of}`;
}

/** One day's forecast line, for its Week Ahead row. */
export function forecastLine(day: ForecastDay): string {
  if (day.energy.mean === undefined) {
    return `${place(day)} · energy: not enough history yet (${day.energy.days} day${day.energy.days === 1 ? "" : "s"}; needs ${RUN_MEAN_FLOOR})`;
  }
  const sleep = day.sleep.mean === undefined ? `main sleep: ${day.sleep.days} day${day.sleep.days === 1 ? "" : "s"}, too few` : `main sleep ${day.sleep.mean.toFixed(1)} h (${day.sleep.days} days)`;
  const from = day.basis === "SAME_LENGTH" ? `your past ${day.length}-${day.work === "WORK" ? "shift" : "day-off"} runs` : "past runs of any length";
  return `${place(day)} · energy ${energy(day.energy.mean)} (${day.energy.days} days) · ${sleep} · from ${from}`;
}

export function WeekEnergyForecastSummary({ forecast }: { forecast: WeekEnergyForecast }) {
  if (!forecast.scheduled) return <p className="meta" data-energy-forecast>Energy forecast: save your work schedule in MORE → WORK SCHEDULE to see one.</p>;
  const { lowest, best, sleepOwed } = forecast;
  return (
    <section data-energy-forecast aria-labelledby="energy-forecast-heading" style={{ margin: "0 0 10px" }}>
      <p id="energy-forecast-heading" className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>ENERGY FORECAST</p>
      <p className="meta" style={{ margin: "2px 0 0" }}>
        {lowest && best
          ? `Lowest ${weekday(lowest.date)} (${energy(lowest.energy.mean!)}), best ${weekday(best.date)} (${energy(best.energy.mean!)}).`
          : "Not enough history yet to name a low or a high day. Each day you check in adds to it."}
      </p>
      {sleepOwed.days > 0 && <p className="meta" style={{ margin: "2px 0 0" }}>
        {sleepOwed.owedMinutes > 0
          ? `Sleep owed: ${hoursMinutes(sleepOwed.owedMinutes)} against ${need} a night over your last ${sleepOwed.days} logged days.`
          : `No sleep owed against ${need} a night over your last ${sleepOwed.days} logged days.`}
      </p>}
      <p className="meta" style={{ margin: "2px 0 0" }}>A forecast from your history: the check-in energy and main sleep you recorded at the same place in past runs of the same length, or of any length when those are too few. Not a promise, and nothing changes.</p>
    </section>
  );
}

/**
 * FORECAST-DECIDE-001: what the forecast lets you do, from its own lowest day, best day and sleep owed. Each
 * suggestion uses an existing path: a plan item for that day (only on CONFIRM), opening that day's plans to move
 * one, or your plan list to put something on the best day. Nothing changes the schedule, and nothing is written
 * until you confirm.
 */
export interface ForecastPlanDraft { key: string; title: string; plannedAt: string; description: string }
export function forecastActions(forecast: WeekEnergyForecast): { lighter: ForecastPlanDraft | null; recovery: ForecastPlanDraft | null } {
  const low = forecast.lowest;
  const lighter = low && low.energy.mean !== undefined ? {
    key: "lighter", title: `Keep ${weekday(low.date)} light`, plannedAt: low.date,
    description: `From the energy forecast: the lowest of the week (${energy(low.energy.mean)}, from ${low.energy.days} days in past runs).`,
  } : null;
  // The first day off from tomorrow on; today's sleep is already under way.
  const off = forecast.days.slice(1).find((day) => day.work === "OFF");
  const recovery = forecast.sleepOwed.owedMinutes >= 60 && off ? {
    key: "recovery", title: "Recovery sleep", plannedAt: off.date,
    description: `From the energy forecast: about ${hoursMinutes(forecast.sleepOwed.owedMinutes)} of sleep owed over your last ${forecast.sleepOwed.days} logged days.`,
  } : null;
  return { lighter, recovery };
}

export function ForecastActions({ forecast, plannedOn, onCreate, onOpenPlanItem, onOpenPlans }: {
  forecast: WeekEnergyForecast;
  /** Open plans already on a date (planned or due), to offer moving one. */
  plannedOn: (date: string) => { id: string; title: string }[];
  onCreate: (draft: ForecastPlanDraft) => Promise<void>;
  onOpenPlanItem?: ((id: string) => void) | undefined;
  onOpenPlans?: (() => void) | undefined;
}) {
  const { lighter, recovery } = forecastActions(forecast);
  const [preview, setPreview] = useState<ForecastPlanDraft | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const low = forecast.lowest, best = forecast.best;
  if (!lighter && !recovery && !best) return null;
  const onLow = low ? plannedOn(low.date) : [];
  const confirm = () => {
    if (!preview) return;
    setSaving(true); setError(null);
    void onCreate(preview).then(() => { setAdded((a) => [...a, preview.key]); setPreview(null); },
      () => setError("That couldn't be saved. Nothing changed.")).finally(() => setSaving(false));
  };
  const offer = (draft: ForecastPlanDraft | null, label: string) => draft && (added.includes(draft.key)
    ? <p className="meta" role="status" style={{ margin: "2px 0 0" }}>Added plan item for {weekday(draft.plannedAt)}: {draft.title}.</p>
    : <button type="button" className="btn-secondary" disabled={saving || !!preview} onClick={() => setPreview(draft)}>{label}</button>);
  return (
    <section data-forecast-actions aria-label="What you can do with this forecast" style={{ margin: "0 0 10px" }}>
      <p className="meta-strong" style={{ margin: 0, color: "var(--text-1)" }}>WHAT YOU CAN DO</p>
      {low && <>
        <p className="meta" style={{ margin: "2px 0 0" }}>{weekday(low.date)} looks like the low point. You could keep it light{onLow.length ? `, or move one of its ${onLow.length === 1 ? "plan" : `${onLow.length} plans`}` : ""}.</p>
        <div className="button-row">
          {offer(lighter, `PLAN A LIGHTER ${weekday(low.date).toUpperCase()}`)}
          {onOpenPlanItem && onLow.map((item) => <button key={item.id} type="button" className="btn-secondary" onClick={() => onOpenPlanItem(item.id)}>MOVE “{item.title}”</button>)}
        </div>
      </>}
      {recovery && <>
        <p className="meta" style={{ margin: "6px 0 0" }}>Sleep owed is about {hoursMinutes(forecast.sleepOwed.owedMinutes)}. {weekday(recovery.plannedAt)} is your next day off.</p>
        <div className="button-row">{offer(recovery, `PLAN RECOVERY SLEEP ON ${weekday(recovery.plannedAt).toUpperCase()}`)}</div>
      </>}
      {best && best.date !== low?.date && onOpenPlans && <>
        <p className="meta" style={{ margin: "6px 0 0" }}>{weekday(best.date)} looks strongest, a good day for something that needs energy.</p>
        <div className="button-row"><button type="button" className="btn-secondary" onClick={onOpenPlans}>CHOOSE A PLAN FOR {weekday(best.date).toUpperCase()}</button></div>
      </>}
      {preview && <div role="group" aria-label="Preview" className="equipment-row" style={{ padding: "10px 12px", marginTop: 6 }}>
        <p className="meta" style={{ margin: 0 }}>Adds this plan item for {weekday(preview.plannedAt)}. Your schedule doesn't change.</p>
        <p className="meta-strong" style={{ margin: "6px 0 0", color: "var(--text-1)" }}>{preview.title}</p>
        <p className="meta" style={{ margin: "2px 0 6px" }}>{preview.description}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-primary" disabled={saving} onClick={confirm}>CONFIRM</button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setPreview(null)}>CANCEL</button>
        </div>
      </div>}
      {error && <p className="meta" role="alert">{error}</p>}
    </section>
  );
}
