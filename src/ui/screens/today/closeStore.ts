import { CLOSE_PROMPTS, DEFAULT_CLOSE_PROMPTS, MAX_CLOSE_PROMPTS, type ClosePromptId } from "../../../application/dayClose";

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
