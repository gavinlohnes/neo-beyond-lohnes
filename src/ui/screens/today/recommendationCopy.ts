import type { RecommendationKind } from "../../../domain/common/types";
import type { RecommendationDecision } from "../../../application/queries";

/**
 * Phase 2 (TODAY as daily command surface): plain-language wording for the
 * record/decision buttons on a recommendation. Pure strings only —
 * application/commands.ts's recordRecommendation/declineRecommendation are
 * unchanged; this file only maps their real states to words. Every
 * ACTION-kind recommendation (STABILIZE/RECOVER/EXECUTE_PLANNED_WORK) has
 * two real decisions available (accept or decline); NO_ACTION_REQUIRED has
 * exactly one (acknowledge) and no decline path.
 */

export function describeRecommendationAction(kind: RecommendationKind): string {
  return kind === "NO_ACTION_REQUIRED" ? "No action needed" : "I'll do this";
}

export const DECLINE_LABEL = "Not doing this";

/**
 * Clarifies that tapping either button only records a decision — it never
 * starts the suggested action itself, and never changes what the Engine
 * recommends next time (same "rules provide consistency, outcomes provide
 * correction" philosophy as outcome rating — see rateOutcome). Where the
 * actual starting action lives is stated only when it's true in this
 * codebase today: SHIFT DOWN is a button in this same card; TRAIN is where
 * START WORKOUT (covering both ordinary workouts and RECOVERY sessions)
 * lives.
 */
export function describeRecommendationEffect(kind: RecommendationKind): string {
  switch (kind) {
    case "STABILIZE":
      return "Records your decision — it doesn't start SHIFT DOWN for you, and it won't change what BEYOND recommends next time. Use SHIFT DOWN below when you're ready.";
    case "RECOVER":
      return "Records your decision — it doesn't start a session for you, and it won't change what BEYOND recommends next time. Start it on TRAIN when you're ready.";
    case "EXECUTE_PLANNED_WORK":
      return "Records your decision — it doesn't start your workout for you, and it won't change what BEYOND recommends next time. Start it on TRAIN when you're ready.";
    case "NO_ACTION_REQUIRED":
      return "Just records that you saw this. Nothing to start.";
  }
}

/** Label for the single disabled button shown once a decision has been recorded, reflecting which one it was. */
export function describeRecordedDecision(decision: RecommendationDecision): string {
  return decision === "DECLINED" ? "NOT DOING THIS — RECORDED" : "RECORDED";
}
