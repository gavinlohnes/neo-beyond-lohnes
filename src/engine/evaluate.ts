import type {
  Capacity,
  DecisionTrace,
  Recommendation,
  StateCheckIn,
} from "../domain/common/types";
import { deriveCapacity } from "./capacity";

// FIELD ALPHA Phase 4 truth-hygiene fix: exported so MoreScreen's SYSTEM
// diagnostics can display the real value the Engine actually stamps onto
// every Recommendation.engineVersion, instead of a second, independently
// hardcoded literal that could silently drift from this one.
export const ENGINE_VERSION = "0.1.0";

export interface EvaluateInput {
  beyondDayId: string;
  checkIn: StateCheckIn | null;
  hasPlannedWork: boolean;
  /**
   * Drop 02b: true when the active WORK BeyondDay has an unresolved
   * WORK_PERIOD_ENDED fact (application/queries.ts's hasUnresolvedPostShift
   * — derived from event history, not recomputed here). The Engine stays
   * pure and time-blind; the application layer decides whether this is
   * currently true and passes it in, same as hasPlannedWork.
   */
  hasUnresolvedPostShift: boolean;
}

/**
 * The Engine is the sole source of domain truth for recommendations.
 * It must remain pure: same inputs -> same output, always, with a full trace.
 * UI and persistence never encode this logic themselves.
 */
export function evaluate(input: EvaluateInput): Recommendation {
  const hasCheckIn = input.checkIn !== null;
  const capacityResult = input.checkIn ? deriveCapacity(input.checkIn) : null;
  const capacity: Capacity | null = capacityResult ? capacityResult.capacity : null;
  const reasonCodes = capacityResult ? capacityResult.reasonCodes : [];

  // RED still wins regardless of an unresolved post-shift fact (Decision
  // Register: "On the next check-in, RED capacity still wins; otherwise
  // unresolved post-shift context recommends SHIFT DOWN before generic
  // recovery or execution.").
  const postShiftApplies = capacity !== "RED" && input.hasUnresolvedPostShift;

  const matchedRules: DecisionTrace["matchedRules"] = [
    {
      ruleId: "STABILIZE",
      result: capacity === "RED",
      reason: capacity === "RED" ? "RED capacity" : `${capacity ?? "unknown"} capacity`,
    },
    {
      ruleId: "POST_SHIFT_TRANSITION",
      result: postShiftApplies,
      reason: postShiftApplies
        ? "unresolved WORK_PERIOD_ENDED fact"
        : input.hasUnresolvedPostShift
          ? "RED capacity outranks it"
          : "no unresolved WORK_PERIOD_ENDED fact",
    },
    {
      ruleId: "RECOVER",
      result: capacity === "YELLOW" && !postShiftApplies,
      reason: capacity === "YELLOW" ? "YELLOW capacity" : `${capacity ?? "unknown"} capacity`,
    },
    {
      ruleId: "EXECUTE_PLANNED_WORK",
      result: capacity === "GREEN" && input.hasPlannedWork && !postShiftApplies,
      reason:
        capacity === "GREEN" && input.hasPlannedWork
          ? "GREEN capacity with planned work"
          : "GREEN capacity with planned work",
    },
  ];

  const trace = (
    kind: Recommendation["kind"],
    selectionReason: string,
  ): DecisionTrace => ({
    engineVersion: ENGINE_VERSION,
    evaluatedAt: new Date().toISOString(),
    inputs: [
      { key: "hasCheckIn", value: hasCheckIn },
      { key: "hasPlannedWork", value: input.hasPlannedWork },
    ],
    derived: capacity
      ? [
          { key: "capacity", value: capacity },
          { key: "reasonCodes", value: reasonCodes.join(", ") },
        ]
      : [],
    matchedRules,
    selectedRecommendation: kind,
    selectionReason,
  });

  const base = {
    id: crypto.randomUUID(),
    beyondDayId: input.beyondDayId,
    issuedAt: new Date().toISOString(),
  };

  if (capacity === "RED") {
    return {
      ...base,
      kind: "STABILIZE",
      priority: 1,
      title: "Stabilize first",
      rationale: "Capacity is low. Protect the basics before anything else.",
      suggestedCommand: "START_SHIFT_DOWN",
      trace: trace("STABILIZE", "STABILIZE matched on RED capacity."),
      statusAtIssue: "ACTION",
    };
  }

  if (postShiftApplies) {
    return {
      ...base,
      kind: "POST_SHIFT_TRANSITION",
      priority: 2,
      title: "Shift down after work",
      rationale: "Your shift ended and hasn't been shifted down from yet.",
      suggestedCommand: "START_SHIFT_DOWN",
      trace: trace(
        "POST_SHIFT_TRANSITION",
        "POST_SHIFT_TRANSITION matched after STABILIZE did not — an unresolved work-ended fact outranks RECOVER/EXECUTE_PLANNED_WORK.",
      ),
      statusAtIssue: "ACTION",
    };
  }

  if (capacity === "YELLOW") {
    return {
      ...base,
      kind: "RECOVER",
      priority: 3,
      title: "Protect recovery",
      rationale: "Capacity is constrained.",
      suggestedCommand: "RECOVERY_SESSION",
      trace: trace("RECOVER", "RECOVER matched after STABILIZE and POST_SHIFT_TRANSITION did not."),
      statusAtIssue: "ACTION",
    };
  }

  if (capacity === "GREEN" && input.hasPlannedWork) {
    return {
      ...base,
      kind: "EXECUTE_PLANNED_WORK",
      priority: 4,
      title: "Proceed with planned work",
      rationale: "Capacity is good and there is planned work for today.",
      suggestedCommand: "START_WORKOUT",
      trace: trace(
        "EXECUTE_PLANNED_WORK",
        "EXECUTE_PLANNED_WORK matched after STABILIZE, POST_SHIFT_TRANSITION, and RECOVER did not.",
      ),
      statusAtIssue: "ACTION",
    };
  }

  return {
    ...base,
    kind: "NO_ACTION_REQUIRED",
    priority: 5,
    title: "No action required",
    rationale: "No rule requires attention right now.",
    suggestedCommand: null,
    trace: trace("NO_ACTION_REQUIRED", "No higher-priority rule matched."),
    statusAtIssue: "NO_ACTION_REQUIRED",
  };
}
