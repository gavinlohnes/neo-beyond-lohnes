import type { SystemStatus, SystemStatusFact } from "../../../application/systemStatus";
import { describeReason } from "./capacityCopy";

/**
 * STATUS-001: TODAY's System Status line in words, e.g. "AMBER · 5h sleep,
 * 3 hard sessions in 4 days". A text label always leads (never color
 * alone); facts only, no judgment words.
 */
export function formatSleepFact(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h sleep` : `${h}h ${m}m sleep`;
}

export function describeStatusFact(fact: SystemStatusFact): string {
  switch (fact.kind) {
    case "SLEEP":
      return formatSleepFact(fact.minutes);
    case "CHECK_IN":
      return fact.capacity === "GREEN" ? "check-in clear" : fact.reasonCodes.map(describeReason).join(", ");
    case "LOAD":
      return `${fact.sessions} hard ${fact.sessions === 1 ? "session" : "sessions"} in ${fact.days} days`;
  }
}

export function describeSystemStatus(status: SystemStatus): string {
  if (status.level === "NO_READ") return "NO READ · log sleep or check in";
  return `${status.level} · ${status.facts.map(describeStatusFact).join(", ")}`;
}
