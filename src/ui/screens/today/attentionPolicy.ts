/**
 * Harvest Checkpoint 2: TODAY presentation policy. Pure, presentation-only
 * classification of already-known application state into three visual
 * attention tiers — DOMINANT / ATTENTION / AVAILABLE. This module decides
 * nothing about what BEYOND recommends (that's engine/evaluate.ts) and
 * nothing about what's true (that's application/queries.ts) — it only
 * decides how much visual weight already-known information deserves.
 *
 * Hard constraints, enforced by construction:
 * - No persistence writes, no I/O of any kind.
 * - No new domain facts — every input here is something TodayScreen
 *   already computes from a real query result.
 * - No change to Engine/recommendation priority. Notably, an unresolved
 *   work transition is deliberately NOT modeled as its own ATTENTION
 *   candidate here — engine/evaluate.ts already promotes it to the
 *   Engine's own POST_SHIFT_TRANSITION recommendation (which becomes the
 *   DOMINANT surface via the ordinary recommendation path), so a second,
 *   separate attention slot for the same fact would be presentation-layer
 *   duplication of a decision the Engine already made, not new relevance.
 * - No historical inference — every input is either "is this active right
 *   now" or "did an existing query already say this is true," never a
 *   guess about the past.
 */

export type DominantSurface = "RECOMMENDATION" | "RESET_ACTIVE" | "SHIFT_DOWN_ACTIVE";

/**
 * Ordered by priority for the (rare) case more than ATTENTION_MAX
 * candidates are true simultaneously — see deriveAttentionPlan's doc
 * comment for the reasoning behind this specific order.
 *
 * COMMITMENT_DUE (Intent & Commitment Spine, Drop 02, temporal
 * corrections binding 2026-08-22): true only when
 * engine/obligationRelevance.ts's hasObligationRequiringAttention says an
 * unresolved Obligation is OVERDUE, DUE_TODAY, DUE_SOON, or PLANNED_TODAY
 * — never for a merely WAITING or QUIET one. This is a second, orthogonal
 * domain (Obligations) earning the same scarce ATTENTION budget Capture/
 * end-day/outcome already compete for; it does not change what the
 * Engine recommends (engine/evaluate.ts has no knowledge of Obligations
 * at all, by design).
 */
export type AttentionItem = "END_DAY_SUGGESTED" | "COMMITMENT_DUE" | "PENDING_OUTCOME" | "CAPTURE_UNRESOLVED";

export interface AttentionInput {
  /** Non-null exactly when a RESET is genuinely in progress (getOpenReset). */
  activeResetId: string | null;
  /** Non-null exactly when a SHIFT DOWN is genuinely in progress (getOpenShiftDown). */
  activeShiftDownId: string | null;
  /** shouldSuggestEndDay's result — primary sleep logged, day not yet ended. */
  suggestEndDay: boolean;
  /** getPendingOutcomeRating returned something to rate, and it hasn't been dismissed. */
  hasPendingOutcome: boolean;
  /** getOpenCaptureItems().length > 0. */
  hasUnresolvedCapture: boolean;
  /** hasObligationRequiringAttention(unresolvedObligations, today) — see AttentionItem's doc comment. */
  hasCommitmentDue: boolean;
}

export interface AttentionPlan {
  dominant: DominantSurface;
  /** Earned, ordered, capped at ATTENTION_MAX — never invent a slot that isn't backed by a true input. */
  attention: AttentionItem[];
}

/** "Maximum target: two compact attention items simultaneously" (Harvest Checkpoint 2). */
export const ATTENTION_MAX = 2;

/**
 * Active mode dominates passive suggestion: a genuinely in-progress
 * SHIFT DOWN or RESET owns the dominant execution surface over the
 * recommendation that led to it — the recommendation already served its
 * purpose once the user acted on it. SHIFT DOWN wins over RESET if both
 * were somehow simultaneously active (matches the existing Overdrive
 * Phase 18 ordering — this policy formalizes what TodayScreen already
 * derived ad hoc into one pure, tested function).
 */
export function deriveDominantSurface(input: Pick<AttentionInput, "activeResetId" | "activeShiftDownId">): DominantSurface {
  if (input.activeShiftDownId !== null) return "SHIFT_DOWN_ACTIVE";
  if (input.activeResetId !== null) return "RESET_ACTIVE";
  return "RECOMMENDATION";
}

/**
 * Priority among ATTENTION candidates, used only when more than
 * ATTENTION_MAX are true at once:
 *   1. END_DAY_SUGGESTED — a real, time-sensitive domain signal (primary
 *      sleep already logged); the day is objectively likely over.
 *   2. COMMITMENT_DUE (Drop 02) — a genuinely due/overdue/operator-planned
 *      commitment is real forward-looking risk of something being missed,
 *      ranked above the purely backward-looking outcome-rating nudge.
 *   3. PENDING_OUTCOME — explicit, lightweight, backward-looking feedback;
 *      worth surfacing before it's forgotten, but nothing else depends on it.
 *   4. CAPTURE_UNRESOLVED — deliberately last: Capture's own doctrine is
 *      "inbox age is not urgency," so if attention is genuinely scarce,
 *      Capture is the one that waits. It never disappears — it's always
 *      reachable in AVAILABLE either way.
 */
export function deriveAttentionPlan(input: AttentionInput): AttentionPlan {
  const dominant = deriveDominantSurface(input);

  const candidates: AttentionItem[] = [];
  if (input.suggestEndDay) candidates.push("END_DAY_SUGGESTED");
  if (input.hasCommitmentDue) candidates.push("COMMITMENT_DUE");
  if (input.hasPendingOutcome) candidates.push("PENDING_OUTCOME");
  if (input.hasUnresolvedCapture) candidates.push("CAPTURE_UNRESOLVED");

  return { dominant, attention: candidates.slice(0, ATTENTION_MAX) };
}

export function isInAttention(plan: AttentionPlan, item: AttentionItem): boolean {
  return plan.attention.includes(item);
}
