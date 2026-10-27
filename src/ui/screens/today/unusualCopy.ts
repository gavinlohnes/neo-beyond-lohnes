import type { UnusualReading } from "../../../domain/health/unusual";
import { hoursMinutes } from "../health/healthFormat";

/** ROTATION-002: the words for "unusual for you". A reading against your own history, never advice or a cause. */
export type UnusualMetric = "resting" | "sleep" | "steps";

const NAMES: Record<UnusualMetric, string> = { resting: "Resting heart rate", sleep: "Garmin main sleep", steps: "Steps" };
function value(metric: UnusualMetric, n: number): string {
  return metric === "resting" ? `${n} bpm` : metric === "sleep" ? hoursMinutes(n) : Math.round(n).toLocaleString("en-US");
}

/** The tile's small label: "↑ 3 DAYS". */
export function unusualTileLabel(reading: UnusualReading): string {
  return `${reading.direction === "ABOVE" ? "↑" : "↓"} ${reading.days.length} DAYS`;
}

/** For screen readers on the tile: ", above your usual range 3 days running". */
export function unusualAria(reading: UnusualReading): string {
  return `, ${reading.direction === "ABOVE" ? "above" : "below"} your usual range ${reading.days.length} days running`;
}

/** The sheet's sentence, with the values, the range and its basis. */
export function describeUnusual(metric: UnusualMetric, reading: UnusualReading): { headline: string; basis: string } {
  const side = reading.direction === "ABOVE" ? "above" : "below";
  const latest = reading.days.at(-1)!;
  const kinds = new Set(reading.days.map((day) => day.kind));
  const ranges = metric === "steps" && kinds.size > 1
    ? [...kinds].map((kind) => { const day = [...reading.days].reverse().find((d) => d.kind === kind)!; return `${kind === "WORK" ? "work days" : "days off"} ${value(metric, day.low)}–${value(metric, day.high)}`; }).join("; ")
    : `${metric === "steps" ? (latest.kind === "OFF" ? "days off " : "work days ") : ""}${value(metric, latest.low)}–${value(metric, latest.high)}`;
  return {
    headline: `${NAMES[metric]} has been ${side} your usual range for ${reading.days.length} days: ${reading.days.map((day) => value(metric, day.value)).join(", ")}.`,
    basis: `Your usual range: ${ranges} — the middle 80% of your measured days before these${metric === "steps" ? ", by kind of day" : ""}. A pattern in your own records, not a diagnosis or a cause.`,
  };
}
