import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { getTrainingProgramme, saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { saveRoutineEdit } from "../../src/application/routineEditCommands";
import { getHomeMoveChoices, getHomeTwinView, proposeHomeTwin, saveHomeTwin } from "../../src/application/homeTwin";
import { getHomeStart } from "../../src/application/homeStart";
import { groupForExercise } from "../../src/application/exerciseByMuscle";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/** GRAYSON-HOME-STRETCH-001 slice C through the application layer. */
beforeEach(async () => { await db.open(); });
afterEach(() => db.close());

describe("the home twin", () => {
  it("BUILD TWIN on Workout A: each lift maps to a home move of the same muscle group; nothing saves until SAVE TWIN", async () => {
    const rows = await proposeHomeTwin("A");
    for (const row of rows) {
      expect(row.to, row.from.name).not.toBeNull();
      expect(groupForExercise(row.to!.exerciseId, []), row.from.name).toBe(groupForExercise(row.from.exerciseId, []));
      expect(row.to!.exerciseId).toMatch(/^home-/);
      expect(row.to!.sets).toBe(row.from.sets);
    }
    expect(rows.map((r) => r.to!.name)).toEqual(["Incline Push-Up", "Incline Push-Up", "Bodyweight Squat", "Close-Grip Push-Up"]);
    expect(await db.customWorkoutTemplates.count()).toBe(0);
    const before = await db.events.count();
    expect((await getHomeTwinView("A"))?.twin).toBeNull();
    expect(await db.events.count()).toBe(before);
  });

  it("SAVE TWIN for a routine outside a sequence: his own bodyweight routine, offered by TRAIN's HOME choice", async () => {
    const { text } = await saveHomeTwin("A", await proposeHomeTwin("A"));
    expect(text).toBe("Workout A · HOME saved. Start it from HOME on TRAIN.");
    const twin = (await getHomeTwinView("A"))!.twin!;
    expect(twin).toMatchObject({ name: "Workout A · HOME", linked: false });
    // The two chest lifts share the one chest home move, sets added: 3 + 3.
    expect(twin.exercises.map((e) => [e.name, e.sets])).toEqual([["Incline Push-Up", 6], ["Bodyweight Squat", 3], ["Close-Grip Push-Up", 2]]);
    expect(await getHomeStart()).toMatchObject({ kind: "DIRECT", homes: [{ name: "Workout A · HOME" }] });
  });

  it("for a sequence member it's that member's HOME form; after an edit, UPDATE TWIN updates it and keeps the programme in step", async () => {
    const gym = await createCustomTemplateSet((["Gym A", "Gym B", "Gym C"] as const).map((name, i) => ({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme(gym.map((t) => t.id) as [string, string, string], gym), null);
    const rows = await proposeHomeTwin(gym[0]!.id);
    // He changes one pick: the squat becomes a split squat.
    const split = (await getHomeMoveChoices()).find((m) => m.exerciseId === "home-split-squat")!;
    const changed = rows.map((r) => (r.to?.exerciseId === "home-bodyweight-squat" ? { ...r, to: { ...r.to, exerciseId: split.exerciseId, name: split.name } } : r));
    expect((await saveHomeTwin(gym[0]!.id, changed)).text).toBe("Gym A · HOME saved as your HOME A.");
    const view = await getProgrammeView();
    const home = view.sequence!.nextMember!.home!;
    expect(home).toMatchObject({ name: "Gym A · HOME", issue: null });
    expect(await getHomeStart()).toMatchObject({ kind: "LINKED", key: "A", templateId: home.templateId });

    // He edits Gym A (drops the pec deck); UPDATE TWIN rebuilds and saves through the routine editor, in step.
    await saveRoutineEdit(gym[0]!.id, { exercises: gym[0]!.exercises.filter((e) => e.exerciseId !== "pec-deck") });
    const revisionBefore = (await getTrainingProgramme()).id;
    await saveHomeTwin(gym[0]!.id, await proposeHomeTwin(gym[0]!.id));
    const twin = (await getHomeTwinView(gym[0]!.id))!.twin!;
    expect(twin).toMatchObject({ templateId: home.templateId, linked: true });
    expect(twin.exercises.find((e) => e.exerciseId === "home-incline-push-up")!.sets).toBe(3);
    expect((await getTrainingProgramme()).id).not.toBe(revisionBefore);
    expect((await getProgrammeView()).sequence!.nextMember!.home!.issue).toBeNull();
  });

  it("dropping every row saves nothing", async () => {
    await expect(saveHomeTwin("A", [])).rejects.toThrow("A twin needs at least one home move.");
    expect(await db.customWorkoutTemplates.count()).toBe(0);
  });
});
