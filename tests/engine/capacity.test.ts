import { describe, expect, it } from "vitest";
import { deriveCapacity } from "../../src/engine/capacity";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * Locked capacity rule (BEYOND — DECISION REGISTER, RESET / CAPACITY):
 *
 * RED   if energy == 1 OR stress == 5 OR mood == 1 OR alcoholUrge >= 4
 * else
 * YELLOW if energy <= 2 OR stress >= 4 OR mood <= 2 OR soreness >= 4
 *           OR alcoholUrge >= 2
 * else
 * GREEN
 *
 * This must never drift into a weighted score or AI interpretation without
 * an explicit product decision.
 */

type CheckInValues = Omit<StateCheckIn, "id" | "beyondDayId" | "recordedAt">;

const NEUTRAL: CheckInValues = {
  energy: 3,
  stress: 3,
  mood: 3,
  soreness: 0,
  alcoholUrge: 0,
};

function checkIn(overrides: Partial<CheckInValues>): StateCheckIn {
  return {
    id: "check-in-1",
    beyondDayId: "day-1",
    recordedAt: "2026-08-18T00:00:00.000Z",
    ...NEUTRAL,
    ...overrides,
  };
}

describe("deriveCapacity — GREEN baseline", () => {
  it("neutral check-in is GREEN", () => {
    expect(deriveCapacity(checkIn({})).capacity).toBe("GREEN");
  });

  it("best-case check-in is GREEN", () => {
    const result = deriveCapacity(
      checkIn({ energy: 5, stress: 1, mood: 5, soreness: 0, alcoholUrge: 0 }),
    );
    expect(result.capacity).toBe("GREEN");
  });

  it("stays GREEN right up to the YELLOW boundary", () => {
    // energy=3 (not <=2), stress=3 (not >=4), mood=3 (not <=2),
    // soreness=3 (not >=4), alcoholUrge=1 (not >=2)
    const result = deriveCapacity(
      checkIn({ energy: 3, stress: 3, mood: 3, soreness: 3, alcoholUrge: 1 }),
    );
    expect(result.capacity).toBe("GREEN");
  });
});

describe("deriveCapacity — RED conditions", () => {
  it("energy == 1 is RED", () => {
    expect(deriveCapacity(checkIn({ energy: 1 })).capacity).toBe("RED");
  });

  it("stress == 5 is RED", () => {
    expect(deriveCapacity(checkIn({ stress: 5 })).capacity).toBe("RED");
  });

  it("mood == 1 is RED", () => {
    expect(deriveCapacity(checkIn({ mood: 1 })).capacity).toBe("RED");
  });

  it("alcoholUrge == 4 is RED", () => {
    expect(deriveCapacity(checkIn({ alcoholUrge: 4 })).capacity).toBe("RED");
  });

  it("alcoholUrge == 5 is RED", () => {
    expect(deriveCapacity(checkIn({ alcoholUrge: 5 })).capacity).toBe("RED");
  });

  it("alcoholUrge == 3 is not RED on its own (YELLOW instead)", () => {
    expect(deriveCapacity(checkIn({ alcoholUrge: 3 })).capacity).toBe("YELLOW");
  });

  it("stress == 4 is not RED on its own (YELLOW instead)", () => {
    expect(deriveCapacity(checkIn({ stress: 4 })).capacity).toBe("YELLOW");
  });

  it("RED wins even when YELLOW conditions are also present", () => {
    const result = deriveCapacity(
      checkIn({ energy: 1, stress: 4, mood: 2, soreness: 5, alcoholUrge: 3 }),
    );
    expect(result.capacity).toBe("RED");
    expect(result.reasonCodes).toEqual(["energy == 1"]);
  });

  it("reports every matched RED reason, not just the first", () => {
    const result = deriveCapacity(checkIn({ energy: 1, stress: 5, mood: 1, alcoholUrge: 4 }));
    expect(result.capacity).toBe("RED");
    expect(result.reasonCodes).toEqual([
      "energy == 1",
      "stress == 5",
      "mood == 1",
      "alcoholUrge >= 4",
    ]);
  });
});

describe("deriveCapacity — YELLOW conditions", () => {
  it("energy <= 2 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ energy: 2 })).capacity).toBe("YELLOW");
  });

  it("stress >= 4 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ stress: 4 })).capacity).toBe("YELLOW");
  });

  it("mood <= 2 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ mood: 2 })).capacity).toBe("YELLOW");
  });

  it("soreness >= 4 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ soreness: 4 })).capacity).toBe("YELLOW");
  });

  it("soreness == 5 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ soreness: 5 })).capacity).toBe("YELLOW");
  });

  it("alcoholUrge >= 2 is YELLOW", () => {
    expect(deriveCapacity(checkIn({ alcoholUrge: 2 })).capacity).toBe("YELLOW");
  });

  it("reports every matched YELLOW reason", () => {
    const result = deriveCapacity(
      checkIn({ energy: 2, stress: 4, mood: 2, soreness: 4, alcoholUrge: 2 }),
    );
    expect(result.capacity).toBe("YELLOW");
    expect(result.reasonCodes).toEqual([
      "energy <= 2",
      "stress >= 4",
      "mood <= 2",
      "soreness >= 4",
      "alcoholUrge >= 2",
    ]);
  });
});

describe("deriveCapacity — documented ambiguous evidence", () => {
  it("a screenshot reportedly showed E1/S1/M1/So0/AU0 alongside NO ACTION REQUIRED; per the recovery briefing this is unverified as a submitted check-in and the locked rule is NOT changed for it — E1/M1 must still derive RED", () => {
    const result = deriveCapacity(
      checkIn({ energy: 1, stress: 1, mood: 1, soreness: 0, alcoholUrge: 0 }),
    );
    expect(result.capacity).toBe("RED");
  });
});
