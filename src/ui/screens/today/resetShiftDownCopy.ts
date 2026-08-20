import type { Recommendation } from "../../../domain/common/types";

/**
 * Phase 4 (guided RESET/SHIFT DOWN experience): pure copy/logic for both
 * tools, kept separate from TodayScreen so wording and the "is this the
 * actual recommendation right now" check are unit tested without a DOM.
 * Neither tool's persisted behavior changes here — this is presentation
 * and a UI-side classification of an already-issued Recommendation.
 */

/**
 * "BODY BEFORE STORY" is kept as the existing tagline, not replaced — this
 * just adds the sentence of real guidance a first-time user needs to
 * understand what it actually means and how to use it.
 */
export const RESET_EXPLANATION =
  "RESET is a short, body-first grounding routine — settle your body before untangling whatever story your mind is telling about right now. Choose how much you need: 1 is a light touch, 5 is fully immersive.";

export const SHIFT_DOWN_EXPLANATION =
  "SHIFT DOWN is a deliberate, timed wind-down — a stretch of minutes to come down out of high alert before doing anything else. Pick how long, then start when you're ready.";

/**
 * Product Experience Sprint, P3 (TODAY command-surface rebuild): the full
 * explanation above is the right depth once a tool is the actual
 * recommendation, active, or opened — but as an always-available, not-
 * currently-recommended option sitting near the primary recommendation
 * card, the full paragraph competed for attention (doc: "RESET and SHIFT
 * DOWN remain rapidly accessible... without competing with the primary
 * recommendation"). These one-line versions are what shows in that
 * collapsed state; tapping OPEN reveals the full card unchanged.
 */
export const RESET_EXPLANATION_SHORT = "A short, body-first grounding routine.";

export const SHIFT_DOWN_EXPLANATION_SHORT = "A deliberate, timed wind-down.";

/** Common duration choices, offered as taps; a custom value is still available for anything else. */
export const SHIFT_DOWN_DURATION_PRESETS = [5, 10, 15, 20, 30] as const;

/**
 * True only when this specific tool is what the Engine actually
 * recommended for the current situation (Recommendation.suggestedCommand,
 * engine/evaluate.ts) — not merely available as a self-directed option.
 * SHIFT DOWN is recommended via STABILIZE (RED capacity). RESET has no
 * suggestedCommand path in the locked engine today — evaluate.ts only
 * ever sets START_SHIFT_DOWN / RECOVERY_SESSION / START_WORKOUT / null —
 * so isPrimaryReset is written for correctness/forward-compatibility per
 * the instruction, but always evaluates false under the current rules.
 * Flagged explicitly in the Build Log rather than left as a silent no-op.
 */
export function isPrimaryShiftDown(recommendation: Recommendation | null): boolean {
  return recommendation?.suggestedCommand === "START_SHIFT_DOWN";
}

export function isPrimaryReset(recommendation: Recommendation | null): boolean {
  return recommendation?.suggestedCommand === "START_RESET";
}

export function describeResetInProgress(intensity: number): string {
  return `RESET in progress at intensity ${intensity}.`;
}

export function describeShiftDownInProgress(durationMinutes: number): string {
  return `SHIFT DOWN in progress — ${durationMinutes} minutes.`;
}

export type SessionOutcome = "COMPLETED" | "CANCELLED";

export function describeResetResult(outcome: SessionOutcome): string {
  return outcome === "COMPLETED" ? "RESET complete." : "RESET cancelled — no problem, start again anytime.";
}

export function describeShiftDownResult(outcome: SessionOutcome): string {
  return outcome === "COMPLETED"
    ? "SHIFT DOWN complete."
    : "SHIFT DOWN cancelled — no problem, start again anytime.";
}
