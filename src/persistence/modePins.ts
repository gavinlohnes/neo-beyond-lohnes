/**
 * COMMAND-CENTER-001: a mode pin is placement only — it picks which phase rows
 * TODAY shows, never what BEYOND recommends — so it is UI bookkeeping in
 * localStorage keyed by BeyondDay id, like shiftHandoffSkips.ts. Not an event,
 * not in backups. A new day (16:30 roll or START DAY) has its own key and so
 * starts on schedule; END DAY clears the old day's key explicitly.
 */
const PIN_KEY_PREFIX = "beyond:modePin:";

export const MODE_PIN_PHASES = ["PRE_WORK", "SCHEDULED_SHIFT", "EXPECTED_POST_WORK", "OFF"] as const;
export type ModePinPhase = (typeof MODE_PIN_PHASES)[number];

export function readModePin(beyondDayId: string): ModePinPhase | null {
  try {
    const value = localStorage.getItem(PIN_KEY_PREFIX + beyondDayId);
    return (MODE_PIN_PHASES as readonly string[]).includes(value ?? "") ? (value as ModePinPhase) : null;
  } catch {
    return null;
  }
}

export function writeModePin(beyondDayId: string, phase: ModePinPhase | null): void {
  try {
    if (phase === null) localStorage.removeItem(PIN_KEY_PREFIX + beyondDayId);
    else localStorage.setItem(PIN_KEY_PREFIX + beyondDayId, phase);
  } catch {
    // Storage unavailable: the pin simply doesn't hold. The schedule still drives TODAY.
  }
}
