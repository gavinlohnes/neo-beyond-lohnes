/**
 * Harvest Checkpoint 2: TODAY presentation policy. Pure, presentation-only
 * classification of already-known application state into presentation
 * placement — DOMINANT / ATTENTION / SUPPORT, including an intentionally
 * quiet state and an explicit degraded state for incompatible foreground
 * operations. This module decides
 * nothing about what BEYOND recommends (that's engine/evaluate.ts) and
 * nothing about what's true (that's application/queries.ts) — it only
 * decides how much visual weight already-known information deserves.
 *
 * Hard constraints, enforced by construction:
 * - No persistence writes, no I/O of any kind.
 * - No new domain facts — every input here is something TodayScreen
 *   already computes from a real query result.
 * - No change to Engine/recommendation priority. Notably, an unresolved
 *   post-shift transition is deliberately NOT modeled as its own ATTENTION
 *   candidate here — engine/evaluate.ts already promotes it to the
 *   Engine's own POST_SHIFT_TRANSITION recommendation (which becomes the
 *   DOMINANT surface via the ordinary recommendation path), so a second,
 *   separate attention slot for the same fact would be presentation-layer
 *   duplication of a decision the Engine already made, not new relevance.
 *   WORK_END_AVAILABLE is earlier and distinct: it only exposes the
 *   operator-owned MARK WORK ENDED action before that transition exists.
 * - No historical inference — every input is either "is this active right
 *   now" or "did an existing query already say this is true," never a
 *   guess about the past.
 */

export type DominantSurface =
  | "RECOMMENDATION"
  | "RESET_ACTIVE"
  | "SHIFT_DOWN_ACTIVE"
  | "OPERATION_CONFLICT"
  | "NONE";

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
export type AttentionItem =
  | "RECOMMENDATION_UNRESOLVED"
  | "END_DAY_SUGGESTED"
  | "WORK_END_AVAILABLE"
  | "COMMITMENT_DUE"
  | "CHECK_IN_MISSING"
  | "MINIMUM_DAY_PROMINENT"
  | "PENDING_OUTCOME"
  | "CAPTURE_UNRESOLVED";

export type RecommendationPlacement = "DOMINANT" | "ATTENTION" | "SUPPORT";

export interface AttentionInput {
  /** Non-null exactly when a RESET is genuinely in progress (getOpenReset). */
  activeResetId: string | null;
  /** Non-null exactly when a SHIFT DOWN is genuinely in progress (getOpenShiftDown). */
  activeShiftDownId: string | null;
  /** Current Engine output, reduced to the presentation facts this policy needs. */
  recommendationKind: string | null;
  recommendationSuggestedCommand: string | null;
  /** shouldSuggestEndDay's result — primary sleep logged, day not yet ended. */
  suggestEndDay: boolean;
  /** getPendingOutcomeRating returned something to rate, and it hasn't been dismissed. */
  hasPendingOutcome: boolean;
  /** getOpenCaptureItems().length > 0. */
  hasUnresolvedCapture: boolean;
  /** hasObligationRequiringAttention(unresolvedObligations, today) — see AttentionItem's doc comment. */
  hasCommitmentDue: boolean;
  /** WORK is confirmed and the operator has not yet marked the period ended. */
  hasWorkEndAvailable: boolean;
  /** No State Check-In has been recorded for the active BeyondDay. */
  isCheckInMissing: boolean;
  /** Existing Minimum Day copy policy says the constrained offer should be prominent. */
  isMinimumDayProminent: boolean;
}

export interface AttentionPlan {
  dominant: DominantSurface;
  recommendationPlacement: RecommendationPlacement;
  /** Earned, ordered, capped at ATTENTION_MAX — never invent a slot that isn't backed by a true input. */
  attention: AttentionItem[];
}

/** "Maximum target: two compact attention items simultaneously" (Harvest Checkpoint 2). */
export const ATTENTION_MAX = 2;

/**
 * Active mode dominates passive suggestion: a genuinely in-progress
 * SHIFT DOWN or RESET owns the execution field. If both are somehow
 * active, neither silently wins: the policy reports a degraded conflict
 * so the operator can resolve canonical state explicitly.
 */
export function deriveDominantSurface(
  input: Pick<AttentionInput, "activeResetId" | "activeShiftDownId" | "recommendationKind">,
): DominantSurface {
  if (input.activeShiftDownId !== null && input.activeResetId !== null) return "OPERATION_CONFLICT";
  if (input.activeShiftDownId !== null) return "SHIFT_DOWN_ACTIVE";
  if (input.activeResetId !== null) return "RESET_ACTIVE";
  if (input.recommendationKind && input.recommendationKind !== "NO_ACTION_REQUIRED") return "RECOMMENDATION";
  return "NONE";
}

function activeOperationFulfillsRecommendation(input: AttentionInput): boolean {
  if (input.activeShiftDownId !== null && input.recommendationSuggestedCommand === "START_SHIFT_DOWN") return true;
  if (input.activeResetId !== null && input.recommendationSuggestedCommand === "START_RESET") return true;
  return false;
}

/**
 * Priority among ATTENTION candidates, used only when more than
 * ATTENTION_MAX are true at once:
 *   1. Unrelated Engine guidance — still consequential, though an active
 *      operation retains the field.
 *   2. END_DAY_SUGGESTED — a real, time-sensitive domain signal (primary
 *      sleep already logged); the day is objectively likely over.
 *   3. Work-end availability, then COMMITMENT_DUE — explicit current or
 *      due state that the operator may otherwise miss.
 *   4. Missing check-in / prominent Minimum Day — state support backed by
 *      current day/capacity truth, never manufactured urgency.
 *   5. PENDING_OUTCOME — explicit, lightweight, backward-looking feedback;
 *      worth surfacing before it's forgotten, but nothing else depends on it.
 *   6. CAPTURE_UNRESOLVED — deliberately last: Capture's own doctrine is
 *      "inbox age is not urgency," so if attention is genuinely scarce,
 *      Capture is the one that waits. It never disappears — it's always
 *      reachable in SUPPORT either way.
 */
export function deriveAttentionPlan(input: AttentionInput): AttentionPlan {
  const dominant = deriveDominantSurface(input);
  const hasActiveOperation = input.activeResetId !== null || input.activeShiftDownId !== null;
  const actionableRecommendation = input.recommendationKind !== null && input.recommendationKind !== "NO_ACTION_REQUIRED";
  const recommendationPlacement: RecommendationPlacement =
    dominant === "RECOMMENDATION"
      ? "DOMINANT"
      : hasActiveOperation && actionableRecommendation && !activeOperationFulfillsRecommendation(input)
        ? "ATTENTION"
        : "SUPPORT";

  const candidates: AttentionItem[] = [];
  if (recommendationPlacement === "ATTENTION") candidates.push("RECOMMENDATION_UNRESOLVED");
  if (input.suggestEndDay) candidates.push("END_DAY_SUGGESTED");
  if (input.hasWorkEndAvailable) candidates.push("WORK_END_AVAILABLE");
  if (input.hasCommitmentDue) candidates.push("COMMITMENT_DUE");
  if (input.isCheckInMissing) candidates.push("CHECK_IN_MISSING");
  if (input.isMinimumDayProminent) candidates.push("MINIMUM_DAY_PROMINENT");
  if (input.hasPendingOutcome) candidates.push("PENDING_OUTCOME");
  if (input.hasUnresolvedCapture) candidates.push("CAPTURE_UNRESOLVED");

  return { dominant, recommendationPlacement, attention: candidates.slice(0, ATTENTION_MAX) };
}

export function isInAttention(plan: AttentionPlan, item: AttentionItem): boolean {
  return plan.attention.includes(item);
}
