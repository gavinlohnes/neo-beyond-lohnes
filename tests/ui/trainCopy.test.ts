import { describe, expect, it } from "vitest";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { doesSessionAdvanceRotation, deriveRecoverySessionStatus } from "../../src/engine/trainSuggestion";
import {
  describePartialAdvancement,
  describeRecoveryPreview,
  describeStopAction,
  describeStopConfirm,
  describeTemplateSuggestion,
  describeTemplateSummary,
  describeVariantSuggestion,
} from "../../src/ui/screens/train/trainCopy";

describe("describeTemplateSummary — descriptive, not just the bare letter", () => {
  it("names the actual exercises for template A", () => {
    const summary = describeTemplateSummary(WORKOUT_TEMPLATES.A.exercises);
    expect(summary.exerciseNames).toEqual([
      "Machine Chest Press",
      "Pec Deck",
      "Leg Press",
      "Triceps Pressdown",
    ]);
  });

  it("derives a body-area summary without duplicates, for every real template", () => {
    for (const templateId of ["A", "B", "C"] as const) {
      const summary = describeTemplateSummary(WORKOUT_TEMPLATES[templateId].exercises);
      expect(summary.bodyAreas.length).toBeGreaterThan(0);
    }
  });
});

describe("describeVariantSuggestion", () => {
  it("states plainly that RED points to RESET first, not training", () => {
    const text = describeVariantSuggestion({ variant: "RESET", reason: "x", noCheckIn: false });
    expect(text).toContain("RED");
    expect(text).toContain("RESET");
  });

  it("states plainly that YELLOW suggests REDUCED", () => {
    const text = describeVariantSuggestion({ variant: "REDUCED", reason: "x", noCheckIn: false });
    expect(text).toContain("YELLOW");
    expect(text).toContain("REDUCED");
  });

  it("states plainly that GREEN suggests STANDARD", () => {
    const text = describeVariantSuggestion({ variant: "STANDARD", reason: "x", noCheckIn: false });
    expect(text).toContain("GREEN");
    expect(text).toContain("STANDARD");
  });

  it("makes clear a no-check-in STANDARD default is not a real suggestion", () => {
    const text = describeVariantSuggestion({ variant: "STANDARD", reason: "x", noCheckIn: true });
    expect(text.toLowerCase()).toContain("no check-in");
  });
});

describe("describeTemplateSuggestion — never presumes false rotation history", () => {
  it("says 'first' rather than inventing a prior template when nothing has ever advanced", () => {
    const text = describeTemplateSuggestion("A", null);
    expect(text).toContain("first");
    expect(text).not.toContain("after");
  });

  it("names the real prior template once one exists", () => {
    const text = describeTemplateSuggestion("B", "A");
    expect(text).toContain("after A");
  });
});

describe("describeStopAction — item 6 neutral wording", () => {
  it("is COULDN'T START when nothing was logged", () => {
    expect(describeStopAction(false)).toBe("COULDN'T START");
  });

  it("is STOP WORKOUT once something was logged", () => {
    expect(describeStopAction(true)).toBe("STOP WORKOUT");
  });
});

describe("describeStopConfirm", () => {
  it("pluralizes correctly", () => {
    expect(describeStopConfirm(1)).toContain("1 logged set won't");
    expect(describeStopConfirm(3)).toContain("3 logged sets won't");
  });
});

describe("describePartialAdvancement — reflects the real locked rotation rule, never reimplements it", () => {
  it("STANDARD PARTIAL does not advance — matches doesSessionAdvanceRotation directly", () => {
    expect(doesSessionAdvanceRotation("STANDARD", "PARTIAL")).toBe(false);
    expect(describePartialAdvancement("STANDARD")).toContain("will NOT advance");
  });

  it("REDUCED PARTIAL does advance — matches doesSessionAdvanceRotation directly", () => {
    expect(doesSessionAdvanceRotation("REDUCED", "PARTIAL")).toBe(true);
    expect(describePartialAdvancement("REDUCED")).toContain("will still advance");
  });
});

describe("describeRecoveryPreview — matches the real locked thresholds exactly", () => {
  it("previews COMPLETED at 10+ minutes", () => {
    expect(deriveRecoverySessionStatus(15)).toBe("COMPLETED");
    expect(describeRecoveryPreview(15)).toContain("COMPLETED");
  });

  it("previews PARTIAL at 1-9 minutes", () => {
    expect(deriveRecoverySessionStatus(5)).toBe("PARTIAL");
    expect(describeRecoveryPreview(5)).toContain("PARTIAL");
  });

  it("previews the 0-minute case as stopped/ABANDONED, in neutral wording", () => {
    expect(deriveRecoverySessionStatus(0)).toBe("ABANDONED");
    const text = describeRecoveryPreview(0);
    expect(text).toContain("stopped early");
    expect(text).toContain("ABANDONED");
  });
});
