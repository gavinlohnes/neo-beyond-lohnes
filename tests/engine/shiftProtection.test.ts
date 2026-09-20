import { describe, expect, it } from "vitest";
import { evaluateShiftProtection, type ShiftProtectionInput } from "../../src/engine/shiftProtection";

/**
 * FOUNDATION-1B — pure unit tests for the Advisory-only PROTECT gate
 * (docs/agent/drops/FOUNDATION-1B.md's resolved PROTECT-vs-EXECUTE
 * conflict). No Dexie, no fake-indexeddb, matching every other engine/*
 * test file's zero-I/O contract.
 */

function input(overrides: Partial<ShiftProtectionInput> = {}): ShiftProtectionInput {
  return {
    phase: "PRE_WORK",
    todayIsScheduledWorkDay: true,
    capacity: "GREEN",
    minimumDay: { hydrate: true, protein: true },
    ...overrides,
  };
}

describe("evaluateShiftProtection", () => {
  it("Scenario B: PRE_WORK, GREEN capacity, both hydrate and protein unmet -> a concern naming both", () => {
    const concern = evaluateShiftProtection(
      input({ minimumDay: { hydrate: false, protein: false } }),
    );
    expect(concern).toEqual({ unmetItems: ["HYDRATE", "PROTEIN"] });
  });

  it("only hydrate unmet -> a concern naming only HYDRATE", () => {
    expect(evaluateShiftProtection(input({ minimumDay: { hydrate: false, protein: true } }))).toEqual({
      unmetItems: ["HYDRATE"],
    });
  });

  it("only protein unmet -> a concern naming only PROTEIN", () => {
    expect(evaluateShiftProtection(input({ minimumDay: { hydrate: true, protein: false } }))).toEqual({
      unmetItems: ["PROTEIN"],
    });
  });

  it("both met -> no concern", () => {
    expect(evaluateShiftProtection(input())).toBeNull();
  });

  it("not PRE_WORK (SCHEDULED_SHIFT/EXPECTED_POST_WORK/OFF) -> no concern, even with unmet items", () => {
    for (const phase of ["SCHEDULED_SHIFT", "EXPECTED_POST_WORK", "OFF"] as const) {
      expect(
        evaluateShiftProtection(input({ phase, minimumDay: { hydrate: false, protein: false } })),
      ).toBeNull();
    }
  });

  it("not a scheduled work day -> no concern, even during PRE_WORK hours", () => {
    expect(
      evaluateShiftProtection(
        input({ todayIsScheduledWorkDay: false, minimumDay: { hydrate: false, protein: false } }),
      ),
    ).toBeNull();
  });

  it("RED capacity -> no concern — STABILIZE already has authority", () => {
    expect(
      evaluateShiftProtection(input({ capacity: "RED", minimumDay: { hydrate: false, protein: false } })),
    ).toBeNull();
  });

  it("YELLOW capacity -> no concern — RECOVER already has authority", () => {
    expect(
      evaluateShiftProtection(input({ capacity: "YELLOW", minimumDay: { hydrate: false, protein: false } })),
    ).toBeNull();
  });

  it("no check-in yet (capacity null) -> still evaluates like GREEN (no constrained state has been proven)", () => {
    expect(
      evaluateShiftProtection(input({ capacity: null, minimumDay: { hydrate: false, protein: true } })),
    ).toEqual({ unmetItems: ["HYDRATE"] });
  });

  it("deterministic: same input -> same output", () => {
    const i = input({ minimumDay: { hydrate: false, protein: true } });
    expect(evaluateShiftProtection(i)).toEqual(evaluateShiftProtection(i));
  });
});
