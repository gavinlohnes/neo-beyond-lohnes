/**
 * GRAYSON-SHIFTDOWN-TAPS-001: the cyclic-sigh pace. Two short breaths in (about 2 s, then 1 s), then a long, slow
 * breath out (about 6 s), repeated. After Balban et al., Cell Reports Medicine 2023. Pure, so the timing is tested.
 */
export type BreathPhase = "IN" | "IN_AGAIN" | "OUT";
export const BREATH_IN_MS = 2000;
export const BREATH_IN_AGAIN_MS = 1000;
export const BREATH_OUT_MS = 6000;
export const BREATH_CYCLE_MS = BREATH_IN_MS + BREATH_IN_AGAIN_MS + BREATH_OUT_MS;
export const BREATH_WORDS: Record<BreathPhase, string> = { IN: "in", IN_AGAIN: "in again", OUT: "out, slowly" };

/** The phase at `elapsedMs` since the start, with its progress 0..1. Negative or non-finite times read as the start. */
export function breathPhaseAt(elapsedMs: number): { phase: BreathPhase; progress: number } {
  const ms = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs % BREATH_CYCLE_MS : 0;
  if (ms < BREATH_IN_MS) return { phase: "IN", progress: ms / BREATH_IN_MS };
  if (ms < BREATH_IN_MS + BREATH_IN_AGAIN_MS) return { phase: "IN_AGAIN", progress: (ms - BREATH_IN_MS) / BREATH_IN_AGAIN_MS };
  return { phase: "OUT", progress: Math.min(1, (ms - BREATH_IN_MS - BREATH_IN_AGAIN_MS) / BREATH_OUT_MS) };
}

/** The ring's size for a phase: it grows on the two breaths in and shrinks on the long breath out. */
export function ringScale(p: { phase: BreathPhase; progress: number }): number {
  if (p.phase === "IN") return 0.6 + 0.3 * p.progress;
  if (p.phase === "IN_AGAIN") return 0.9 + 0.1 * p.progress;
  return 1 - 0.4 * p.progress;
}
