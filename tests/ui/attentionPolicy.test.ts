import { describe, expect, it } from "vitest";
import {
  ATTENTION_MAX,
  deriveAttentionPlan,
  deriveDominantSurface,
  isInAttention,
} from "../../src/ui/screens/today/attentionPolicy";

const QUIET: Parameters<typeof deriveAttentionPlan>[0] = {
  activeWorkoutId: null,
  activeWorkoutType: null,
  activeResetId: null,
  activeShiftDownId: null,
  recommendationKind: "EXECUTE_PLANNED_WORK",
  recommendationSuggestedCommand: null,
  suggestEndDay: false,
  hasPendingOutcome: false,
  hasUnresolvedCapture: false,
  hasCommitmentDue: false,
  hasWorkEndAvailable: false,
  isCheckInMissing: false,
  isMinimumDayProminent: false,
};

describe("deriveDominantSurface", () => {
  it("defaults to RECOMMENDATION when nothing is active", () => {
    expect(deriveDominantSurface({ activeWorkoutId: null, activeResetId: null, activeShiftDownId: null, recommendationKind: "RECOVER" })).toBe("RECOMMENDATION");
  });

  it("RESET active takes dominance over the recommendation", () => {
    expect(deriveDominantSurface({ activeWorkoutId: null, activeResetId: "r1", activeShiftDownId: null, recommendationKind: "RECOVER" })).toBe("RESET_ACTIVE");
  });

  it("SHIFT DOWN active takes dominance over the recommendation", () => {
    expect(deriveDominantSurface({ activeWorkoutId: null, activeResetId: null, activeShiftDownId: "s1", recommendationKind: "RECOVER" })).toBe("SHIFT_DOWN_ACTIVE");
  });

  it("lets an explicitly opened hydration operation own the field without outranking canonical active work", () => {
    expect(deriveDominantSurface({
      activeWorkoutId: null,
      activeResetId: null,
      activeShiftDownId: null,
      recommendationKind: "RECOVER",
      isHydrationOperationOpen: true,
    })).toBe("HYDRATION_ACTIVE");

    expect(deriveDominantSurface({
      activeWorkoutId: null,
      activeResetId: "r1",
      activeShiftDownId: null,
      recommendationKind: "RECOVER",
      isHydrationOperationOpen: true,
    })).toBe("RESET_ACTIVE");
  });

  it("surfaces a degraded conflict if RESET and SHIFT DOWN are both active", () => {
    expect(deriveDominantSurface({ activeWorkoutId: null, activeResetId: "r1", activeShiftDownId: "s1", recommendationKind: "RECOVER" })).toBe("OPERATION_CONFLICT");
  });

  it("is intentionally quiet for NO ACTION REQUIRED", () => {
    expect(deriveDominantSurface({ activeWorkoutId: null, activeResetId: null, activeShiftDownId: null, recommendationKind: "NO_ACTION_REQUIRED" })).toBe("NONE");
  });
});

describe("deriveAttentionPlan", () => {
  it("gives a canonical active workout the field and subordinates matching guidance", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeWorkoutId: "workout-1",
      activeWorkoutType: "STANDARD",
      recommendationSuggestedCommand: "START_WORKOUT",
    });
    expect(plan.dominant).toBe("WORKOUT_ACTIVE");
    expect(plan.recommendationPlacement).toBe("SUPPORT");
  });

  it("keeps unrelated guidance visible while a workout owns the field", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeWorkoutId: "workout-1",
      activeWorkoutType: "STANDARD",
      recommendationKind: "RECOVER",
      recommendationSuggestedCommand: "RECOVERY_SESSION",
    });
    expect(plan.dominant).toBe("WORKOUT_ACTIVE");
    expect(plan.recommendationPlacement).toBe("ATTENTION");
    expect(plan.attention).toContain("RECOMMENDATION_UNRESOLVED");
  });

  it("reports a conflict when a workout overlaps another foreground operation", () => {
    const plan = deriveAttentionPlan({ ...QUIET, activeWorkoutId: "workout-1", activeWorkoutType: "STANDARD", activeResetId: "reset-1" });
    expect(plan.dominant).toBe("OPERATION_CONFLICT");
  });

  it("an ordinary quiet day earns zero attention items", () => {
    const plan = deriveAttentionPlan(QUIET);
    expect(plan.dominant).toBe("RECOMMENDATION");
    expect(plan.recommendationPlacement).toBe("DOMINANT");
    expect(plan.attention).toEqual([]);
  });

  it("unresolved Capture alone earns exactly one attention slot", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasUnresolvedCapture: true });
    expect(plan.attention).toEqual(["CAPTURE_UNRESOLVED"]);
  });

  it("suggestEndDay alone earns exactly one attention slot", () => {
    const plan = deriveAttentionPlan({ ...QUIET, suggestEndDay: true });
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED"]);
  });

  it("a pending outcome alone earns exactly one attention slot", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasPendingOutcome: true });
    expect(plan.attention).toEqual(["PENDING_OUTCOME"]);
  });

  it("two simultaneous candidates both earn a slot, in priority order", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasUnresolvedCapture: true, suggestEndDay: true });
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED", "CAPTURE_UNRESOLVED"]);
  });

  it("a due/overdue/planned-today commitment alone earns exactly one attention slot", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasCommitmentDue: true });
    expect(plan.attention).toEqual(["COMMITMENT_DUE"]);
  });

  it("COMMITMENT_DUE ranks below END_DAY_SUGGESTED but above PENDING_OUTCOME and CAPTURE_UNRESOLVED", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      suggestEndDay: true,
      hasCommitmentDue: true,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED", "COMMITMENT_DUE"]);
  });

  it("never exceeds ATTENTION_MAX even when every candidate is true", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      suggestEndDay: true,
      hasCommitmentDue: true,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    expect(plan.attention).toHaveLength(ATTENTION_MAX);
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED", "COMMITMENT_DUE"]);
  });

  it("without END_DAY_SUGGESTED, COMMITMENT_DUE and PENDING_OUTCOME fill both slots ahead of CAPTURE_UNRESOLVED", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      hasCommitmentDue: true,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    expect(plan.attention).toEqual(["COMMITMENT_DUE", "PENDING_OUTCOME"]);
  });

  it("dominance is independent of attention — an active RESET with a pending outcome still surfaces both", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeResetId: "r1",
      recommendationSuggestedCommand: "START_RESET",
      hasPendingOutcome: true,
    });
    expect(plan.dominant).toBe("RESET_ACTIVE");
    expect(plan.recommendationPlacement).toBe("SUPPORT");
    expect(plan.attention).toEqual(["PENDING_OUTCOME"]);
  });

  it("subordinates a recommendation already being fulfilled by the active operation", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeShiftDownId: "s1",
      recommendationSuggestedCommand: "START_SHIFT_DOWN",
      hasCommitmentDue: true,
    });
    expect(plan.dominant).toBe("SHIFT_DOWN_ACTIVE");
    expect(plan.recommendationPlacement).toBe("SUPPORT");
    expect(plan.attention).toEqual(["COMMITMENT_DUE"]);
  });

  it("keeps END DAY guidance visible while an active SHIFT DOWN owns the field", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeShiftDownId: "s1",
      recommendationSuggestedCommand: "START_SHIFT_DOWN",
      suggestEndDay: true,
    });
    expect(plan.dominant).toBe("SHIFT_DOWN_ACTIVE");
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED"]);
  });

  it("keeps a pending outcome visible while an active RESET owns the field", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeResetId: "r1",
      recommendationSuggestedCommand: "START_RESET",
      hasPendingOutcome: true,
    });
    expect(plan.dominant).toBe("RESET_ACTIVE");
    expect(plan.attention).toEqual(["PENDING_OUTCOME"]);
  });

  it("keeps unrelated Engine guidance visible in scarce attention behind an active operation", () => {
    const plan = deriveAttentionPlan({ ...QUIET, activeResetId: "r1", hasCommitmentDue: true });
    expect(plan.dominant).toBe("RESET_ACTIVE");
    expect(plan.recommendationPlacement).toBe("ATTENTION");
    expect(plan.attention).toEqual(["RECOMMENDATION_UNRESOLVED", "COMMITMENT_DUE"]);
  });

  it("reports incompatible foreground operations instead of choosing silently", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      activeResetId: "r1",
      activeShiftDownId: "s1",
      recommendationSuggestedCommand: "START_SHIFT_DOWN",
    });
    expect(plan.dominant).toBe("OPERATION_CONFLICT");
    expect(plan.recommendationPlacement).toBe("SUPPORT");
  });

  it("makes NO ACTION REQUIRED quiet while preserving unresolved support signals", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      recommendationKind: "NO_ACTION_REQUIRED",
      isCheckInMissing: true,
      hasUnresolvedCapture: true,
    });
    expect(plan.dominant).toBe("NONE");
    expect(plan.recommendationPlacement).toBe("SUPPORT");
    expect(plan.attention).toEqual(["CHECK_IN_MISSING", "CAPTURE_UNRESOLVED"]);
  });

  it("orders work transition and constrained Minimum Day within the two-signal budget", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      hasWorkEndAvailable: true,
      isMinimumDayProminent: true,
      hasPendingOutcome: true,
    });
    expect(plan.attention).toEqual(["WORK_END_AVAILABLE", "MINIMUM_DAY_PROMINENT"]);
  });

  it("gets progressively quieter as unresolved state resolves", () => {
    const busy = deriveAttentionPlan({
      ...QUIET,
      hasCommitmentDue: true,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    const quieter = deriveAttentionPlan({
      ...QUIET,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    const quiet = deriveAttentionPlan({
      ...QUIET,
      recommendationKind: "NO_ACTION_REQUIRED",
      hasUnresolvedCapture: false,
    });
    expect(busy.attention).toEqual(["COMMITMENT_DUE", "PENDING_OUTCOME"]);
    expect(quieter.attention).toEqual(["PENDING_OUTCOME", "CAPTURE_UNRESOLVED"]);
    expect(quiet).toMatchObject({ dominant: "NONE", attention: [] });
  });
});

describe("isInAttention", () => {
  it("reflects membership in the derived plan", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasUnresolvedCapture: true });
    expect(isInAttention(plan, "CAPTURE_UNRESOLVED")).toBe(true);
    expect(isInAttention(plan, "PENDING_OUTCOME")).toBe(false);
  });
});
