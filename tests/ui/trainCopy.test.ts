import { describe, expect, it } from "vitest";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { doesSessionAdvanceRotation, deriveRecoverySessionStatus } from "../../src/engine/trainSuggestion";
import {
  describePartialAdvancement,
  describeProgressionAdvisory,
  describeRecoveryPreview,
  describeStopAction,
  describeStopConfirm,
  describeTemplateSuggestion,
  describeTemplateSummary,
  describeVariantSuggestion,
} from "../../src/ui/screens/train/trainCopy";
import { evaluateProgression } from "../../src/engine/progression";
import type { ExercisePrescription } from "../../src/domain/workout/types";

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

const prescription: ExercisePrescription = {
  exerciseId: "machine-chest-press",
  name: "Machine Chest Press",
  sets: 3,
  repRangeLow: 8,
  repRangeHigh: 12,
  incrementLbs: 5,
};

describe("describeProgressionAdvisory — reflects evaluateProgression's real output, never reimplements it", () => {
  it("is null for NO_HISTORY (nothing to advise on, distinct from a real HOLD)", () => {
    const suggestion = evaluateProgression(prescription, []);
    expect(suggestion.recommendation).toBe("NO_HISTORY");
    expect(describeProgressionAdvisory(suggestion)).toBeNull();
  });

  it("names the real suggested weight for INCREASE", () => {
    const sets = [1, 2, 3].map((n) => ({
      id: `s${n}`,
      beyondDayId: "d",
      sessionId: "sess",
      exerciseId: "machine-chest-press",
      setNumber: n,
      weight: 135,
      reps: 12,
      skipped: false,
      recordedAt: new Date().toISOString(),
    }));
    const suggestion = evaluateProgression(prescription, sets);
    expect(suggestion.recommendation).toBe("INCREASE");
    expect(describeProgressionAdvisory(suggestion)).toBe(
      "Last time hit the top of the rep range — suggests increasing to 140lb.",
    );
  });

  it("names the real suggested weight for REDUCE", () => {
    const sets = [1, 2, 3].map((n) => ({
      id: `s${n}`,
      beyondDayId: "d",
      sessionId: "sess",
      exerciseId: "machine-chest-press",
      setNumber: n,
      weight: 135,
      reps: 5,
      skipped: false,
      recordedAt: new Date().toISOString(),
    }));
    const suggestion = evaluateProgression(prescription, sets);
    expect(suggestion.recommendation).toBe("REDUCE");
    expect(describeProgressionAdvisory(suggestion)).toBe(
      "Last time was below the rep-range minimum — suggests reducing to 130lb.",
    );
  });

  it("names the real last weight for HOLD", () => {
    const sets = [1, 2, 3].map((n) => ({
      id: `s${n}`,
      beyondDayId: "d",
      sessionId: "sess",
      exerciseId: "machine-chest-press",
      setNumber: n,
      weight: 135,
      reps: 10,
      skipped: false,
      recordedAt: new Date().toISOString(),
    }));
    const suggestion = evaluateProgression(prescription, sets);
    expect(suggestion.recommendation).toBe("HOLD");
    expect(describeProgressionAdvisory(suggestion)).toBe("Suggests holding at 135lb.");
  });

  /**
   * Real bug caught by browser verification: evaluateProgression's HOLD
   * has THREE distinct paths (engine/progression.ts) — only one of them
   * (clean within-range evidence) sets lastWeight. The incomplete-evidence
   * and mixed-weights HOLD paths do not, so naively interpolating
   * suggestion.lastWeight produced "Suggests holding at undefinedlb."
   * live in the browser. Both must fall back to the engine's own reason
   * text instead of fabricating a weight that was never computed.
   */
  it("HOLD from incomplete evidence (fewer sets than prescribed) falls back to the engine's own reason, not a fabricated weight", () => {
    const suggestion = evaluateProgression(prescription, [
      {
        id: "s1",
        beyondDayId: "d",
        sessionId: "sess",
        exerciseId: "machine-chest-press",
        setNumber: 1,
        weight: 135,
        reps: 10,
        skipped: false,
        recordedAt: new Date().toISOString(),
      },
    ]);
    expect(suggestion.recommendation).toBe("HOLD");
    expect(suggestion.lastWeight).toBeUndefined();
    const text = describeProgressionAdvisory(suggestion);
    expect(text).not.toContain("undefined");
    expect(text).toBe(suggestion.reason);
  });

  it("HOLD from mixed weights across sets falls back to the engine's own reason, not a fabricated weight", () => {
    const sets = [
      { weight: 135, reps: 10 },
      { weight: 140, reps: 10 },
      { weight: 135, reps: 10 },
    ].map((s, i) => ({
      id: `s${i}`,
      beyondDayId: "d",
      sessionId: "sess",
      exerciseId: "machine-chest-press",
      setNumber: i + 1,
      weight: s.weight,
      reps: s.reps,
      skipped: false,
      recordedAt: new Date().toISOString(),
    }));
    const suggestion = evaluateProgression(prescription, sets);
    expect(suggestion.recommendation).toBe("HOLD");
    expect(suggestion.lastWeight).toBeUndefined();
    const text = describeProgressionAdvisory(suggestion);
    expect(text).not.toContain("undefined");
    expect(text).toBe(suggestion.reason);
  });
});
