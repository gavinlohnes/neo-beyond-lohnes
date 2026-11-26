import { describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { createCustomExercise } from "../../src/application/exerciseLibraryCommands";
import { getExerciseNames } from "../../src/application/exerciseLibraryQueries";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { undoRoutineEdit } from "../../src/application/routineEditCommands";
import { getRoutineExerciseChoices } from "../../src/application/routineEditQueries";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { getTrainingHistory, getWorkoutSessionRecord } from "../../src/application/trainHistoryQueries";
import {
  addExerciseToSession,
  getAddChoices,
  getChangesToKeep,
  getSwapSuggestions,
  getWorkoutPlan,
  keepWorkoutChanges,
  removeExerciseFromSession,
  swapExerciseInSession,
} from "../../src/application/workoutChanges";
import { rankSwapSuggestions, type SwapCandidate } from "../../src/domain/workout/workoutChanges";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/** GRAYSON-WORKOUT-CHANGES-001 (Gavin, 2026-11-25): add, swap and remove mid-workout, then KEEP or JUST TODAY. */
const ids = (list: readonly { exerciseId: string }[]) => list.map((ex) => ex.exerciseId);
const choice = async (id: string) => (await getRoutineExerciseChoices()).find((c) => c.exerciseId === id)!;
async function liveA(type: "STANDARD" | "REDUCED" = "STANDARD") {
  const day = await startDay();
  const session = await startWorkout(day.id, "A", type, { overrideConfirmed: true });
  return { day, session };
}

describe("changes in the live workout", () => {
  it("an added exercise logs under its own id, shows in History, and is today only until KEEP", async () => {
    const fly = await createCustomExercise({ name: "Cable Fly", muscleGroup: "Chest", equipment: "Cable", repRangeLow: 12, repRangeHigh: 15 });
    const { day, session } = await liveA();
    await addExerciseToSession(session.id, await choice(fly.id));
    const plan = await getWorkoutPlan(session);
    expect(plan.today.at(-1)).toMatchObject({ exerciseId: fly.id, sets: 3, repRangeLow: 12, repRangeHigh: 15, incrementLbs: 5 });
    await expect(addExerciseToSession(session.id, await choice(fly.id))).rejects.toThrow("already in this workout");
    await logSet(day.id, session.id, fly.id, 1, 40, 12);
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    expect(JSON.stringify(await getTrainingHistory())).toContain(session.id);
    // The session record lists the added exercise's set under its own id and name.
    expect(JSON.stringify(await getWorkoutSessionRecord(session.id))).toContain("Cable Fly");
    // The routine itself hasn't changed.
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
    const event = (await db.events.where("type").equals("WORKOUT_PLAN_CHANGED").toArray())[0]!;
    expect(event).toMatchObject({ source: "USER", beyondDayId: day.id });
  });

  it("a swap to a library exercise logs that exercise, carrying its own history; free text works as before", async () => {
    const { day, session } = await liveA();
    await swapExerciseInSession(session.id, "machine-chest-press", await choice("lib-dumbbell-bench-press"));
    expect(ids((await getWorkoutPlan(session)).today)).toEqual(["lib-dumbbell-bench-press", "pec-deck", "leg-press", "triceps-pressdown"]);
    for (let n = 1; n <= 3; n++) await logSet(day.id, session.id, "lib-dumbbell-bench-press", n, 50, 12);
    await logSet(day.id, session.id, "pec-deck", 1, 80, 12, "Fly machine");
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    const sets = await db.performedSets.where("sessionId").equals(session.id).toArray();
    expect(sets.filter((s) => s.exerciseId === "lib-dumbbell-bench-press")).toHaveLength(3);
    expect(sets.find((s) => s.exerciseId === "pec-deck")?.substitutedName).toBe("Fly machine");
    // History names a library exercise swapped in mid-workout.
    expect((await getExerciseNames())["lib-dumbbell-bench-press"]).toBe("Dumbbell Bench Press");

    // Next time he swaps again, its own history is there.
    const next = await liveA();
    await swapExerciseInSession(next.session.id, "machine-chest-press", await choice("lib-dumbbell-bench-press"));
    const ex = (await getWorkoutPlan(next.session)).today[0]!;
    expect((await getProgressionSuggestion("A", "STANDARD", ex.exerciseId, new Date(), ex)).recommendation).not.toBe("NO_HISTORY");
  });

  it("a swap after sets are logged keeps those sets today; remove keeps logged sets and drops the rest", async () => {
    const { day, session } = await liveA();
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await swapExerciseInSession(session.id, "machine-chest-press", await choice("lib-barbell-bench-press"));
    let today = (await getWorkoutPlan(session)).today;
    expect(today.slice(0, 2).map((ex) => [ex.exerciseId, ex.sets])).toEqual([["machine-chest-press", 1], ["lib-barbell-bench-press", 2]]);
    await logSet(day.id, session.id, "leg-press", 1, 200, 10);
    await removeExerciseFromSession(session.id, "leg-press");
    await removeExerciseFromSession(session.id, "triceps-pressdown");
    today = (await getWorkoutPlan(session)).today;
    expect(today.map((ex) => [ex.exerciseId, ex.sets])).toEqual([["machine-chest-press", 1], ["lib-barbell-bench-press", 2], ["pec-deck", 3], ["leg-press", 1]]);
    expect(await db.performedSets.where("sessionId").equals(session.id).count()).toBe(2);
  });
});

describe("swap suggestions", () => {
  it("are the same muscle, ranked by equipment used in the last 60 days, each with his last numbers", async () => {
    const now = new Date();
    const { day, session } = await liveA();
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await logSet(day.id, session.id, "pec-deck", 1, 80, 12);
    const options = await getSwapSuggestions(session.id, "machine-chest-press", now);
    expect(options.muscleGroup).toBe("Chest");
    expect(options.suggestions).toHaveLength(3);
    expect(options.suggestions.every((s) => s.muscleGroup === "Chest")).toBe(true);
    // Machine was used lately (both chest machines are in the plan, so not offered); no library twins.
    expect(options.suggestions.map((s) => s.exerciseId)).not.toContain("lib-machine-chest-press");
    expect(options.suggestions.map((s) => s.exerciseId)).not.toContain("pec-deck");
  });

  it("the ranker: recent equipment first, then recency, then his own", () => {
    const c = (exerciseId: string, equipment: string, mine = false): SwapCandidate =>
      ({ exerciseId, name: exerciseId, muscleGroup: "Chest", equipment, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5, mine });
    const ranked = rankSwapSuggestions({
      muscleGroup: "Chest",
      candidates: [c("a", "Barbell"), c("b", "Cable"), c("c", "Cable", true), c("d", "Dumbbell"), c("e", "Cable"), { ...c("x", "Cable"), muscleGroup: "Back" }],
      exclude: new Set(["e"]),
      recentEquipment: new Set(["Cable"]),
      lastByExercise: new Map([["b", { weight: 30, reps: 12, at: "2026-11-20T10:00:00Z" }], ["d", { weight: 40, reps: 10, at: "2026-11-25T10:00:00Z" }]]),
    });
    expect(ranked.map((s) => s.exerciseId)).toEqual(["b", "c", "d"]);
    expect(ranked[0]!.last).toEqual({ weight: 30, reps: 12, at: "2026-11-20T10:00:00Z" });
  });

  it("ADD lists the three done most recently, not already in the plan", async () => {
    const { day, session } = await liveA();
    for (const id of ["lib-face-pull", "lib-lateral-raise", "lib-barbell-row", "lib-plank"]) {
      await addExerciseToSession(session.id, await choice(id));
      await logSet(day.id, session.id, id, 1, 20, 10);
    }
    await completeWorkout(day.id, session.id, "STANDARD", "PARTIAL");
    const next = await liveA();
    await addExerciseToSession(next.session.id, await choice("lib-plank"));
    const { recent } = await getAddChoices(next.session.id);
    expect(recent.map((c) => c.exerciseId)).toEqual(["lib-barbell-row", "lib-lateral-raise", "lib-face-pull"]);
  });
});

describe("the question at the end", () => {
  it("shows only after a change; a different order alone counts; JUST TODAY changes nothing", async () => {
    const plain = await liveA();
    await logSet(plain.day.id, plain.session.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(plain.day.id, plain.session.id, "STANDARD", "PARTIAL");
    expect(await getChangesToKeep(plain.session.id)).toBeNull();

    const reordered = await liveA();
    await logSet(reordered.day.id, reordered.session.id, "leg-press", 1, 200, 10);
    await logSet(reordered.day.id, reordered.session.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(reordered.day.id, reordered.session.id, "STANDARD", "PARTIAL");
    expect(ids((await getChangesToKeep(reordered.session.id))!)).toEqual(["leg-press", "machine-chest-press", "pec-deck", "triceps-pressdown"]);
    // JUST TODAY writes nothing: the routine is unchanged.
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
  });

  it("KEEP saves through the routine command with UNDO; REDUCED after KEEP takes the new first two", async () => {
    const { day, session } = await liveA("REDUCED");
    await swapExerciseInSession(session.id, "machine-chest-press", await choice("lib-dumbbell-bench-press"));
    await addExerciseToSession(session.id, await choice("lib-face-pull"));
    await logSet(day.id, session.id, "lib-face-pull", 1, 30, 12);
    await logSet(day.id, session.id, "lib-dumbbell-bench-press", 1, 50, 12);
    await expect(keepWorkoutChanges(session.id)).rejects.toThrow("Finish the workout first");
    await completeWorkout(day.id, session.id, "REDUCED", "PARTIAL");
    const kept = await keepWorkoutChanges(session.id);
    const next = await resolveTemplateExercises("A", "STANDARD");
    // Done first in the order done, then the rest; the swapped-in exercise takes the routine's own 3 sets.
    expect(next.map((ex) => [ex.exerciseId, ex.sets])).toEqual([["lib-face-pull", 3], ["lib-dumbbell-bench-press", 3], ["pec-deck", 3], ["leg-press", 3], ["triceps-pressdown", 2]]);
    expect(ids(await resolveTemplateExercises("A", "REDUCED"))).toEqual(["lib-face-pull", "lib-dumbbell-bench-press"]);
    await undoRoutineEdit(kept.eventId);
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
  });

  it("KEEP on a programme member keeps the programme in step", async () => {
    const templates = await createCustomTemplateSet(["A", "B", "C"].map((key) => ({ name: `Synthetic ${key}`, exercises: WORKOUT_TEMPLATES[key]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
    const day = await startDay();
    const session = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
    await addExerciseToSession(session.id, await choice("lib-face-pull"));
    await logSet(day.id, session.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    const kept = await keepWorkoutChanges(session.id);
    expect(kept.programmeUpdated).toBe(true);
    expect((await getProgrammeView()).sequence).toMatchObject({ status: "READY", nextMember: { key: "B" } });
  });
});
