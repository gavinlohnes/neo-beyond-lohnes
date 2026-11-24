/**
 * GRAYSON-TRAIN-REST-001 (Gavin, 2026-11-24): the buzz when rest reaches zero. Separate from feedback.ts on purpose:
 * a longer pattern than the 10–35 ms save pulses, and it still fires when the phone asks for reduced motion (a
 * vibration isn't on-screen motion, and this is the alert he chose; the switch is how he silences it).
 * Best effort: a missing or throwing navigator.vibrate is harmless.
 */
import type { RestBuzzStrength } from "../../application/restBuzzQueries";

export const REST_BUZZ_PATTERNS: Record<RestBuzzStrength, number[]> = { SHORT: [200, 100, 200], LONG: [400, 150, 400] };
/** A crossing seen later than this (screen was off, app closed) doesn't buzz late. */
export const REST_BUZZ_LATE_MS = 3000;

export function restEndBuzz(strength: RestBuzzStrength): void {
  try { navigator.vibrate?.(REST_BUZZ_PATTERNS[strength]); } catch { /* best effort */ }
}

/**
 * Once per rest end: buzz when this end has been reached, was seen within REST_BUZZ_LATE_MS of it, with TRAIN
 * visible, the switch on, and this exact end not buzzed before. A skipped rest has no end, so it never buzzes;
 * +15 s after zero is a new end, so it buzzes once more.
 */
export function shouldBuzzRestEnd(input: {
  endsAt: string | null | undefined;
  nowMs: number;
  lastBuzzedEnd: string | null;
  visible: boolean;
  enabled: boolean;
}): boolean {
  if (!input.enabled || !input.visible || !input.endsAt || input.endsAt === input.lastBuzzedEnd) return false;
  const endMs = Date.parse(input.endsAt);
  if (!Number.isFinite(endMs)) return false;
  const late = input.nowMs - endMs;
  return late >= 0 && late <= REST_BUZZ_LATE_MS;
}
