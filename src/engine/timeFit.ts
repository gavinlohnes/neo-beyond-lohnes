/**
 * TIME-FIT (Drop 2, Shift Clock, owner brief 2026-10-03): how long a
 * template + variant usually takes, from the operator's own finished
 * sessions. Pure and read-only — a display estimate only, never an input to
 * any suggestion (choosing a variant by time is explicitly deferred).
 *
 * NO_FAKE_PRECISION: no estimate until there are at least
 * TIME_FIT_MIN_SESSIONS COMPLETED sessions of that exact template + variant.
 * The estimate is the median of the most recent TIME_FIT_RECENT_SESSIONS of
 * them, in whole minutes — recent sessions, so it follows how training goes
 * now; the median, so one long or interrupted session doesn't drag it.
 */
export const TIME_FIT_MIN_SESSIONS = 3;
export const TIME_FIT_RECENT_SESSIONS = 5;

export interface TimeFitSession {
  templateId: string;
  sessionType: string;
  status: string;
  startedAt: string;
  endedAt?: string;
}

export function estimateSessionMinutes(
  sessions: readonly TimeFitSession[],
  templateId: string,
  sessionType: string,
): number | undefined {
  const minutes = sessions
    .filter((s) => s.templateId === templateId && s.sessionType === sessionType && s.status === "COMPLETED" && s.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, TIME_FIT_RECENT_SESSIONS)
    .map((s) => (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 60_000)
    .sort((a, b) => a - b);
  if (minutes.length < TIME_FIT_MIN_SESSIONS) return undefined;
  const mid = Math.floor(minutes.length / 2);
  const median = minutes.length % 2 === 1 ? minutes[mid]! : (minutes[mid - 1]! + minutes[mid]!) / 2;
  return Math.round(median);
}
