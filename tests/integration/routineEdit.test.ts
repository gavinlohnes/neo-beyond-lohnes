import { describe, expect, it } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { createCustomTemplate, createCustomTemplateSet, updateCustomTemplate } from "../../src/application/customTemplateCommands";
import { getCustomTemplates, getSessionRoutinePoint, resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { resetRoutine, saveRoutineEdit, undoRoutineEdit } from "../../src/application/routineEditCommands";
import { getRoutineExerciseChoices, getRoutineViews } from "../../src/application/routineEditQueries";
import { getTrainingProgramme, saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { restStartSeconds, rememberRestAdjustment, restSecondsFor } from "../../src/application/restMemory";
import { getExerciseNames } from "../../src/application/exerciseLibraryQueries";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { applyRoutineEdit, validateRoutineExercises } from "../../src/domain/workout/routineEdit";
import { WORKOUT_TEMPLATES, type ExercisePrescription } from "../../src/domain/workout/types";

/**
 * GRAYSON-ROUTINE-EDIT-001 (Gavin, 2026-11-25): one editor for every routine, A, B and C included, with UNDO on every
 * save, RESET TO ORIGINAL, and the programme kept in step.
 */
const A = () => structuredClone(WORKOUT_TEMPLATES.A!.exercises);
const ids = (list: readonly ExercisePrescription[]) => list.map((ex) => ex.exerciseId);
const pick = (id: string) => getRoutineExerciseChoices().then((all) => all.find((c) => c.exerciseId === id)!);

describe("A, B and C through an override", () => {
  it("an edit to A changes the next A and nothing earlier; a workout in progress keeps its exercises", async () => {
    const day = await startDay();
    const earlier = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    const moved = applyRoutineEdit(applyRoutineEdit(A(), { kind: "MOVE", index: 1, by: -1 }), { kind: "SET", index: 0, change: { restSeconds: 120 } });
    const saved = await saveRoutineEdit("A", { exercises: moved });
    expect(saved.programmeUpdated).toBe(false);

    // The workout started before the edit reads A as it was; the next one reads his version.
    expect(ids(await resolveTemplateExercises("A", "STANDARD", await getSessionRoutinePoint(earlier)))).toEqual(ids(A()));
    const next = await resolveTemplateExercises("A", "STANDARD");
    expect(ids(next)).toEqual(["pec-deck", "machine-chest-press", "leg-press", "triceps-pressdown"]);
    expect(next[0]).toMatchObject({ sets: 3, repRangeLow: 10, repRangeHigh: 15, restSeconds: 120 });
    // REDUCED keeps its locked rule on his version: the first two, two sets each.
    expect((await resolveTemplateExercises("A", "REDUCED")).map((ex) => [ex.exerciseId, ex.sets])).toEqual([["pec-deck", 2], ["machine-chest-press", 2]]);
    // The code's dictionary never changes.
    expect(ids(WORKOUT_TEMPLATES.A!.exercises)).toEqual(ids(A()));
    // B and C are untouched.
    expect(await resolveTemplateExercises("B", "STANDARD")).toEqual(WORKOUT_TEMPLATES.B!.exercises);

    const event = (await db.events.where("type").equals("ROUTINE_EDITED").toArray())[0]!;
    expect(event).toMatchObject({ source: "USER", payload: { templateId: "A", reason: "EDIT", previous: { exercises: A() } } });
    expect(event.beyondDayId).toBeUndefined();
  });

  it("RESET TO ORIGINAL restores the code's A, and UNDO undoes the reset", async () => {
    await saveRoutineEdit("A", { exercises: applyRoutineEdit(A(), { kind: "REMOVE", index: 3 }) });
    let [viewA] = await getRoutineViews();
    expect(viewA).toMatchObject({ templateId: "A", edited: true });

    const reset = await resetRoutine("A");
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(A());
    [viewA] = await getRoutineViews();
    expect(viewA!.edited).toBe(false);
    await expect(resetRoutine("A")).rejects.toThrow("ROUTINE_NO_CHANGE");

    await undoRoutineEdit(reset.eventId);
    expect(ids(await resolveTemplateExercises("A", "STANDARD"))).toEqual(["machine-chest-press", "pec-deck", "leg-press"]);
    // Only the newest change can be undone.
    await expect(undoRoutineEdit(reset.eventId)).rejects.toThrow("ROUTINE_UNDO_STALE");
  });

  it("a swapped-in exercise keeps no foreign history; a kept one keeps its own", async () => {
    const day = await startDay();
    const first = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    for (let set = 1; set <= 3; set++) await logSet(day.id, first.id, "machine-chest-press", set, 100, 12);
    for (let set = 1; set <= 3; set++) await logSet(day.id, first.id, "pec-deck", set, 80, 15);
    await completeWorkout(day.id, first.id, "STANDARD", "COMPLETED");
    const kept = await getProgressionSuggestion("A", "STANDARD", "pec-deck");
    expect(kept.recommendation).not.toBe("NO_HISTORY");

    const bench = await pick("lib-barbell-bench-press");
    await saveRoutineEdit("A", { exercises: applyRoutineEdit(A(), { kind: "SWAP", index: 0, with: bench }) });
    const next = await resolveTemplateExercises("A", "STANDARD");
    expect(next[0]).toMatchObject({ exerciseId: "lib-barbell-bench-press", name: "Barbell Bench Press", sets: 3, repRangeLow: 6, repRangeHigh: 10, incrementLbs: 5 });
    expect((await getProgressionSuggestion("A", "STANDARD", "lib-barbell-bench-press")).recommendation).toBe("NO_HISTORY");
    expect(await getProgressionSuggestion("A", "STANDARD", "pec-deck")).toEqual(kept);
    // Adding the chest press back offers A's own movement (its id and history), not the library's twin.
    const back = (await getRoutineExerciseChoices()).filter((c) => c.name === "Machine Chest Press");
    expect(back.map((c) => c.exerciseId)).toEqual(["machine-chest-press"]);
    // History still names it, and the new exercise has its library name.
    expect((await getExerciseNames())["lib-barbell-bench-press"]).toBe("Barbell Bench Press");
  });
});

describe("the editor's rules", () => {
  it("reorder keeps each exercise's sets, reps and rest; the last can't superset", () => {
    const list = applyRoutineEdit(applyRoutineEdit(A(), { kind: "SET", index: 3, change: { sets: 5, restSeconds: 45 } }), { kind: "SET", index: 2, change: { supersetWithNext: true } });
    const moved = applyRoutineEdit(list, { kind: "MOVE", index: 3, by: -1 });
    expect(moved.map((ex) => [ex.exerciseId, ex.sets, ex.restSeconds ?? null])).toEqual([
      ["machine-chest-press", 3, null], ["pec-deck", 3, null], ["triceps-pressdown", 5, 45], ["leg-press", 3, null]]);
    expect(moved.at(-1)!.supersetWithNext).toBeUndefined();
    expect(() => applyRoutineEdit(A(), { kind: "ADD", exercise: A()[0]! })).toThrow("already in this routine");
  });

  it("refuses sets, reps and rest out of bounds, and saves nothing", async () => {
    const bad = (change: Partial<ExercisePrescription>) => [{ ...A()[0]!, ...change }];
    expect(validateRoutineExercises(bad({ sets: 0 }))).toMatch(/sets go from 1 to 10/);
    expect(validateRoutineExercises(bad({ sets: 11 }))).toMatch(/sets go from 1 to 10/);
    expect(validateRoutineExercises(bad({ repRangeHigh: 51 }))).toMatch(/reps go from 1 to 50/);
    expect(validateRoutineExercises(bad({ repRangeLow: 13, repRangeHigh: 12 }))).toMatch(/low end/);
    expect(validateRoutineExercises(bad({ restSeconds: 10 }))).toMatch(/rest goes/);
    expect(validateRoutineExercises(bad({ restSeconds: 601 }))).toMatch(/rest goes/);
    expect(validateRoutineExercises([])).toMatch(/at least one/);
    await expect(saveRoutineEdit("A", { exercises: bad({ sets: 11 }) })).rejects.toThrow("ROUTINE_INVALID");
    await expect(saveRoutineEdit("A", { exercises: A() })).rejects.toThrow("ROUTINE_NO_CHANGE");
    expect(await db.events.count()).toBe(0);
  });

  it("a routine's rest is the first rest, ± still adjusts it, and the next workout starts at the routine's rest again", () => {
    expect(restStartSeconds("leg-press", 120, false)).toBe(120);
    rememberRestAdjustment("leg-press", 15, 120);
    expect(restSecondsFor("leg-press")).toBe(135);
    // Later sets this workout: his adjusted length.
    expect(restStartSeconds("leg-press", 120, true)).toBe(135);
    // A new workout: the routine's rest.
    expect(restStartSeconds("leg-press", 120, false)).toBe(120);
    // No routine rest: the remembered rest, as before.
    expect(restStartSeconds("leg-press", undefined, false)).toBe(135);
  });
});

describe("his own routines", () => {
  it("save through the editor keeps the previous version for UNDO and a reset to as first saved", async () => {
    const mine = await createCustomTemplate({ name: "Pull", exercises: WORKOUT_TEMPLATES.B!.exercises });
    const first = await saveRoutineEdit(mine.id, { name: "Pull day", exercises: applyRoutineEdit(mine.exercises, { kind: "SET", index: 0, change: { sets: 4 } }) });
    await saveRoutineEdit(mine.id, { exercises: applyRoutineEdit((await getCustomTemplates())[0]!.exercises, { kind: "REMOVE", index: 3 }) });
    expect((await getCustomTemplates())[0]).toMatchObject({ id: mine.id, name: "Pull day" });
    expect((await getRoutineViews()).find((r) => r.templateId === mine.id)!.edited).toBe(true);
    await expect(undoRoutineEdit(first.eventId)).rejects.toThrow("ROUTINE_UNDO_STALE");

    await resetRoutine(mine.id);
    expect((await getCustomTemplates())[0]).toMatchObject({ name: "Pull", exercises: WORKOUT_TEMPLATES.B!.exercises });
    expect((await getRoutineViews()).find((r) => r.templateId === mine.id)!.edited).toBe(false);
  });

  it("a workout in progress on his routine keeps its exercises until the next one", async () => {
    const mine = await createCustomTemplate({ name: "Pull", exercises: WORKOUT_TEMPLATES.B!.exercises });
    const day = await startDay();
    const live = await startWorkout(day.id, mine.id, "STANDARD", { overrideConfirmed: true });
    await saveRoutineEdit(mine.id, { exercises: applyRoutineEdit(mine.exercises, { kind: "REMOVE", index: 0 }) });
    expect(await resolveTemplateExercises(mine.id, "STANDARD", await getSessionRoutinePoint(live))).toEqual(WORKOUT_TEMPLATES.B!.exercises);
    expect(ids(await resolveTemplateExercises(mine.id, "STANDARD"))).toEqual(ids(WORKOUT_TEMPLATES.B!.exercises.slice(1)));
  });
});

describe("the programme stays in step", () => {
  async function activeSequence() {
    const templates = await createCustomTemplateSet(["A", "B", "C"].map((key) => ({ name: `Synthetic ${key}`, exercises: WORKOUT_TEMPLATES[key]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
    return templates;
  }

  it("editing an active member writes the new snapshot in the same step, so it starts with no review and keeps his place", async () => {
    const templates = await activeSequence();
    const day = await startDay();
    const a = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
    await logSet(day.id, a.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 10);
    await completeWorkout(day.id, a.id, "STANDARD", "COMPLETED");
    expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");

    const result = await saveRoutineEdit(templates[0]!.id, { exercises: applyRoutineEdit(templates[0]!.exercises, { kind: "SET", index: 0, change: { restSeconds: 120 } }) });
    expect(result.programmeUpdated).toBe(true);
    const view = await getProgrammeView();
    expect(view.sequence).toMatchObject({ status: "READY", nextMember: { key: "B" } });
    expect(view.sequence?.members.every((m) => m.issue === null)).toBe(true);
    expect((await getTrainingProgramme()).programme).toMatchObject({ mode: "SEQUENCE", startTemplateId: templates[1]!.id });

    // UNDO keeps it in step too.
    await undoRoutineEdit(result.eventId);
    expect((await getProgrammeView()).sequence).toMatchObject({ status: "READY", nextMember: { key: "B" } });
    expect(await db.events.where("type").equals("TRAIN_PROGRAM_SET").count()).toBe(3);
  });

  it("an edit made outside the editor still shows CHANGED, and an editor save then leaves that member to his review", async () => {
    const templates = await activeSequence();
    await updateCustomTemplate(templates[1]!.id, { name: "Changed elsewhere" });
    expect((await getProgrammeView()).sequence?.members[1]?.issue).toBe("CHANGED");
    const result = await saveRoutineEdit(templates[1]!.id, { exercises: applyRoutineEdit(templates[1]!.exercises, { kind: "REMOVE", index: 0 }) });
    expect(result.programmeUpdated).toBe(false);
    expect((await getProgrammeView()).sequence?.members[1]?.issue).toBe("CHANGED");
  });
});

describe("backup", () => {
  it("a routine edit and a routine's rest round-trip through the native backup; an older backup imports with A as the original", async () => {
    const older = new File([await db.export()], "synthetic-before-routine-edits.json", { type: "application/json" });
    const version = db.verno;
    await saveRoutineEdit("A", { exercises: applyRoutineEdit(A(), { kind: "SET", index: 0, change: { restSeconds: 150 } }) });
    const mine = await createCustomTemplate({ name: "Pull", exercises: [{ ...WORKOUT_TEMPLATES.B!.exercises[0]!, restSeconds: 90 }] });
    expect(db.verno).toBe(version);
    const backup = new File([await db.export()], "synthetic-routine-edits.json", { type: "application/json" });

    await db.events.clear(); await db.customWorkoutTemplates.clear();
    await previewAnyRestore(backup); await applyAnyRestore(backup);
    expect((await resolveTemplateExercises("A", "STANDARD"))[0]!.restSeconds).toBe(150);
    expect((await getCustomTemplates()).find((t) => t.id === mine.id)!.exercises[0]!.restSeconds).toBe(90);

    await previewAnyRestore(older); await applyAnyRestore(older);
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(A());
  });
});
