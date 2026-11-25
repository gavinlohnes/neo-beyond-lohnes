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
  | "WORKOUT_ACTIVE"
  | "RESET_ACTIVE"
  | "SHIFT_DOWN_ACTIVE"
  | "HYDRATION_ACTIVE"
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
  /** Non-null exactly when getActiveWorkoutSession finds a canonical ACTIVE session. */
  activeWorkoutId: string | null;
  /** Session kind only identifies whether the workout already fulfills Engine guidance. */
  activeWorkoutType: string | null;
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
  /** Operator explicitly opened the existing Minimum Day hydration control. */
  isHydrationOperationOpen?: boolean;
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
 * Canonical active work dominates every passive suggestion and any
 * explicitly opened hydration control. If canonical operations overlap,
 * none silently wins: the policy reports a degraded conflict so the
 * operator can resolve canonical state explicitly. With no canonical
 * operation active, the operator-opened hydration control owns the field
 * ahead of passive Engine guidance without changing that guidance.
 */
export function deriveDominantSurface(
  input: Pick<
    AttentionInput,
    "activeWorkoutId" | "activeResetId" | "activeShiftDownId" | "recommendationKind" | "isHydrationOperationOpen"
  >,
): DominantSurface {
  const activeOperationCount = [input.activeWorkoutId, input.activeResetId, input.activeShiftDownId]
    .filter((id) => id !== null).length;
  if (activeOperationCount > 1) return "OPERATION_CONFLICT";
  if (input.activeWorkoutId !== null) return "WORKOUT_ACTIVE";
  if (input.activeShiftDownId !== null) return "SHIFT_DOWN_ACTIVE";
  if (input.activeResetId !== null) return "RESET_ACTIVE";
  if (input.isHydrationOperationOpen) return "HYDRATION_ACTIVE";
  if (input.recommendationKind && input.recommendationKind !== "NO_ACTION_REQUIRED") return "RECOMMENDATION";
  return "NONE";
}

function activeOperationFulfillsRecommendation(input: AttentionInput): boolean {
  if (
    input.activeWorkoutId !== null &&
    ((input.activeWorkoutType === "RECOVERY" && input.recommendationSuggestedCommand === "RECOVERY_SESSION") ||
      (input.activeWorkoutType !== "RECOVERY" && input.recommendationSuggestedCommand === "START_WORKOUT"))
  ) return true;
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
  const hasActiveOperation =
    input.activeWorkoutId !== null ||
    input.activeResetId !== null ||
    input.activeShiftDownId !== null ||
    input.isHydrationOperationOpen;
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

/**
 * GRAYSON-TODAY-CALM-001 (C9.6, Gavin 2026-11-24): TODAY's quiet lines get the same kind of budget its cards have.
 * A quiet line is a one-line note or one-button row that is not the hero, the next-action card, an operation, the
 * numbers or an error. At most `max` show at once (default QUIET_MAX), in his order; the rest wait behind one
 * "N MORE" tap. Errors and his own just-made actions (the signal line, the SYNC GARMIN result) are never quiet lines.
 *
 * Future rule: a new TODAY note is a new `QuietLineId` with a default place in QUIET_LINE_DEFAULT_ORDER, never a new
 * block in TodayScreen.tsx. Each brief says which place it takes.
 *
 * Pure: no I/O. Each line's own existing condition decides whether it is a candidate; this only budgets and orders.
 */
export type QuietLineId =
  | "DRIVE_HOME"
  | "FIRST_AT_HOME"
  | "LOG_NUDGE"
  | "PHONE_ALERTS_BEHIND"
  | "ROUTINE"
  | "EXPERIMENT"
  | "REVIEW"
  | "WORK_DUE";

export const QUIET_LINE_DEFAULT_ORDER: readonly QuietLineId[] = [
  "DRIVE_HOME", "FIRST_AT_HOME", "LOG_NUDGE", "PHONE_ALERTS_BEHIND", "ROUTINE", "EXPERIMENT", "REVIEW", "WORK_DUE",
];

export const QUIET_MAX = 2;
export const QUIET_MAX_CHOICES = [1, 2, 3] as const;
export type QuietMax = (typeof QUIET_MAX_CHOICES)[number];

export interface QuietLineSettings {
  /** How many quiet lines show at once: 1, 2 or 3. */
  max: QuietMax;
  /** His order; every known id exactly once. */
  order: readonly QuietLineId[];
  /** Lines he turned off. */
  off: readonly QuietLineId[];
  /** After SHIFT DOWN, the catch-up and the close show one at a time (catch-up first). */
  oneAfterShift: boolean;
}

export const DEFAULT_QUIET_SETTINGS: QuietLineSettings = { max: QUIET_MAX, order: QUIET_LINE_DEFAULT_ORDER, off: [], oneAfterShift: true };

/**
 * The candidates true right now, budgeted: the first `max` by his order are shown, the rest are tucked behind
 * "N MORE". Lines he turned off never show. While an operation or the late sleep prompt owns the screen
 * (`operationActive`), no quiet line shows except DRIVE_HOME, which keeps its own existing rule.
 */
export function deriveQuietLines(
  candidates: Iterable<QuietLineId>,
  settings: Pick<QuietLineSettings, "max" | "order" | "off">,
  operationActive = false,
): { shown: QuietLineId[]; tucked: QuietLineId[] } {
  const live = new Set(candidates);
  const off = new Set(settings.off);
  const rank = (id: QuietLineId) => { const i = settings.order.indexOf(id); return i < 0 ? QUIET_LINE_DEFAULT_ORDER.indexOf(id) + settings.order.length : i; };
  const ordered = [...live]
    .filter((id) => !off.has(id) && (!operationActive || id === "DRIVE_HOME"))
    .sort((a, b) => rank(a) - rank(b));
  const max = Math.max(0, Math.floor(settings.max));
  return { shown: ordered.slice(0, max), tucked: ordered.slice(max) };
}
