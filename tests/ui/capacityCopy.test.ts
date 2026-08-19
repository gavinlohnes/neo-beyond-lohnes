import { describe, expect, it } from "vitest";
import { deriveCapacity } from "../../src/engine/capacity";
import { describeCapacity } from "../../src/ui/screens/today/capacityCopy";
import type { StateCheckIn } from "../../src/domain/common/types";

function checkIn(overrides: Partial<Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">>): StateCheckIn {
  return {
    id: "t",
    beyondDayId: "d",
    recordedAt: new Date().toISOString(),
    energy: 3,
    stress: 3,
    mood: 3,
    soreness: 1,
    alcoholUrge: 0,
    ...overrides,
  };
}

describe("describeCapacity", () => {
  it("names the real driving reason for a single-cause RED", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ stress: 5 }));
    expect(describeCapacity(capacity, reasonCodes)).toBe("Capacity is RED because stress is very high.");
  });

  it("names every driving reason for a multi-cause RED, joined naturally", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ energy: 1, mood: 1 }));
    expect(describeCapacity(capacity, reasonCodes)).toBe(
      "Capacity is RED because energy is critically low and mood is critically low.",
    );
  });

  it("names a single-cause YELLOW", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ soreness: 4 }));
    expect(describeCapacity(capacity, reasonCodes)).toBe("Capacity is YELLOW because soreness is high.");
  });

  it("oxford-comma-joins three or more reasons", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({ stress: 4, mood: 2, soreness: 4 }));
    expect(describeCapacity(capacity, reasonCodes)).toBe(
      "Capacity is YELLOW because stress is high, mood is low, and soreness is high.",
    );
  });

  it("describes GREEN without implying anything was wrong", () => {
    const { capacity, reasonCodes } = deriveCapacity(checkIn({}));
    expect(describeCapacity(capacity, reasonCodes)).toBe(
      "Capacity is GREEN — nothing is flagged as severe or constrained.",
    );
  });

  it("falls back to the raw code for an unrecognized reason rather than hiding it", () => {
    expect(describeCapacity("RED", ["some new rule fires"])).toBe(
      "Capacity is RED because some new rule fires.",
    );
  });
});
