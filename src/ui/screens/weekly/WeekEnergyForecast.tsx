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
