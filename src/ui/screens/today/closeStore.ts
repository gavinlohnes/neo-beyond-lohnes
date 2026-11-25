import { CLOSE_GAP_WEIGH_MAX, CLOSE_GAP_WEIGH_MIN, CLOSE_PROMPTS, DEFAULT_CLOSE_GAPS, DEFAULT_CLOSE_PROMPTS, MAX_CLOSE_PROMPTS, type CloseGapSettings, type ClosePromptId } from "../../../application/dayClose";

/**
 * GRAYSON C1.3: his close settings and whether today's close is done, kept on this device only. A convenience, not a
 * record: the answers themselves are saved to the Daily Note. Losing this only means the defaults and one more offer.
 */
const PROMPTS = "beyond.close.prompts.v1";
const DONE = "beyond.close.done.v1";

export function readClosePrompts(): ClosePromptId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PROMPTS) ?? "null") as unknown;
    if (Array.isArray(raw)) {
      const ids = raw.filter((id): id is ClosePromptId => typeof id === "string" && id in CLOSE_PROMPTS).slice(0, MAX_CLOSE_PROMPTS);
      if (ids.length > 0) return ids;
    }
  } catch { /* defaults */ }
  return [...DEFAULT_CLOSE_PROMPTS];
}
export function writeClosePrompts(ids: readonly ClosePromptId[]): void {
  try { localStorage.setItem(PROMPTS, JSON.stringify(ids.slice(0, MAX_CLOSE_PROMPTS))); } catch { /* not remembered */ }
}
export function closeDone(dayId: string): boolean {
  try { return localStorage.getItem(DONE) === dayId; } catch { return false; }
}
export function markCloseDone(dayId: string): void {
  try { localStorage.setItem(DONE, dayId); } catch { /* not remembered; offered once more */ }
}

/** GRAYSON LOG-CATCHUP-001: whether tonight's catch-up was answered or skipped, on this device only. */
const CATCH_UP_DONE = "beyond.catchup.done.v1";
export function catchUpDone(dayId: string): boolean {
  try { return localStorage.getItem(CATCH_UP_DONE) === dayId; } catch { return false; }
}
export function markCatchUpDone(dayId: string): void {
  try { localStorage.setItem(CATCH_UP_DONE, dayId); } catch { /* not remembered; offered once more */ }
}

/** GRAYSON-CARRY-001: "Show 'Didn't get to' at the close", on by default. Travels with the backup ("Evening close carry"). */
const CARRY = "beyond.close.carry.v1";
export function readCloseCarryOn(): boolean {
  try { return (JSON.parse(localStorage.getItem(CARRY) ?? "null") as { enabled?: unknown } | null)?.enabled !== false; } catch { return true; }
}
export function writeCloseCarryOn(enabled: boolean): void {
  try { localStorage.setItem(CARRY, JSON.stringify({ enabled })); } catch { /* not remembered */ }
}

/** GRAYSON-CLOSE-GAPS-001: "Tell me what's missing" and the weigh-in gap. Travels with the backup ("Evening close gaps"). */
const GAPS = "beyond.close.gaps.v1";
export function readCloseGapSettings(): CloseGapSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(GAPS) ?? "null") as Partial<CloseGapSettings> | null;
    if (raw && typeof raw === "object") {
      const days = typeof raw.weighGapDays === "number" && Number.isFinite(raw.weighGapDays)
        ? Math.min(CLOSE_GAP_WEIGH_MAX, Math.max(CLOSE_GAP_WEIGH_MIN, Math.round(raw.weighGapDays))) : DEFAULT_CLOSE_GAPS.weighGapDays;
      return { enabled: raw.enabled !== false, weighGapDays: days };
    }
  } catch { /* defaults */ }
  return { ...DEFAULT_CLOSE_GAPS };
}
export function writeCloseGapSettings(next: CloseGapSettings): void {
  try { localStorage.setItem(GAPS, JSON.stringify(next)); } catch { /* not remembered */ }
}
