import { describe, expect, it } from "vitest";
import {
  deriveRecoverySessionStatus,
  doesSessionAdvanceRotation,
  suggestNextTemplate,
  suggestSessionVariant,
} from "../../src/engine/trainSuggestion";

describe("suggestSessionVariant", () => {
  it("RED capacity suggests RESET, not training", () => {
    const result = suggestSessionVariant("RED");
    expect(result.variant).toBe("RESET");
    expect(result.noCheckIn).toBe(false);
  });

  it("YELLOW capacity suggests REDUCED", () => {
    expect(suggestSessionVariant("YELLOW").variant).toBe("REDUCED");
  });

  it("GREEN capacity suggests STANDARD", () => {
    expect(suggestSessionVariant("GREEN").variant).toBe("STANDARD");
  });

  it("no check-in yet suggests STANDARD but flags it", () => {
    const result = suggestSessionVariant(null);
    expect(result.variant).toBe("STANDARD");
    expect(result.noCheckIn).toBe(true);
  });
});

describe("suggestNextTemplate", () => {
  it("suggests A when no prior advancing session exists", () => {
    expect(suggestNextTemplate(null)).toBe("A");
  });

  it("cycles A -> B -> C -> A", () => {
    expect(suggestNextTemplate("A")).toBe("B");
    expect(suggestNextTemplate("B")).toBe("C");
    expect(suggestNextTemplate("C")).toBe("A");
  });
});

describe("deriveRecoverySessionStatus", () => {
  it("10+ minutes is COMPLETED", () => {
    expect(deriveRecoverySessionStatus(10)).toBe("COMPLETED");
    expect(deriveRecoverySessionStatus(45)).toBe("COMPLETED");
  });

  it("1-9 minutes is PARTIAL", () => {
    expect(deriveRecoverySessionStatus(1)).toBe("PARTIAL");
    expect(deriveRecoverySessionStatus(9)).toBe("PARTIAL");
  });

  it("zero movement is ABANDONED", () => {
    expect(deriveRecoverySessionStatus(0)).toBe("ABANDONED");
  });
});

describe("doesSessionAdvanceRotation", () => {
  it("STANDARD only advances on COMPLETED", () => {
    expect(doesSessionAdvanceRotation("STANDARD", "COMPLETED")).toBe(true);
    expect(doesSessionAdvanceRotation("STANDARD", "PARTIAL")).toBe(false);
    expect(doesSessionAdvanceRotation("STANDARD", "ABANDONED")).toBe(false);
  });

  it("REDUCED advances on COMPLETED or PARTIAL, not ABANDONED", () => {
    expect(doesSessionAdvanceRotation("REDUCED", "COMPLETED")).toBe(true);
    expect(doesSessionAdvanceRotation("REDUCED", "PARTIAL")).toBe(true);
    expect(doesSessionAdvanceRotation("REDUCED", "ABANDONED")).toBe(false);
  });

  it("RECOVERY never advances rotation, regardless of status", () => {
    expect(doesSessionAdvanceRotation("RECOVERY", "COMPLETED")).toBe(false);
    expect(doesSessionAdvanceRotation("RECOVERY", "PARTIAL")).toBe(false);
    expect(doesSessionAdvanceRotation("RECOVERY", "ABANDONED")).toBe(false);
  });
});

describe("SLEEP-ENGINE-001 — session size after two short sleeps", () => {
  it("turns only GREEN's standard session into the reduced one", () => {
    expect(suggestSessionVariant("GREEN", true).variant).toBe("REDUCED");
    expect(suggestSessionVariant("GREEN", true).reason).toMatch(/last two main sleeps/);
    expect(suggestSessionVariant("GREEN").variant).toBe("STANDARD");
    expect(suggestSessionVariant("YELLOW", true).variant).toBe("REDUCED");
    expect(suggestSessionVariant("RED", true).variant).toBe("RESET");
    expect(suggestSessionVariant(null, true)).toEqual(suggestSessionVariant(null));
  });
});

describe("OWNER-GO-001: an empty completion never advances the rotation", () => {
  it("needs at least one working set when the count is known", () => {
    expect(doesSessionAdvanceRotation("REDUCED", "COMPLETED", 0)).toBe(false);
    expect(doesSessionAdvanceRotation("STANDARD", "COMPLETED", 0)).toBe(false);
    expect(doesSessionAdvanceRotation("STANDARD", "COMPLETED", 1)).toBe(true);
    expect(doesSessionAdvanceRotation("REDUCED", "PARTIAL", 2)).toBe(true);
    // Unknown count keeps the status rule alone.
    expect(doesSessionAdvanceRotation("STANDARD", "COMPLETED")).toBe(true);
  });
});
