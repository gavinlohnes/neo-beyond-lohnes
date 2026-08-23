import type { Outcome, RecommendationKind } from "../../../domain/common/types";
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
    case "POST_SHIFT_TRANSITION":
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

/**
 * Product Experience Sprint, P3 (TODAY command-surface rebuild):
 * "Do not hide uncertainty/missing data. Clearly indicate when a
 * recommendation is based on limited/no check-in data." Without a
 * check-in, evaluate.ts's capacity is null and every rule falls through
 * to the same NO_ACTION_REQUIRED text a genuinely fine GREEN day would
 * also show — indistinguishable without this caveat. Purely a UI-layer
 * addition; the Engine's own rationale/trace text is untouched.
 */
export function describeEvidenceBasis(hasCheckIn: boolean): string | null {
  if (hasCheckIn) return null;
  return "No check-in yet today — this default doesn't reflect how you're actually doing. Check in below for a real read.";
}

/**
 * TODAY // SUIT LAYER 01 (DEC-003): human labels for DecisionTrace's
 * `inputs`/`derived` keys — every key engine/evaluate.ts currently
 * produces (`hasCheckIn`, `hasPlannedWork`, `capacity`, `reasonCodes`).
 * An unrecognized key falls back to itself rather than being hidden —
 * "exposed machinery" must never silently drop a real signal just
 * because this map hasn't been updated for it yet.
 */
const TRACE_KEY_LABELS: Record<string, string> = {
  hasCheckIn: "Check-in recorded",
  hasPlannedWork: "Planned work today",
  capacity: "Capacity",
  reasonCodes: "Reason codes",
};

export function describeTraceLabel(key: string): string {
  return TRACE_KEY_LABELS[key] ?? key;
}

/** Booleans read as Yes/No (matching this panel's plain-language voice elsewhere); an empty string (e.g. no reasonCodes) reads as an explicit em dash rather than a blank cell. */
export function describeTraceValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "") return "—";
  return String(value);
}

/** Observational history only: names the recorded fact without implying that it predicts the current result. */
export function describePriorOutcomeMemory(
  decision: RecommendationDecision,
  rating: NonNullable<Outcome["rating"]>,
  issuedAt: string,
): string {
  const recordedDate = new Date(issuedAt).toLocaleDateString();
  return `Last time this recommendation was recorded (${recordedDate}): ${decision.replaceAll("_", " ")} · ${rating}`;
}
