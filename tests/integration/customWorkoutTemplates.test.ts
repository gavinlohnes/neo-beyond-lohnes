import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: extends Dexie.prototype with export()/import(), same
// as persistence/backup.ts's own top-level import.
import "dexie-export-import";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion, getCurrentProgressionSuggestions } from "../../src/application/trainQueries";
import {
  archiveCustomTemplate,
  createCustomTemplate,
  updateCustomTemplate,
} from "../../src/application/customTemplateCommands";
import {
  getCustomTemplates,
  resolveTemplateDefinition,
  resolveTemplateExercises,
  resolvePrescription,
} from "../../src/application/customTemplateQueries";

/**
 * TRAIN-CREATE-002 (Custom Workout Templates, High-Risk Drop): same
 * "directly-mutable preset, no event trail of its own" pattern already
 * proven for CustomExercise/SavedMeal, verified independently here for
 * CustomWorkoutTemplate, plus the resolver seam that lets a custom
 * template's id flow through the same real trainCommands/trainQueries
 * path a built-in "A"/"B"/"C" id already uses.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function makeTemplate(name = "Push Day") {
  return createCustomTemplate({
    name,
    exercises: [
      { exerciseId: "custom-bench", name: "Bench Press", sets: 3, repRangeLow: 6, repRangeHigh: 10, incrementLbs: 5 },
      { exerciseId: "custom-ohp", name: "Overhead Press", sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 },
    ],
  });
}

describe("CustomWorkoutTemplate CRUD — directly mutable, no event trail of its own", () => {
  it("creates a template and it appears in the active list", async () => {
    const template = await makeTemplate();
    const list = await getCustomTemplates();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(template.id);
    expect(list[0]!.exercises).toHaveLength(2);
  });

  it("updates change the record's current fields in place", async () => {
    const template = await makeTemplate();
    await updateCustomTemplate(template.id, { name: "Renamed Push Day" });
    const [updated] = await getCustomTemplates();
    expect(updated!.name).toBe("Renamed Push Day");
    expect(updated!.exercises).toHaveLength(2); // untouched field preserved
  });

  it("archiving removes a template from the active list without deleting it", async () => {
    const template = await makeTemplate();
    await archiveCustomTemplate(template.id);
    expect(await getCustomTemplates()).toHaveLength(0);
    const all = await getCustomTemplates({ includeArchived: true });
    expect(all).toHaveLength(1);
    expect(all[0]!.archivedAt).toBeDefined();
  });

  it("archiving is idempotent, matching archiveCustomExercise's precedent", async () => {
    const template = await makeTemplate();
    await archiveCustomTemplate(template.id);
    await expect(archiveCustomTemplate(template.id)).resolves.toBeUndefined();
  });

  it("rejects operating on a nonexistent template", async () => {
    await expect(updateCustomTemplate("does-not-exist", { name: "X" })).rejects.toThrow(/CUSTOM_TEMPLATE_NOT_FOUND/);
    await expect(archiveCustomTemplate("does-not-exist")).rejects.toThrow(/CUSTOM_TEMPLATE_NOT_FOUND/);
  });

  it("rejects a template with zero exercises", async () => {
    await expect(createCustomTemplate({ name: "Empty", exercises: [] })).rejects.toThrow();
  });

  it("rejects an exercise slot with an invalid rep range", async () => {
    await expect(
      createCustomTemplate({
        name: "Bad Range",
        exercises: [{ exerciseId: "x", name: "X", sets: 3, repRangeLow: 12, repRangeHigh: 8, incrementLbs: 5 }],
      }),
    ).rejects.toThrow();
  });
});

describe("resolveTemplateDefinition / resolveTemplateExercises / resolvePrescription", () => {
  it("resolves a built-in template exactly as WORKOUT_TEMPLATES defines it", async () => {
    const definition = await resolveTemplateDefinition("A");
    expect(definition).toBeDefined();
    expect(definition!.exercises.map((e) => e.exerciseId)).toContain("machine-chest-press");
  });

  it("resolves a custom template's own exercises", async () => {
    const template = await makeTemplate();
    const definition = await resolveTemplateDefinition(template.id);
    expect(definition).toBeDefined();
    expect(definition!.exercises).toHaveLength(2);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await resolveTemplateDefinition("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an archived custom template", async () => {
    const template = await makeTemplate();
    await archiveCustomTemplate(template.id);
    expect(await resolveTemplateDefinition(template.id)).toBeUndefined();
  });

  it("applies the same REDUCED first-two-exercises rule to a custom template as a built-in one", async () => {
    const template = await makeTemplate();
    const reduced = await resolveTemplateExercises(template.id, "REDUCED");
    expect(reduced).toHaveLength(2);
    expect(reduced.every((ex) => ex.sets === 2)).toBe(true);
  });

  it("resolvePrescription finds a custom template's exercise by id", async () => {
    const template = await makeTemplate();
    const prescription = await resolvePrescription(template.id, "STANDARD", "custom-bench");
    expect(prescription).toBeDefined();
    expect(prescription!.name).toBe("Bench Press");
  });

  it("resolvePrescription returns undefined for an unknown exercise within a real custom template", async () => {
    const template = await makeTemplate();
    expect(await resolvePrescription(template.id, "STANDARD", "not-in-this-template")).toBeUndefined();
  });
});

describe("A custom template through a real workout session end to end", () => {
  it("starts a workout, logs sets, completes, and produces progression advisory on a second session", async () => {
    const template = await makeTemplate();
    const day1 = await startDay();

    const session1 = await startWorkout(day1.id, template.id, "STANDARD", { overrideConfirmed: true });
    expect(session1.templateId).toBe(template.id);

    await logSet(day1.id, session1.id, "custom-bench", 1, 135, 8);
    await logSet(day1.id, session1.id, "custom-bench", 2, 135, 8);
    await logSet(day1.id, session1.id, "custom-bench", 3, 135, 8);
    await completeWorkout(day1.id, session1.id, "STANDARD", "COMPLETED");

    const firstSuggestion = await getProgressionSuggestion(template.id, "STANDARD", "custom-bench");
    expect(firstSuggestion.recommendation).not.toBe("NO_HISTORY");

    // A second session against the same custom template should have real
    // history to evaluate against — proves the (templateId, sessionType,
    // exerciseId) resolution path works for a custom id exactly like it
    // already does for a built-in one.
    const day2 = await startDay();
    const session2 = await startWorkout(day2.id, template.id, "STANDARD", { overrideConfirmed: true });
    await logSet(day2.id, session2.id, "custom-bench", 1, 135, 8);

    const includedInBrief = (await getCurrentProgressionSuggestions()).some(
      (entry) => entry.templateId === template.id && entry.prescription.exerciseId === "custom-bench",
    );
    expect(includedInBrief).toBe(true);
  });

  it("archiving a custom template mid-use does not break its already-logged workout session", async () => {
    const template = await makeTemplate();
    const day = await startDay();
    const session = await startWorkout(day.id, template.id, "STANDARD", { overrideConfirmed: true });
    await logSet(day.id, session.id, "custom-bench", 1, 135, 8);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");

    await archiveCustomTemplate(template.id);

    // The session's own stored templateId is untouched — archiving only
    // removes the template from the active picker/resolver, matching
    // archiveCustomExercise/archiveSavedMeal's non-destructive precedent.
    const stillStored = await db.workoutSessions.get(session.id);
    expect(stillStored!.templateId).toBe(template.id);
    expect(await resolveTemplateDefinition(template.id)).toBeUndefined();
  });
});

/**
 * High-Risk Drop compatibility evidence: customWorkoutTemplates is a new
 * table — this proves it survives a real native backup export/import
 * round trip.
 */
describe("Backup/restore round-trip — CustomWorkoutTemplate survives", () => {
  it("a CustomWorkoutTemplate survives a real export -> clear -> import cycle", async () => {
    const template = await makeTemplate();
    await updateCustomTemplate(template.id, { name: "Renamed Push Day" });

    const blob = await db.export({ prettyJson: true });
    const file = new File([blob], "native-backup.json", { type: "application/json" });

    await createCustomTemplate({
      name: "Divergent Template",
      exercises: [{ exerciseId: "x", name: "X", sets: 1, repRangeLow: 1, repRangeHigh: 1, incrementLbs: 5 }],
    });
    expect(await getCustomTemplates()).toHaveLength(2);

    await db.import(file, { clearTablesBeforeImport: true });

    const restored = await getCustomTemplates();
    expect(restored).toHaveLength(1);
    expect(restored[0]!.name).toBe("Renamed Push Day");
    expect(restored[0]!.exercises).toHaveLength(2);
  });
});
