/** Placement-only UI bookkeeping, keyed by BeyondDay. Never an event or backup record. */
const PIN_KEY_PREFIX = "beyond:modePin:";

export const MODE_PIN_PHASES = ["PRE_WORK", "SCHEDULED_SHIFT", "EXPECTED_POST_WORK", "OFF"] as const;
export type ModePinPhase = (typeof MODE_PIN_PHASES)[number];
export interface StoredModePin { phase: ModePinPhase; pinnedAt?: number; }

export function readModePin(beyondDayId: string): StoredModePin | null {
  try {
    const raw = localStorage.getItem(PIN_KEY_PREFIX + beyondDayId);
    if (raw === null) return null;
    // The released format had only a phase. Application uses the recorded
    // day's start as its conservative expiry origin, without inventing a pick time.
    if ((MODE_PIN_PHASES as readonly string[]).includes(raw)) return { phase: raw as ModePinPhase };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("phase" in value) || !("pinnedAt" in value)) return null;
    if (!(MODE_PIN_PHASES as readonly unknown[]).includes(value.phase) || typeof value.pinnedAt !== "number" || !Number.isFinite(value.pinnedAt)) return null;
    return { phase: value.phase as ModePinPhase, pinnedAt: value.pinnedAt };
  } catch {
    return null;
  }
}

export function writeModePin(beyondDayId: string, phase: ModePinPhase | null, pinnedAt?: number): void {
  try {
    if (phase === null) localStorage.removeItem(PIN_KEY_PREFIX + beyondDayId);
    else localStorage.setItem(PIN_KEY_PREFIX + beyondDayId, JSON.stringify({ phase, pinnedAt }));
  } catch {
    // Storage unavailable: canonical operation remains available.
  }
}
