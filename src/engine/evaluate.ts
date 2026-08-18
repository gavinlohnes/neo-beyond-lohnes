import type {
  Capacity,
  DecisionTrace,
  Recommendation,
  StateCheckIn,
} from "../domain/common/types";
import { deriveCapacity } from "./capacity";

const ENGINE_VERSION = "0.1.0";

export interface EvaluateInput {
  beyondDayId: string;
  checkIn: StateCheckIn | null;
  hasPlannedWork: boolean;
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

  const matchedRules: DecisionTrace["matchedRules"] = [
    {
      ruleId: "STABILIZE",
      result: capacity === "RED",
      reason: capacity === "RED" ? "RED capacity" : `${capacity ?? "unknown"} capacity`,
    },
    {
      ruleId: "RECOVER",
      result: capacity === "YELLOW",
      reason: capacity === "YELLOW" ? "YELLOW capacity" : `${capacity ?? "unknown"} capacity`,
    },
    {
      ruleId: "EXECUTE_PLANNED_WORK",
      result: capacity === "GREEN" && input.hasPlannedWork,
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

  if (capacity === "YELLOW") {
    return {
      ...base,
      kind: "RECOVER",
      priority: 2,
      title: "Protect recovery",
      rationale: "Capacity is constrained.",
      suggestedCommand: "RECOVERY_SESSION",
      trace: trace("RECOVER", "RECOVER matched after STABILIZE did not."),
      statusAtIssue: "ACTION",
    };
  }

  if (capacity === "GREEN" && input.hasPlannedWork) {
    return {
      ...base,
      kind: "EXECUTE_PLANNED_WORK",
      priority: 3,
      title: "Proceed with planned work",
      rationale: "Capacity is good and there is planned work for today.",
      suggestedCommand: "START_WORKOUT",
      trace: trace(
        "EXECUTE_PLANNED_WORK",
        "EXECUTE_PLANNED_WORK matched after STABILIZE and RECOVER did not.",
      ),
      statusAtIssue: "ACTION",
    };
  }

  return {
    ...base,
    kind: "NO_ACTION_REQUIRED",
    priority: 4,
    title: "No action required",
    rationale: "No rule requires attention right now.",
    suggestedCommand: null,
    trace: trace("NO_ACTION_REQUIRED", "No higher-priority rule matched."),
    statusAtIssue: "NO_ACTION_REQUIRED",
  };
}
