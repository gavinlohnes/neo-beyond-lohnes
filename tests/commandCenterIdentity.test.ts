import { describe, expect, it } from "vitest";
import { cityLight } from "../src/ui/screens/today/ModeIdentity";
import { describeRecommendationReason } from "../src/ui/screens/today/recommendationCopy";

describe("clock-driven identity", () => {
  it("dims the city through a night shift and turns off the sky in daylight", () => {
    expect(cityLight(17, true).windows).toBeGreaterThan(cityLight(23, true).windows);
    expect(cityLight(23, true).windows).toBeGreaterThan(cityLight(5, true).windows);
    expect(cityLight(7, true).windows).toBeLessThan(.1);
    expect(cityLight(22, false).windows).toBeLessThan(.1);
    expect(cityLight(22, true).sky).toBe(1);
    expect(cityLight(7, true).sky).toBe(.5);
    expect(cityLight(12, true).sky).toBe(0);
  });
  it("leaves unfamiliar Engine evidence intact", () => {
    expect(describeRecommendationReason("Historical custom evidence")).toBe("Historical custom evidence");
    expect(describeRecommendationReason("Capacity is constrained.")).toContain("Your call.");
  });
});
