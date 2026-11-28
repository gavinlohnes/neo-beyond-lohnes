import "dexie-export-import";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDay, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { getWorkoutSessionRecord } from "../../src/application/trainHistoryQueries";
import { getAllRecords } from "../../src/application/personalRecordQueries";
import { getRecordsExport } from "../../src/application/recordsExport";
import { getExerciseNames } from "../../src/application/exerciseLibraryQueries";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { getCustomExercises } from "../../src/application/exerciseLibraryQueries";
import { saveRoutineEdit } from "../../src/application/routineEditCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { countOpenMatches, filterRoutineExerciseChoices, getRoutineExerciseChoices, OPEN_CHOICES_SHOWN } from "../../src/application/routineEditQueries";
import {
  copyOpenExerciseToMine, getOpenLibrary, getOpenLibraryPrefs, getVisibleOpenExercises, hideOpenExercise, OPEN_LIBRARY_KEY, setShowStretches,
  showHiddenOpenExercises,
} from "../../src/application/openLibrary";
import { TRAVELLING_SETTINGS } from "../../src/persistence/settingsTransfer";
import { db } from "../../src/persistence/db";
import { EXERCISE_LIBRARY } from "../../src/domain/workout/exerciseLibrary";
import {
  mapOpenExercises, normalizeExerciseName, OPEN_MUSCLE_GROUP, OPEN_SHOWN_CATEGORIES, searchOpenExercises, visibleOpenExercises, type OpenExerciseFile,
} from "../../src/domain/workout/openLibrary";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * GRAYSON-OPEN-LIBRARY-001: the open exercise library. The muscle table against every value in the file, the shown
 * categories, his names winning, stable ids, the lazy load, an open exercise logging/progressing/exporting like his
 * own, HIDE and EDIT (copy).
 */
const FILE = JSON.parse(readFileSync("src/data/openExercises.json", "utf8")) as OpenExerciseFile;
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const go = (d: Date) => vi.setSystemTime(d);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  go(at(2, 17));
  localStorage.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

describe("GRAYSON-OPEN-LIBRARY-001 the bundled file", () => {
  it("is free-exercise-db at the pinned commit, Unlicense, the same commit the script pins and NOTICE names", () => {
    const script = readFileSync("scripts/build-open-exercises.mjs", "utf8");
    const pinned = /PINNED_COMMIT = "([0-9a-f]{40})"/.exec(script)![1]!;
    expect(FILE.commit).toBe(pinned);
    expect(FILE.licence).toMatch(/Unlicense/);
    expect(readFileSync("NOTICE", "utf8")).toContain(pinned);
    expect(FILE.exercises.length).toBeGreaterThan(800);
    // Under the brief's 1 MB stop line.
    expect(statSync("src/data/openExercises.json").size).toBeLessThan(1_000_000);
  });

  it("the muscle table covers every primary muscle in the file, and every entry maps", () => {
    const primaries = new Set(FILE.exercises.map((ex) => ex.primary));
    for (const muscle of primaries) expect(OPEN_MUSCLE_GROUP[muscle], muscle).toBeDefined();
    expect(mapOpenExercises(FILE)).toHaveLength(FILE.exercises.length);
    expect(OPEN_MUSCLE_GROUP.quadriceps).toBe("Legs");
    expect(OPEN_MUSCLE_GROUP.lats).toBe("Back");
    expect(OPEN_MUSCLE_GROUP.triceps).toBe("Arms");
    expect(OPEN_MUSCLE_GROUP.abdominals).toBe("Core");
  });

  it("ids are fedb- plus the dataset's id: unique, stable, never one of his", () => {
    const ids = FILE.exercises.map((ex) => ex.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^fedb-[A-Za-z0-9_-]+$/.test(id))).toBe(true);
    // Pinned examples: the same id for the same movement across regenerations of this commit.
    expect(FILE.exercises.find((ex) => ex.id === "fedb-Cable_Chest_Press")).toMatchObject({ name: "Cable Chest Press", equipment: "Cable" });
    expect(FILE.exercises.find((ex) => ex.id === "fedb-Barbell_Squat")).toMatchObject({ name: "Barbell Squat", primary: "quadriceps" });
    const own = new Set([...EXERCISE_LIBRARY.map((ex) => ex.id), ...Object.values(WORKOUT_TEMPLATES).flatMap((t) => t.exercises.map((ex) => ex.exerciseId))]);
    expect(ids.some((id) => own.has(id))).toBe(false);
  });

  it("strength, powerlifting, olympic, strongman and plyometrics show; stretching and cardio only with Show stretches", () => {
    const all = mapOpenExercises(FILE);
    const shown = visibleOpenExercises(all, { hidden: new Set(), showStretches: false, ownNames: [] });
    expect(new Set(shown.map((ex) => ex.category))).toEqual(OPEN_SHOWN_CATEGORIES);
    const withStretches = visibleOpenExercises(all, { hidden: new Set(), showStretches: true, ownNames: [] });
    expect(new Set(withStretches.map((ex) => ex.category))).toEqual(new Set([...OPEN_SHOWN_CATEGORIES, "stretching", "cardio"]));
  });

  it("his name wins on a duplicate, ignoring case and punctuation", () => {
    expect(normalizeExerciseName("Chin-Up")).toBe(normalizeExerciseName("chin up"));
    const all = mapOpenExercises(FILE);
    const shown = visibleOpenExercises(all, { hidden: new Set(), showStretches: true, ownNames: EXERCISE_LIBRARY.map((ex) => ex.name) });
    const libraryNames = new Set(EXERCISE_LIBRARY.map((ex) => normalizeExerciseName(ex.name)));
    expect(shown.some((ex) => libraryNames.has(normalizeExerciseName(ex.name)))).toBe(false);
    expect(all.some((ex) => ex.name === "Cable Crossover")).toBe(true);
    expect(shown.some((ex) => ex.name === "Cable Crossover")).toBe(false);
  });

  it("loads lazily: nothing imports the file or the loader statically", () => {
    const files: string[] = [];
    const walk = (dir: string) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(p)) files.push(p); } };
    walk("src");
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(/import[^;()]*from\s+"[^"]*data\/openExercises\.json"/.test(text), file).toBe(false);
      if (!file.endsWith("application/openLibrary.ts")) {
        // Only ExerciseLibraryScreen (inside MORE's own chunk) may import the loader statically; the rest load it on use.
        const statically = /import[^;()]*from\s+"[^"]*application\/openLibrary"/.test(text);
        expect(statically && !file.endsWith("ExerciseLibraryScreen.tsx"), file).toBe(false);
      }
    }
  });
});

describe("GRAYSON-OPEN-LIBRARY-001 in the app", () => {
  it("search shows his own first, then open ones; the empty picker lists none of the open set", async () => {
    const choices = await getRoutineExerciseChoices({ open: true });
    expect(filterRoutineExerciseChoices(choices, "").some((c) => c.open)).toBe(false);
    const cable = filterRoutineExerciseChoices(choices, "cable");
    const firstOpen = cable.findIndex((c) => c.open);
    expect(firstOpen).toBeGreaterThan(0);
    expect(cable.slice(firstOpen).every((c) => c.open)).toBe(true);
    expect(cable.slice(0, firstOpen).map((c) => c.name)).toContain("Cable Crossover");
    expect(cable.filter((c) => c.name === "Cable Crossover")).toHaveLength(1);
    expect(cable.find((c) => c.exerciseId === "fedb-Cable_Chest_Press")).toMatchObject({ repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 });
    expect(cable.find((c) => c.exerciseId === "fedb-Cable_Chest_Press")!.detail).toMatch(/^Chest.* · Cable · open set$/);
    // At most 40 open at once; the count says how many in all.
    const all = filterRoutineExerciseChoices(choices, "e");
    expect(all.filter((c) => c.open)).toHaveLength(OPEN_CHOICES_SHOWN);
    expect(countOpenMatches(choices, "e")).toBeGreaterThan(OPEN_CHOICES_SHOWN);
    // Without asking, the picker's callers (swap suggestions) never load or list the open set.
    expect((await getRoutineExerciseChoices()).some((c) => c.open)).toBe(false);
  });

  it("HIDE takes one out of search; SHOW THEM AGAIN brings it back; stretches show on his switch; the choices travel", async () => {
    expect(TRAVELLING_SETTINGS[OPEN_LIBRARY_KEY]).toBeTruthy();
    const before = await getVisibleOpenExercises();
    expect(before.some((ex) => ex.id === "fedb-Cable_Chest_Press")).toBe(true);
    hideOpenExercise("fedb-Cable_Chest_Press");
    expect((await getVisibleOpenExercises()).some((ex) => ex.id === "fedb-Cable_Chest_Press")).toBe(false);
    expect(filterRoutineExerciseChoices(await getRoutineExerciseChoices({ open: true }), "cable chest").some((c) => c.exerciseId === "fedb-Cable_Chest_Press")).toBe(false);
    showHiddenOpenExercises();
    expect(getOpenLibraryPrefs().hidden).toEqual([]);
    expect(before.some((ex) => ex.category === "stretching")).toBe(false);
    setShowStretches(true);
    expect((await getVisibleOpenExercises()).some((ex) => ex.category === "stretching")).toBe(true);
  });

  it("EDIT copies one into his exercises (8–12, its steps as the note) and hides the original; his own name wins after", async () => {
    const mine = await copyOpenExerciseToMine("fedb-Cable_Chest_Press");
    expect(mine).toMatchObject({ name: "Cable Chest Press", muscleGroup: "Chest", equipment: "Cable", repRangeLow: 8, repRangeHigh: 12, libraryExerciseId: "fedb-Cable_Chest_Press" });
    expect(mine.notes).toContain((await getOpenLibrary()).find((ex) => ex.id === "fedb-Cable_Chest_Press")!.steps[0]);
    expect((await getCustomExercises()).map((ex) => ex.name)).toContain("Cable Chest Press");
    expect((await getVisibleOpenExercises()).some((ex) => ex.id === "fedb-Cable_Chest_Press")).toBe(false);
    // Even shown again, his own exercise of that name wins.
    showHiddenOpenExercises();
    expect((await getVisibleOpenExercises()).some((ex) => ex.name === "Cable Chest Press")).toBe(false);
    // Any of his own exercise names wins the same way.
    await createCustomExercise({ name: "barbell squat", muscleGroup: "Legs", equipment: "Barbell", repRangeLow: 5, repRangeHigh: 8 });
    expect((await getVisibleOpenExercises()).some((ex) => ex.id === "fedb-Barbell_Squat")).toBe(false);
  });

  it("an open exercise in a routine logs, progresses, sets a record and exports like his own, named by the routine", async () => {
    const choice = (await getRoutineExerciseChoices({ open: true })).find((c) => c.exerciseId === "fedb-Cable_Chest_Press")!;
    const routine = await resolveTemplateExercises("A", "STANDARD");
    await saveRoutineEdit("A", { exercises: [...routine, { exerciseId: choice.exerciseId, name: choice.name, sets: 3, repRangeLow: 8, repRangeHigh: 12, incrementLbs: choice.incrementLbs }] });
    const ID = "fedb-Cable_Chest_Press";
    for (const [day, weight, reps] of [[2, 50, 12], [9, 55, 12]] as const) {
      go(at(day, 16, 30));
      const d = await startDay(at(day, 16, 30).toISOString());
      await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
      go(at(day, 18));
      const s = await startWorkout(d.id, "A", "STANDARD");
      for (const n of [1, 2, 3]) { go(at(day, 18, n)); await logSet(d.id, s.id, ID, n, weight, reps); }
      go(at(day, 18, 30));
      await completeWorkout(d.id, s.id, "STANDARD", "PARTIAL");
      go(at(day + 1, 16, 29));
      await endDay(d.id);
      // History names it from the routine.
      expect((await getWorkoutSessionRecord(s.id))!.exercises.find((ex) => ex.exerciseId === ID)!.name).toBe("Cable Chest Press");
    }
    expect(await getProgressionSuggestion("A", "STANDARD", ID, at(10, 12))).toMatchObject({ recommendation: "INCREASE", lastWeight: 55, suggestedNextWeight: 60 });
    expect((await getAllRecords()).find((r) => r.exerciseId === ID)).toMatchObject({ exerciseName: "Cable Chest Press", record: { kind: "HEAVIEST", weight: 55 } });
    expect((await getExerciseNames())[ID]).toBe("Cable Chest Press");
    const csv = await getRecordsExport("workouts");
    expect(csv.rows.filter((r) => r[4] === "Cable Chest Press")).toHaveLength(6);
  });

  it("search matches name, group, muscle and equipment", () => {
    const all = mapOpenExercises(FILE);
    expect(searchOpenExercises(all, "hamstrings").every((ex) => ex.primary === "hamstrings" || ex.secondary.includes("hamstrings") || ex.name.toLowerCase().includes("hamstrings"))).toBe(true);
    expect(searchOpenExercises(all, "kettlebell").length).toBeGreaterThan(20);
  });
});
