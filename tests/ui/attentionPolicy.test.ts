import { describe, expect, it } from "vitest";
import {
  ATTENTION_MAX,
  deriveAttentionPlan,
  deriveDominantSurface,
  isInAttention,
} from "../../src/ui/screens/today/attentionPolicy";

const QUIET: Parameters<typeof deriveAttentionPlan>[0] = {
  activeResetId: null,
  activeShiftDownId: null,
  suggestEndDay: false,
  hasPendingOutcome: false,
  hasUnresolvedCapture: false,
};

describe("deriveDominantSurface", () => {
  it("defaults to RECOMMENDATION when nothing is active", () => {
    expect(deriveDominantSurface({ activeResetId: null, activeShiftDownId: null })).toBe("RECOMMENDATION");
  });

  it("RESET active takes dominance over the recommendation", () => {
    expect(deriveDominantSurface({ activeResetId: "r1", activeShiftDownId: null })).toBe("RESET_ACTIVE");
  });

  it("SHIFT DOWN active takes dominance over the recommendation", () => {
    expect(deriveDominantSurface({ activeResetId: null, activeShiftDownId: "s1" })).toBe("SHIFT_DOWN_ACTIVE");
  });

  it("SHIFT DOWN wins if both are somehow simultaneously active", () => {
    expect(deriveDominantSurface({ activeResetId: "r1", activeShiftDownId: "s1" })).toBe("SHIFT_DOWN_ACTIVE");
  });
});

describe("deriveAttentionPlan", () => {
  it("an ordinary quiet day earns zero attention items", () => {
    const plan = deriveAttentionPlan(QUIET);
    expect(plan.dominant).toBe("RECOMMENDATION");
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

  it("never exceeds ATTENTION_MAX even when every candidate is true", () => {
    const plan = deriveAttentionPlan({
      ...QUIET,
      suggestEndDay: true,
      hasPendingOutcome: true,
      hasUnresolvedCapture: true,
    });
    expect(plan.attention).toHaveLength(ATTENTION_MAX);
    expect(plan.attention).toEqual(["END_DAY_SUGGESTED", "PENDING_OUTCOME"]);
  });

  it("dominance is independent of attention — an active RESET with a pending outcome still surfaces both", () => {
    const plan = deriveAttentionPlan({ ...QUIET, activeResetId: "r1", hasPendingOutcome: true });
    expect(plan.dominant).toBe("RESET_ACTIVE");
    expect(plan.attention).toEqual(["PENDING_OUTCOME"]);
  });
});

describe("isInAttention", () => {
  it("reflects membership in the derived plan", () => {
    const plan = deriveAttentionPlan({ ...QUIET, hasUnresolvedCapture: true });
    expect(isInAttention(plan, "CAPTURE_UNRESOLVED")).toBe(true);
    expect(isInAttention(plan, "PENDING_OUTCOME")).toBe(false);
  });
});
