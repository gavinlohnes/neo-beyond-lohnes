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
  const boundary = Number.isFinite(pickedAt) ? nextRolloverBoundaryAfter(new Date(pickedAt)).getTime() : -Infinity;
  if (now.getTime() < boundary) return pin.phase;
  // Only the real clock deletes: a caller holding a time captured before a slow read must not erase a
  // pin that is still live (the ModePinExpiry full-suite flake that stopped the #296 deploy).
  if (Date.now() >= boundary) clearModePin(beyondDayId);
  return null;
}

export function setModePin(beyondDayId: string, phase: ModePinPhase | null): void {
  writeModePin(beyondDayId, phase, Date.now());
}

export function clearModePin(beyondDayId: string): void {
  writeModePin(beyondDayId, null);
}
