import { describe, expect, it } from "vitest";
import { dismissOutcome, isOutcomeDismissed } from "../../src/persistence/outcomeDismissals";

describe("outcome dismissal persistence", () => {
  it("is false for a recommendation that was never dismissed", () => {
    expect(isOutcomeDismissed("rec-1")).toBe(false);
  });

  it("is true once dismissed, and survives being checked again (i.e. persists, not just in-memory)", () => {
    dismissOutcome("rec-2");
    expect(isOutcomeDismissed("rec-2")).toBe(true);
    expect(isOutcomeDismissed("rec-2")).toBe(true);
  });

  it("is scoped per recommendation id", () => {
    dismissOutcome("rec-3");
    expect(isOutcomeDismissed("rec-3")).toBe(true);
    expect(isOutcomeDismissed("rec-4")).toBe(false);
  });
});
