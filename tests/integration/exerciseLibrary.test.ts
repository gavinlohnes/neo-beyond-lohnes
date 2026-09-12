import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
// Side-effect import: extends Dexie.prototype with export()/import(), same
// as persistence/backup.ts's own top-level import — needed directly here
// since this file calls db.export()/db.import() without going through
// backup.ts's own wrapper functions.
import "dexie-export-import";
import {
  archiveCustomExercise,
  createCustomExercise,
  updateCustomExercise,
} from "../../src/application/exerciseLibraryCommands";
import { getCustomExercises } from "../../src/application/exerciseLibraryQueries";
import { EXERCISE_LIBRARY, searchLibraryExercises } from "../../src/domain/workout/exerciseLibrary";

/**
 * TRAIN-CREATE-001 (Personal Exercise Library, High-Risk Drop): same
 * "directly-mutable preset, no event trail of its own" pattern already
 * proven for SavedMeal (tests/integration/nutritionMealMemory.test.ts),
 * verified independently here for CustomExercise.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

async function makeExercise(
  overrides: Partial<{ name: string; muscleGroup: "Chest" | "Back" | "Shoulders" | "Legs" | "Glutes" | "Arms" | "Core" | "Full Body"; equipment: string; repRangeLow: number; repRangeHigh: number }> = {},
) {
  return createCustomExercise({
    name: "Incline Dumbbell Press",
    muscleGroup: "Chest",
    equipment: "Dumbbell",
    repRangeLow: 8,
    repRangeHigh: 12,
    ...overrides,
  });
}

describe("CustomExercise CRUD — directly mutable, no event trail of its own", () => {
  it("creates a custom exercise and it appears in the active list", async () => {
    const exercise = await makeExercise();
    const list = await getCustomExercises();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(exercise.id);
    expect(list[0]!.name).toBe("Incline Dumbbell Press");
  });

  it("updates change the record's current fields in place", async () => {
    const exercise = await makeExercise();
    await updateCustomExercise(exercise.id, { equipment: "Machine", repRangeLow: 10 });
    const [updated] = await getCustomExercises();
    expect(updated!.equipment).toBe("Machine");
    expect(updated!.repRangeLow).toBe(10);
    expect(updated!.repRangeHigh).toBe(12); // untouched field preserved
  });

  it("archiving removes an exercise from the active list without deleting it", async () => {
    const exercise = await makeExercise();
    await archiveCustomExercise(exercise.id);
    expect(await getCustomExercises()).toHaveLength(0);
    const all = await getCustomExercises({ includeArchived: true });
    expect(all).toHaveLength(1);
    expect(all[0]!.archivedAt).toBeDefined();
  });

  it("archiving is idempotent, matching archiveSavedMeal's precedent", async () => {
    const exercise = await makeExercise();
    await archiveCustomExercise(exercise.id);
    await expect(archiveCustomExercise(exercise.id)).resolves.toBeUndefined();
  });

  it("rejects operating on a nonexistent CustomExercise", async () => {
    await expect(updateCustomExercise("does-not-exist", { equipment: "Cable" })).rejects.toThrow(/CUSTOM_EXERCISE_NOT_FOUND/);
    await expect(archiveCustomExercise("does-not-exist")).rejects.toThrow(/CUSTOM_EXERCISE_NOT_FOUND/);
  });

  it("rejects an invalid rep range (high below low)", async () => {
    await expect(makeExercise({ repRangeLow: 12, repRangeHigh: 8 })).rejects.toThrow();
  });

  it("records provenance when seeded from the reference library, and it survives edits", async () => {
    const libEntry = EXERCISE_LIBRARY[0]!;
    const exercise = await createCustomExercise({
      name: libEntry.name,
      muscleGroup: libEntry.muscleGroup,
      equipment: libEntry.equipment,
      repRangeLow: libEntry.repRangeLow,
      repRangeHigh: libEntry.repRangeHigh,
      libraryExerciseId: libEntry.id,
    });
    expect(exercise.libraryExerciseId).toBe(libEntry.id);
    await updateCustomExercise(exercise.id, { name: "Renamed" });
    const [updated] = await getCustomExercises();
    expect(updated!.libraryExerciseId).toBe(libEntry.id);
    expect(updated!.name).toBe("Renamed");
  });
});

describe("searchLibraryExercises — pure domain data, not persisted", () => {
  it("an empty query returns the full reference list", () => {
    expect(searchLibraryExercises("")).toHaveLength(EXERCISE_LIBRARY.length);
  });

  it("filters by name, muscle group, or equipment, case-insensitively", () => {
    expect(searchLibraryExercises("bench press").some((e) => e.name === "Barbell Bench Press")).toBe(true);
    expect(searchLibraryExercises("glutes").every((e) => e.muscleGroup === "Glutes")).toBe(true);
    expect(searchLibraryExercises("BARBELL").every((e) => e.equipment === "Barbell")).toBe(true);
  });

  it("a query matching nothing returns an empty list, never throws", () => {
    expect(searchLibraryExercises("no such exercise exists")).toEqual([]);
  });
});

/**
 * High-Risk Drop compatibility evidence: customExercises is a new table —
 * this proves it survives a real native backup export/import round trip
 * (same db.export()/db.import() persistence/backup.ts's exportBackup/
 * applyRestore call), exactly the "backup-restore round-trip, explicit
 * results" evidence a High-Risk report requires.
 */
describe("Backup/restore round-trip — CustomExercise survives", () => {
  it("a CustomExercise survives a real export -> clear -> import cycle", async () => {
    const exercise = await makeExercise();
    await updateCustomExercise(exercise.id, { notes: "Slight incline, controlled tempo" });

    const blob = await db.export({ prettyJson: true });
    const file = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await createCustomExercise({ name: "Divergent Exercise", muscleGroup: "Core", equipment: "Bodyweight", repRangeLow: 1, repRangeHigh: 1 });
    expect(await getCustomExercises()).toHaveLength(2);

    await db.import(file, { clearTablesBeforeImport: true });

    const restored = await getCustomExercises();
    expect(restored).toHaveLength(1);
    expect(restored[0]!.name).toBe("Incline Dumbbell Press");
    expect(restored[0]!.notes).toBe("Slight incline, controlled tempo");
  });
});
