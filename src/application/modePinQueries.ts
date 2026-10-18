import { nextRolloverBoundaryAfter } from "../engine/dayRollover";
import { readModePin, writeModePin, type ModePinPhase } from "../persistence/modePins";

/** Placement only; never read by Engine, recommendation, Attention or System Status. */
export type { ModePinPhase };

export function getModePin(beyondDayId: string, dayStartedAt?: string, now: Date = new Date()): ModePinPhase | null {
  const pin = readModePin(beyondDayId);
  if (!pin) return null;
  const pickedAt = pin.pinnedAt ?? Date.parse(dayStartedAt ?? "");
  // Calendar boundary math stays authoritative across DST and timezone changes.
  // A retained workout day must not extend the presentation pin's lifetime.
  if (Number.isFinite(pickedAt) && now.getTime() < nextRolloverBoundaryAfter(new Date(pickedAt)).getTime()) return pin.phase;
  clearModePin(beyondDayId);
  return null;
}

export function setModePin(beyondDayId: string, phase: ModePinPhase | null): void {
  writeModePin(beyondDayId, phase, Date.now());
}

export function clearModePin(beyondDayId: string): void {
  writeModePin(beyondDayId, null);
}
