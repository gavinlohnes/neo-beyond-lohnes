import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { EXERCISE_LIBRARY } from "../../src/domain/workout/exerciseLibrary";
import { howToFor, TEMPLATE_TO_LIBRARY_ID } from "../../src/domain/workout/exerciseHowTo";
import { GRAYSON_HOME_TEMPLATE_INPUTS } from "../../src/domain/workout/homeTemplates";
import { groupForExercise } from "../../src/application/exerciseByMuscle";
import { createCustomTemplateSet, updateCustomTemplate } from "../../src/application/customTemplateCommands";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { getTrainingProgramme, saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { getHomeStart, linkHomeForms, prepareHomeTemplates } from "../../src/application/homeStart";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/** GRAYSON-HOME-STRETCH-001 slice A through the application layer. */
beforeEach(async () => { await db.open(); });
afterEach(() => db.close());

const homeIds = [...new Set(GRAYSON_HOME_TEMPLATE_INPUTS.flatMap((t) => t.exercises.map((e) => e.exerciseId)))];

describe("the home moves are real library moves", () => {
  it("every HOME A/B/C move has a muscle group and a how-to, under its own home-* id", () => {
    expect(homeIds).toHaveLength(12);
    const expected: Record<string, string> = {
      "home-incline-push-up": "Chest", "home-bodyweight-squat": "Legs", "home-close-grip-push-up": "Arms", "home-dead-bug": "Core",
      "home-prone-pull-down": "Back", "home-glute-bridge": "Glutes", "home-reverse-snow-angel": "Back", "home-plank": "Core",
      "home-pike-push-up": "Shoulders", "home-split-squat": "Legs", "home-diamond-push-up": "Arms", "home-side-plank": "Core",
    };
    for (const id of homeIds) {
      expect(groupForExercise(id, []), id).toBe(expected[id]);
      const guide = howToFor(id)!;
      expect(guide, id).not.toBeNull();
      expect(guide.cues, id).toHaveLength(3);
      // The ten new guides name an easier and a harder version; the two mapped moves keep the library's own guide.
      if (!TEMPLATE_TO_LIBRARY_ID[id]) expect(guide.alternatives, id).toMatch(/Easier: .+ Harder: /);
    }
    // The two that duplicate a library move map to it; the other ten are Bodyweight library entries with their own ids.
    expect(TEMPLATE_TO_LIBRARY_ID["home-glute-bridge"]).toBe("lib-glute-bridge");
    expect(TEMPLATE_TO_LIBRARY_ID["home-plank"]).toBe("lib-plank");
    const own = EXERCISE_LIBRARY.filter((e) => e.id.startsWith("home-"));
    expect(own.map((e) => e.id).sort()).toEqual(homeIds.filter((id) => !TEMPLATE_TO_LIBRARY_ID[id]).sort());
    expect(own.every((e) => e.equipment === "Bodyweight")).toBe(true);
    expect(new Set(EXERCISE_LIBRARY.map((e) => e.name)).size).toBe(EXERCISE_LIBRARY.length); // no twin entries by name
  });
});

describe("TRAIN's HOME choice", () => {
  it("without a sequence: SET UP HOME makes HOME A, B, C once, keeps his edits, and offers them directly", async () => {
    expect(await getHomeStart()).toEqual({ kind: "SETUP_DIRECT" });
    const made = await prepareHomeTemplates();
    expect(made.map((t) => t.name)).toEqual(["Grayson HOME A", "Grayson HOME B", "Grayson HOME C"]);
    expect((await getTrainingProgramme()).programme).toBeNull(); // nothing linked or saved to the programme
    const start = await getHomeStart();
    expect(start).toMatchObject({ kind: "DIRECT", homes: made.map((t) => ({ id: t.id, name: t.name })) });
    // He edits HOME B; setting up again keeps his version and makes no duplicates.
    await updateCustomTemplate(made[1]!.id, { exercises: [made[1]!.exercises[0]!] });
    const again = await prepareHomeTemplates();
    expect(again.map((t) => t.id)).toEqual(made.map((t) => t.id));
    expect((await db.customWorkoutTemplates.get(made[1]!.id))!.exercises).toHaveLength(1);
    expect(await db.customWorkoutTemplates.count()).toBe(3);
  });

  it("with a sequence: setup links nothing until USE THESE; then START AT HOME names the next member", async () => {
    const gym = await createCustomTemplateSet((["Gym A", "Gym B", "Gym C"] as const).map((name, i) => ({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme(gym.map((t) => t.id) as [string, string, string], gym, gym[1]!.id), null);
    expect(await getHomeStart()).toMatchObject({ kind: "SETUP_SEQUENCE", members: [{ key: "A" }, { key: "B" }, { key: "C" }] });
    const revisionBefore = (await getTrainingProgramme()).id;
    const homes = await prepareHomeTemplates();
    expect((await getTrainingProgramme()).id).toBe(revisionBefore);
    expect(await getHomeStart()).toMatchObject({ kind: "SETUP_SEQUENCE" });
    await linkHomeForms(homes.map((t) => t.id) as [string, string, string]);
    const start = await getHomeStart();
    expect(start).toMatchObject({ kind: "LINKED", key: "B", templateId: homes[1]!.id, parentTemplateId: gym[1]!.id });
    // Linking kept his place in the sequence.
    expect((await getProgrammeView()).sequence?.nextMember?.templateId).toBe(gym[1]!.id);
  });

  it("a stale programme refuses the link and saves nothing", async () => {
    const gym = await createCustomTemplateSet((["Gym A", "Gym B", "Gym C"] as const).map((name, i) => ({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
    const homes = await prepareHomeTemplates();
    await expect(linkHomeForms(homes.map((t) => t.id) as [string, string, string])).rejects.toThrow(/programme changed/);
    expect((await getTrainingProgramme()).programme).toBeNull();
    void gym;
  });
});
