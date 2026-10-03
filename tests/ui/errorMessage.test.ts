import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeError, NO_CHANGES_MESSAGE } from "../../src/ui/errorMessage";
import { nutritionTargetsInputSchema } from "../../src/persistence/nutritionTargetValidation";
import { savedMealModifyInputSchema } from "../../src/persistence/nutritionValidation";
import { decisionJournalEntryModifyInputSchema } from "../../src/persistence/journalValidation";
import { customExerciseModifyInputSchema } from "../../src/persistence/exerciseValidation";

/** HOTFIX (owner ruling 2026-10-03): no raw validation JSON on any screen. */
function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error("expected a throw");
}

describe("describeError", () => {
  it("turns the shared 'At least one field must change' check into plain 'No changes.'", () => {
    for (const schema of [nutritionTargetsInputSchema, savedMealModifyInputSchema, decisionJournalEntryModifyInputSchema, customExerciseModifyInputSchema] as z.ZodType[]) {
      const e = thrown(() => schema.parse({}));
      expect((e as Error).message.trim().startsWith("[")).toBe(true); // what used to reach the screen
      expect(describeError(e, "Could not save.")).toBe(NO_CHANGES_MESSAGE);
    }
  });

  it("shows other validation issues as sentences, never JSON", () => {
    const e = thrown(() => z.object({ name: z.string().min(1, "Meal name is required") }).parse({ name: "" }));
    expect(describeError(e, "Could not save.")).toBe("Meal name is required.");
  });

  it("strips CODE: prefixes, and falls back for bare codes, JSON and non-errors", () => {
    expect(describeError(new Error("SAVED_MEAL_NOT_FOUND: no saved meal with id 1."), "x")).toBe("No saved meal with id 1.");
    expect(describeError(new Error("CORRECTION_TARGET_NOT_FOUND"), "Correction failed.")).toBe("Correction failed.");
    expect(describeError(new Error('[{"code":"custom"}]'), "Could not save.")).toBe("Could not save.");
    expect(describeError("boom", "Could not save.")).toBe("Could not save.");
    expect(describeError(new Error("Something specific"), "x")).toBe("Something specific.");
  });
});
