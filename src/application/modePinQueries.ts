import { readModePin, writeModePin, type ModePinPhase } from "../persistence/modePins";

/**
 * COMMAND-CENTER-001: the TODAY mode pin, routed through application/ like
 * every other UI read. Placement only: nothing here is read by the Engine,
 * the recommendation, Attention or System Status.
 */
export type { ModePinPhase };

export function getModePin(beyondDayId: string): ModePinPhase | null {
  return readModePin(beyondDayId);
}

export function setModePin(beyondDayId: string, phase: ModePinPhase | null): void {
  writeModePin(beyondDayId, phase);
}

export function clearModePin(beyondDayId: string): void {
  writeModePin(beyondDayId, null);
}
