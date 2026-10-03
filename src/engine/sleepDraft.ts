import type { Draft } from "../domain/intelligence/types";

/**
 * SLEEP DRAFT (owner approval, 2026-10-03). After a shift, BEYOND knows two
 * real instants: when the operator last did something (Shift Down or MARK
 * WORK ENDED, and nothing after it) and when they next opened the app. The
 * gap between them is an UPPER BOUND on main sleep — they can't have slept
 * longer, but they may have fallen asleep later — so the draft always reads
 * "up to". Pure; never writes anything (see Draft).
 *
 * Stays quiet (null) rather than guess when: there's no Shift Down / MARK
 * WORK ENDED to start from; anything else was done in BEYOND after it and
 * before this open; main sleep is already logged; or the gap is under
 * SLEEP_DRAFT_MIN_MINUTES or over SLEEP_DRAFT_MAX_MINUTES. The 12-hour cap
 * matches BODY's own plausible main-sleep range (2–12 h), so a one-tap
 * draft never proposes something BODY would question.
 */
export const SLEEP_DRAFT_MIN_MINUTES = 3 * 60;
export const SLEEP_DRAFT_MAX_MINUTES = 12 * 60;
/** The draft is rounded down to this many minutes — it's a bound, not a measurement. */
export const SLEEP_DRAFT_ROUND_MINUTES = 5;

export interface SleepDraftInput {
  /** The latest SHIFT_DOWN_COMPLETED or WORK_PERIOD_ENDED on this day, and which it was. */
  anchorAt: string | null;
  anchorKind: "SHIFT_DOWN" | "WORK_ENDED" | null;
  /** The latest thing the operator did on this day before this app open. */
  lastOperatorActionAt: string | null;
  /** When the app was last brought to the foreground. */
  openedAt: Date;
  mainSleepLogged: boolean;
}

export function deriveSleepDraft(input: SleepDraftInput): Draft<number> | null {
  if (input.mainSleepLogged || !input.anchorAt) return null;
  const anchor = new Date(input.anchorAt).getTime();
  if (input.lastOperatorActionAt && new Date(input.lastOperatorActionAt).getTime() > anchor) return null;
  const gapMinutes = (input.openedAt.getTime() - anchor) / 60_000;
  if (gapMinutes < SLEEP_DRAFT_MIN_MINUTES || gapMinutes > SLEEP_DRAFT_MAX_MINUTES) return null;
  const value = Math.floor(gapMinutes / SLEEP_DRAFT_ROUND_MINUTES) * SLEEP_DRAFT_ROUND_MINUTES;
  return {
    value,
    reason: `${input.anchorKind === "WORK_ENDED" ? "Work ended" : "Shift Down"} ${clock(new Date(anchor))} → opened ${clock(input.openedAt)}`,
    basis: [
      { key: "from", value: input.anchorAt },
      { key: "openedAt", value: input.openedAt.toISOString() },
      { key: "upperBoundMinutes", value },
    ],
  };
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
