import { describe, expect, it } from "vitest";
import { deriveCapacity } from "../../src/engine/capacity";
import type { StateCheckIn } from "../../src/domain/common/types";
import {
  CHECK_IN_FIELDS,
  describeCheckInValues,
  isCheckInComplete,
  rangeForField,
  type CheckInValues,
} from "../../src/ui/screens/today/checkInFields";

const safe: CheckInValues = { energy: 3, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 };

function checkIn(overrides: Partial<CheckInValues>): StateCheckIn {
  return { id: "t", beyondDayId: "d", recordedAt: new Date().toISOString(), ...safe, ...overrides };
}

describe("CHECK_IN_FIELDS direction labels match the locked capacity rule", () => {
  it("energy: higherIsBetter — energy 1 is a RED reason, raising it clears that reason", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "energy")!;
    expect(field.direction).toBe("higherIsBetter");
    expect(deriveCapacity(checkIn({ energy: 1 })).capacity).toBe("RED");
    expect(deriveCapacity(checkIn({ energy: 5 })).capacity).toBe("GREEN");
  });

  it("stress: higherIsWorse — stress 5 is a RED reason, lowering it clears that reason", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "stress")!;
    expect(field.direction).toBe("higherIsWorse");
    expect(deriveCapacity(checkIn({ stress: 5 })).capacity).toBe("RED");
    expect(deriveCapacity(checkIn({ stress: 1 })).capacity).toBe("GREEN");
  });

  it("mood: higherIsBetter — mood 1 is a RED reason, raising it clears that reason", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "mood")!;
    expect(field.direction).toBe("higherIsBetter");
    expect(deriveCapacity(checkIn({ mood: 1 })).capacity).toBe("RED");
    expect(deriveCapacity(checkIn({ mood: 5 })).capacity).toBe("GREEN");
  });

  it("soreness: higherIsWorse — soreness >= 4 is a YELLOW reason, lowering it clears that reason", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "soreness")!;
    expect(field.direction).toBe("higherIsWorse");
    expect(deriveCapacity(checkIn({ soreness: 4 })).capacity).toBe("YELLOW");
    expect(deriveCapacity(checkIn({ soreness: 0 })).capacity).toBe("GREEN");
  });

  it("alcoholUrge: higherIsWorse — alcoholUrge >= 4 is a RED reason, lowering it clears that reason", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "alcoholUrge")!;
    expect(field.direction).toBe("higherIsWorse");
    expect(deriveCapacity(checkIn({ alcoholUrge: 4 })).capacity).toBe("RED");
    expect(deriveCapacity(checkIn({ alcoholUrge: 0 })).capacity).toBe("GREEN");
  });
});

describe("rangeForField", () => {
  it("covers min..max inclusive for a 1-5 field", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "energy")!;
    expect(rangeForField(field)).toEqual([1, 2, 3, 4, 5]);
  });

  it("covers min..max inclusive for a 0-5 field", () => {
    const field = CHECK_IN_FIELDS.find((f) => f.key === "soreness")!;
    expect(rangeForField(field)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("isCheckInComplete", () => {
  it("is false for an empty selection — nothing looks pre-recorded", () => {
    expect(isCheckInComplete({})).toBe(false);
  });

  it("is false when only some fields are selected", () => {
    expect(isCheckInComplete({ energy: 3, stress: 3 })).toBe(false);
  });

  it("is true only once all five fields are selected, including the 0-valued ones", () => {
    expect(isCheckInComplete({ energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 })).toBe(true);
  });
});

describe("describeCheckInValues", () => {
  it("summarizes all five values in field order", () => {
    expect(describeCheckInValues(safe)).toBe("Energy 3 · Stress 3 · Mood 3 · Soreness 1 · Alcohol urge 0");
  });
});
