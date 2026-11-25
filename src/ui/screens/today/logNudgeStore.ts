import { DEFAULT_LOG_NUDGE, NUDGE_DELAY_MAX, NUDGE_DELAY_MIN, NUDGE_KINDS, NUDGE_MAX_TIMES, type LogNudgeSettings } from "../../../application/logNudge";

/**
 * GRAYSON-LOG-NUDGE-001: his logging-nudge settings (travel with the backup as "Logging nudge") and today's NOT NOW
 * answers (this phone only). A convenience, not a record: nothing here is written to history.
 */
export const LOG_NUDGE_KEY = "beyond.logNudge.v1";
const DISMISSED = "beyond.logNudge.dismissed.v1";

const okMinute = (m: unknown): m is number => typeof m === "number" && Number.isInteger(m) && m >= 0 && m < 1440;

export function readLogNudgeSettings(): LogNudgeSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_NUDGE_KEY) ?? "null") as Partial<LogNudgeSettings> | null;
    if (!raw || typeof raw !== "object") return { ...DEFAULT_LOG_NUDGE, edited: {} };
    const delay = typeof raw.delayMinutes === "number" && Number.isFinite(raw.delayMinutes)
      ? Math.min(NUDGE_DELAY_MAX, Math.max(NUDGE_DELAY_MIN, Math.round(raw.delayMinutes))) : DEFAULT_LOG_NUDGE.delayMinutes;
    const edited: LogNudgeSettings["edited"] = {};
    for (const kind of NUDGE_KINDS) {
      const list = raw.edited?.[kind];
      if (Array.isArray(list)) edited[kind] = [...new Set(list.filter(okMinute))].sort((a, b) => a - b).slice(0, NUDGE_MAX_TIMES);
    }
    return { enabled: raw.enabled !== false, delayMinutes: delay, edited };
  } catch { return { ...DEFAULT_LOG_NUDGE, edited: {} }; }
}
export function writeLogNudgeSettings(next: LogNudgeSettings): void {
  try { localStorage.setItem(LOG_NUDGE_KEY, JSON.stringify(next)); } catch { /* not remembered */ }
}

/** The usual times he said NOT NOW to on this lived day. Another day's answers are ignored. */
export function readNudgeDismissed(dayId: string): Set<number> {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISSED) ?? "null") as { dayId?: unknown; minutes?: unknown } | null;
    return raw && raw.dayId === dayId && Array.isArray(raw.minutes) ? new Set(raw.minutes.filter(okMinute)) : new Set();
  } catch { return new Set(); }
}
export function dismissNudge(dayId: string, minute: number): void {
  const minutes = [...readNudgeDismissed(dayId), minute];
  try { localStorage.setItem(DISMISSED, JSON.stringify({ dayId, minutes })); } catch { /* not remembered; offered once more */ }
}
