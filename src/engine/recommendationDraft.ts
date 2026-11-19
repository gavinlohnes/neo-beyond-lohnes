import type { ShortSleepStreak } from "./sleepStreak";

/** DRAFT-RECOMMENDATION-001: provisional guidance only, never a capacity or executable Recommendation. */
export interface RecommendationDraft {
  kind: "POST_SHIFT_TRANSITION" | "RECOVER";
  title: string;
  reason: string;
  nights: ShortSleepStreak["nights"];
  trace: { rule: "UNRESOLVED_POST_SHIFT" | "TWO_SHORT_MAIN_SLEEPS"; capacity: "UNKNOWN" };
}

/** Reuse the existing post-shift precedence and personal two-night evidence; never infer subjective check-in values. */
export function deriveRecommendationDraft(input: {
  hasCheckIn: boolean; hasRecommendation: boolean; hasUnresolvedPostShift: boolean; shortSleep: ShortSleepStreak;
}): RecommendationDraft | null {
  if (input.hasCheckIn || input.hasRecommendation) return null;
  if (input.hasUnresolvedPostShift) return {
    kind: "POST_SHIFT_TRANSITION", title: "Shift down after work",
    reason: "Your work period ended and has not been shifted down from yet.", nights: [],
    trace: { rule: "UNRESOLVED_POST_SHIFT", capacity: "UNKNOWN" },
  };
  if (input.shortSleep.streak && input.shortSleep.nights.length === 2) return {
    kind: "RECOVER", title: "Protect recovery",
    reason: "Your last two main sleeps were below your usual range for those kinds of day.",
    nights: input.shortSleep.nights.map(night => ({ ...night })),
    trace: { rule: "TWO_SHORT_MAIN_SLEEPS", capacity: "UNKNOWN" },
  };
  return null;
}
