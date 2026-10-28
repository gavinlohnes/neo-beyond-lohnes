import type { DomainEvent, LogRetimedPayload } from "../domain/common/types";
import { mostRecentBoundaryAtOrBefore, nextRolloverBoundaryAfter } from "../engine/dayRollover";

/**
 * LOG-TIME-001 (owner go 2026-10-28: "make it so I can edit the times … I prelog stuff too"; rules
 * "your call"): when a water, protein or meal log actually happened. A log may be entered with a time,
 * or moved later by LOG_RETIMED; the latest retime of a root wins. Any time inside the log's own lived
 * day is allowed, past or ahead (a pre-log). Totals count a log as they always have; everything placed
 * in time (pace, the brief, the after-action, the day and shift strips) reads this time.
 */
export function effectiveLogTimes(events: readonly DomainEvent[]): Map<string, string> {
  const times = new Map<string, string>();
  for (const e of events.filter((x) => x.type === "LOG_RETIMED").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))) {
    const p = e.payload as LogRetimedPayload;
    times.set(p.rootEventId, p.occurredAt);
  }
  return times;
}

/** The lived day a log may be placed in: from the day's 16:30 boundary to the next. */
export function logWindow(dayStartedAt: string): { start: Date; end: Date } {
  const started = new Date(dayStartedAt);
  return { start: mostRecentBoundaryAtOrBefore(started), end: nextRolloverBoundaryAfter(started) };
}

/** Throws unless `at` is a real instant inside the day's lived window. Returns it as ISO. */
export function checkLogTime(dayStartedAt: string, at: string): string {
  const t = Date.parse(at);
  if (!Number.isFinite(t)) throw new Error("LOG_TIME_INVALID: choose a real time.");
  const { start, end } = logWindow(dayStartedAt);
  if (t < start.getTime() || t >= end.getTime()) {
    throw new Error("LOG_TIME_OUTSIDE_DAY: a log can move only within its own day (16:30 to 16:30).");
  }
  return new Date(t).toISOString();
}

/** What the WHEN row on the water and meal sheets can say. */
export type WhenChoice = { kind: "NOW" } | { kind: "AGO"; minutes: number } | { kind: "AT"; hhmm: string };

/**
 * Pure: the instant a WHEN choice names inside this lived day, or undefined for now. "AT 02:00" on a
 * day that started at 16:30 means the 02:00 after midnight; "AT 17:10" means the evening it began.
 */
export function resolveWhen(choice: WhenChoice, dayStartedAt: string, now: Date): string | undefined {
  if (choice.kind === "NOW") return undefined;
  if (choice.kind === "AGO") return new Date(now.getTime() - choice.minutes * 60_000).toISOString();
  const [h, m] = choice.hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
  const { start } = logWindow(dayStartedAt);
  const at = new Date(start); at.setHours(h!, m!, 0, 0);
  if (at.getTime() < start.getTime()) at.setDate(at.getDate() + 1);
  return at.toISOString();
}
