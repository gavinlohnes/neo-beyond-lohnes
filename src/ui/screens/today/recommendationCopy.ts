import type { RecommendationKind } from "../../../domain/common/types";

/**
 * Phase 2 (TODAY as daily command surface): plain-language wording for
 * the single record/decision button on a recommendation. Pure strings
 * only — application/commands.ts's recordRecommendation is unchanged and
 * still the only thing that writes RECOMMENDATION_ACCEPTED /
 * NO_ACTION_RECORDED; this file does not add a third state or a decline
 * path. Every kind besides NO_ACTION_REQUIRED currently shares one
 * "accept" button (no separate decline exists), so this intentionally
 * maps to exactly the two labels the real two states support.
 */

export function describeRecommendationAction(kind: RecommendationKind): string {
  return kind === "NO_ACTION_REQUIRED" ? "No action needed" : "I'll do this";
}

/**
 * Clarifies that tapping the button only records a decision — it never
 * starts the suggested action itself. Where the actual starting action
 * lives is stated only when it's true in this codebase today: SHIFT DOWN
 * is a button in this same card; TRAIN is where START WORKOUT (covering
 * both ordinary workouts and RECOVERY sessions) lives.
 */
export function describeRecommendationEffect(kind: RecommendationKind): string {
  switch (kind) {
    case "STABILIZE":
      return "Records your decision — it doesn't start SHIFT DOWN for you. Use SHIFT DOWN below when you're ready.";
    case "RECOVER":
      return "Records your decision — it doesn't start a session for you. Start it on TRAIN when you're ready.";
    case "EXECUTE_PLANNED_WORK":
      return "Records your decision — it doesn't start your workout for you. Start it on TRAIN when you're ready.";
    case "NO_ACTION_REQUIRED":
      return "Just records that you saw this. Nothing to start.";
  }
}
