import type { Capacity, DecisionTrace, DecisionTraceInput, RecommendationKind } from "../domain/common/types";

/**
 * FOUNDATION-1B — Continuity Engine (Section 5) and Recommendation
 * Lifecycle (Section 4). Pure, deterministic interpretation, same shape as
 * `obligationRelevance.ts`: no I/O, no persisted state, nothing here is
 * ever an `evaluate.ts` input. Two independent concerns share this module
 * because both resolve "what does an already-issued Recommendation mean
 * now" from already-true facts:
 *
 * - `resolveContinuity` answers Section 5's DROP/DEFER/REINTRODUCE
 *   question for a prior day's unresolved Recommendation. It enforces
 *   NO_CATCH_UP structurally: nothing it returns is ever fed back into
 *   `evaluate.ts` or turned into a new obligation-shaped fact — a
 *   REINTRODUCE result is advisory-only (see `engine/advisory.ts`'s
 *   `composeAdvisoryNoteFromContinuity`), never an automatic re-issue.
 * - `deriveRecommendationDisposition` / `isMateriallyNewEvidence` answer
 *   Section 4's lifecycle question: what terminal state does an already-
 *   decided-or-not Recommendation currently read as (COMPLETED/DISMISSED/
 *   SUPERSEDED/EXPIRED/PENDING), and does a fresh evaluation actually
 *   differ from a previously-DECLINED one enough to justify surfacing
 *   again (Scenario E — a dismissed recommendation must not regenerate
 *   identically).
 *
 * Deliberately duplicates the small `RecommendationDecisionLike` union
 * instead of importing `application/queries.ts`'s `RecommendationDecision`
 * — same reasoning `obligationRelevance.ts`'s own doc comment already
 * gives: engine/* modules must stay freely unit-testable with zero I/O,
 * and application/queries.ts transitively imports persistence/db.ts.
 */

export type RecommendationDecisionLike = "ACCEPTED" | "DECLINED" | "NO_ACTION_RECORDED" | undefined;

export type ContinuityResolution = "DROP" | "DEFER" | "REINTRODUCE";

export interface ContinuityInput {
  priorKind: RecommendationKind;
  priorDecision: RecommendationDecisionLike;
  todayCapacity: Capacity | null;
  todayHasUnresolvedPostShift: boolean;
}

/**
 * Locked FOUNDATION-1B rule:
 *
 *   prior kind NO_ACTION_REQUIRED        -> DROP (nothing was ever pending)
 *   prior decision DECLINED              -> DROP (the operator already said no —
 *                                            Scenario E's "closes cleanly," never re-litigated)
 *   prior decision ACCEPTED/NO_ACTION_RECORDED -> DROP (already resolved by the
 *                                            operator's own action; BEYOND does not
 *                                            chase a further "did you really finish it")
 *   prior decision undefined (never decided), and today's own state is
 *     already constrained (RED/YELLOW capacity or an unresolved post-shift
 *     fact)                              -> DEFER (still legitimate, not now —
 *                                            something higher-priority already wins today)
 *   prior decision undefined, today unconstrained -> REINTRODUCE (still relevant
 *     and currently appropriate for arbitration — surfaced advisory-only,
 *     never auto-executed or silently reopened; see engine/advisory.ts)
 */
export function resolveContinuity(input: ContinuityInput): ContinuityResolution {
  if (input.priorKind === "NO_ACTION_REQUIRED") return "DROP";
  if (input.priorDecision === "DECLINED") return "DROP";
  if (input.priorDecision === "ACCEPTED" || input.priorDecision === "NO_ACTION_RECORDED") return "DROP";

  if (input.todayCapacity === "RED" || input.todayCapacity === "YELLOW" || input.todayHasUnresolvedPostShift) {
    return "DEFER";
  }
  return "REINTRODUCE";
}

export type RecommendationDisposition = "PENDING" | "COMPLETED" | "DISMISSED" | "SUPERSEDED" | "EXPIRED";

/**
 * Read-time-only derivation for REVIEW's ledger — no new stored field.
 * DISMISSED/COMPLETED reuse the existing decision record exactly
 * (DECLINED / ACCEPTED+NO_ACTION_RECORDED respectively). SUPERSEDED and
 * EXPIRED are both "never decided," distinguished only by whether a later
 * Recommendation exists for the same day (new evidence overtook it) or the
 * day itself already ended without one (its window passed). PENDING is the
 * genuinely-still-open remainder.
 */
export function deriveRecommendationDisposition(
  decision: RecommendationDecisionLike,
  hasLaterRecommendationSameDay: boolean,
  dayStatus: "ACTIVE" | "ENDED",
): RecommendationDisposition {
  if (decision === "DECLINED") return "DISMISSED";
  if (decision === "ACCEPTED" || decision === "NO_ACTION_RECORDED") return "COMPLETED";
  if (hasLaterRecommendationSameDay) return "SUPERSEDED";
  if (dayStatus === "ENDED") return "EXPIRED";
  return "PENDING";
}

function sameTraceInputs(a: DecisionTraceInput[], b: DecisionTraceInput[]): boolean {
  if (a.length !== b.length) return false;
  const toMap = (entries: DecisionTraceInput[]) => new Map(entries.map((e) => [e.key, e.value]));
  const mapA = toMap(a);
  const mapB = toMap(b);
  for (const [key, value] of mapA) {
    if (!mapB.has(key) || mapB.get(key) !== value) return false;
  }
  return true;
}

/**
 * Scenario E: "identical evidence must not create repetitive nagging;
 * materially new evidence may create a new recommendation." Compares two
 * DecisionTraces structurally — the selected kind plus every input/derived
 * key-value pair — rather than any one hardcoded field, so this stays
 * correct if evaluate.ts's own input set ever grows. Returns true (IS
 * materially new) the moment anything differs; false only when the two
 * traces are indistinguishable.
 */
export function isMateriallyNewEvidence(previous: DecisionTrace, current: DecisionTrace): boolean {
  if (previous.selectedRecommendation !== current.selectedRecommendation) return true;
  if (!sameTraceInputs(previous.inputs, current.inputs)) return true;
  if (!sameTraceInputs(previous.derived, current.derived)) return true;
  return false;
}
