import type { WeekAheadDay } from "./weekAheadQueries";
import { livedDayOn } from "./workContextResolution";

/**
 * OPERATOR-EXPERIENCE-001: what changes next, read from Week Ahead's days (the shared RECORDED > CONFIRMED >
 * PREDICTED > UNKNOWN answer), for TODAY's operating-state band. Read only, never an Engine input, no advice: it names
 * the next switch between work and off within the week, and says where that came from. Only lived days that haven't
 * started count (a lived day starts at 16:30 on its date), so at 09:00 tonight's shift is still "next".
 */
export interface AheadReading {
  /** One line, e.g. "Next shift: Wed, Nov 18 · 18:00 · forecast". */
  line: string;
  /** For WHY: where it came from, in plain words. */
  why: string;
  /** Confirmed changes in the coming days (one tap from TODAY to see, move or cancel them). */
  confirmed: number;
}

const day = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const hh = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const basisWord = (basis: WeekAheadDay["basis"]) => (basis === "CONFIRMED" ? "confirmed change" : basis === "PREDICTED" ? "forecast" : "recorded");
const basisWhy = (basis: WeekAheadDay["basis"]) => (basis === "CONFIRMED" ? "a schedule change you confirmed" : basis === "PREDICTED" ? "your saved schedule (a forecast, not a record)" : "what's recorded");

/** `current`: what today is (recorded, else planned); null when not known. */
export function deriveAhead(now: Date, current: "WORK" | "OFF" | null, days: readonly WeekAheadDay[]): AheadReading | null {
  const upcoming = days.filter((d) => livedDayOn(d.date).getTime() > now.getTime() && d.basis !== "WHAT_IF");
  if (!upcoming.length) return null;
  const known = upcoming.filter((d) => d.basis !== "UNKNOWN");
  if (!known.length) return { line: "Next days: work or off not known · no saved schedule", why: "Next: nothing is recorded or confirmed and there's no saved schedule, so BEYOND doesn't guess.", confirmed: 0 };
  const confirmed = known.filter((d) => d.basis === "CONFIRMED").length;
  const next = known.find((d) => current === null || d.work !== current);
  const extra = (shown: WeekAheadDay | undefined) => {
    const others = confirmed - (shown?.basis === "CONFIRMED" ? 1 : 0);
    return others > 0 ? ` · ${others} confirmed change${others > 1 ? "s" : ""} ahead` : "";
  };
  if (!next) {
    const what = current === "WORK" ? "work" : "off";
    return { line: `No switch in the next ${known.length} days · ${what} throughout${extra(undefined)}`, why: `Next: ${what} on each of the next ${known.length} days, from ${known.some((d) => d.basis === "CONFIRMED") ? "your saved schedule and confirmed changes" : basisWhy("PREDICTED")}.`, confirmed };
  }
  const what = next.work === "WORK" ? `Next shift: ${day(next.date)}${next.shiftStartHour !== null ? ` · ${hh(next.shiftStartHour)}` : ""}` : `Next day off: ${day(next.date)}`;
  return { line: `${what} · ${basisWord(next.basis)}${extra(next)}`, why: `Next: ${next.work === "WORK" ? "a work day" : "a day off"} on ${day(next.date)}, from ${basisWhy(next.basis)}.`, confirmed };
}
