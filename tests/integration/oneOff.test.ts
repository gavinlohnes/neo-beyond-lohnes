import { describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getLastAdvancingTemplate, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { getCustomTemplates } from "../../src/application/customTemplateQueries";
import { getRoutineExerciseChoices } from "../../src/application/routineEditQueries";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { rememberRestAdjustment } from "../../src/application/restMemory";
import { addExerciseToSession, getChangesToKeep, getOneOffRoutineDraft, getWorkoutPlan, oneOffRoutineName, saveSessionAsRoutine } from "../../src/application/workoutChanges";
import { describeHistoryTitle, templateLabel } from "../../src/ui/screens/train/trainCopy";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/** GRAYSON-ONE-OFF-001 (Gavin, 2026-11-25): an empty one-off workout that never moves the A, B, C turn. */
const choice = async (id: string) => (await getRoutineExerciseChoices()).find((c) => c.exerciseId === id)!;

async function oneOff(log: [string, number, number][] = []) {
  const day = await startDay();
  const session = await startWorkout(day.id, null, "STANDARD", { overrideConfirmed: true });
  for (const [id] of log) if (!(await getWorkoutPlan(session)).today.some((ex) => ex.exerciseId === id)) await addExerciseToSession(session.id, await choice(id));
  let n = 0;
  for (const [id, weight, reps] of log) await logSet(day.id, session.id, id, ++n, weight, reps);
  return { day, session };
}

describe("an empty workout", () => {
  it("starts live with no exercises, and ADD works there", async () => {
    const day = await startDay();
    const session = await startWorkout(day.id, null, "STANDARD", { overrideConfirmed: true });
    expect(session).toMatchObject({ status: "ACTIVE", templateId: "", sessionType: "STANDARD" });
    expect((await getWorkoutPlan(session)).today).toEqual([]);
    await addExerciseToSession(session.id, await choice("lib-barbell-curl"));
    expect((await getWorkoutPlan(session)).today.map((ex) => [ex.exerciseId, ex.sets])).toEqual([["lib-barbell-curl", 3]]);
    // A second start while it's open returns the same session, never a double.
    expect((await startWorkout(day.id, null, "STANDARD", { overrideConfirmed: true })).id).toBe(session.id);
    expect(await db.workoutSessions.count()).toBe(1);
  });

  it("two taps at once start one session", async () => {
    const day = await startDay();
    const [a, b] = await Promise.all([startWorkout(day.id, null, "STANDARD", { overrideConfirmed: true }), startWorkout(day.id, null, "STANDARD", { overrideConfirmed: true })]);
    expect(a.id).toBe(b.id);
    expect(await db.workoutSessions.count()).toBe(1);
  });

  it("doesn't move the A, B, C turn (rotation or programme sequence) and shows as a one-off", async () => {
    const day = await startDay();
    const a = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    for (const [id, sets] of WORKOUT_TEMPLATES.A!.exercises.map((ex) => [ex.exerciseId, ex.sets] as const)) for (let n = 1; n <= sets; n++) await logSet(day.id, a.id, id, n, 50, 10);
    await completeWorkout(day.id, a.id, "STANDARD", "COMPLETED");
    expect(await suggestTemplateForNextWorkout()).toBe("B");

    const { day: d2, session } = await oneOff([["lib-barbell-curl", 40, 10], ["lib-barbell-curl", 40, 10]]);
    await completeWorkout(d2.id, session.id, "STANDARD", "COMPLETED");
    expect(await getLastAdvancingTemplate()).toBe("A");
    expect(await suggestTemplateForNextWorkout()).toBe("B");
    expect(templateLabel("", [])).toBe("Workout (one-off)");
    expect(describeHistoryTitle({ templateId: "", sessionType: "STANDARD", programmeForm: null } as never, [])).toContain("Workout (one-off)");
    // It never asks the keep-changes question: there is no routine.
    expect(await getChangesToKeep(session.id)).toBeNull();
  });

  it("doesn't move a programme sequence's next member", async () => {
    const templates = await createCustomTemplateSet(["A", "B", "C"].map((key) => ({ name: `Synthetic ${key}`, exercises: WORKOUT_TEMPLATES[key]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
    const { day, session } = await oneOff([["lib-barbell-curl", 40, 10]]);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    expect((await getProgrammeView()).sequence).toMatchObject({ status: "READY", nextMember: { key: "A" } });
  });
});

describe("SAVE AS ROUTINE", () => {
  it("saves the sets, reps and rest done, in the order done, with a default name; not added to the programme", async () => {
    rememberRestAdjustment("triceps-pressdown", 30);
    const { day, session } = await oneOff([["triceps-pressdown", 50, 12], ["lib-barbell-curl", 40, 10], ["triceps-pressdown", 50, 12], ["lib-barbell-curl", 40, 9]]);
    await logSet(day.id, session.id, "lib-barbell-curl", 9, 40, 8);
    await expect(saveSessionAsRoutine(session.id, "")).rejects.toThrow("Finish the workout first");
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    const draft = (await getOneOffRoutineDraft(session.id))!;
    expect(draft.name).toMatch(/^Arms · [A-Z][a-z]{2} \d{1,2}$/);
    expect(draft.exercises.map((ex) => [ex.exerciseId, ex.sets, ex.repRangeLow, ex.repRangeHigh, ex.restSeconds ?? null])).toEqual([
      ["triceps-pressdown", 2, 10, 15, 120], ["lib-barbell-curl", 3, 8, 12, null]]);

    const saved = await saveSessionAsRoutine(session.id, "");
    const routine = (await getCustomTemplates()).find((t) => t.id === saved.templateId)!;
    expect(routine.name).toBe(draft.name);
    expect(routine.exercises).toEqual(draft.exercises);
    expect((await getProgrammeView()).sequence).toBeNull();
  });

  it("names it by muscle groups and date, and refuses when nothing was logged", async () => {
    expect(oneOffRoutineName(["Arms", "Back", "Legs"], "2026-11-25T18:00:00Z")).toMatch(/^Arms & Back · Nov 2[45]$/);
    expect(oneOffRoutineName([], "2026-11-25T18:00:00Z")).toMatch(/^Workout · Nov 2[45]$/);
    const { day, session } = await oneOff();
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    expect(await getOneOffRoutineDraft(session.id)).toBeNull();
    await expect(saveSessionAsRoutine(session.id, "x")).rejects.toThrow("Nothing was logged");
  });
});
