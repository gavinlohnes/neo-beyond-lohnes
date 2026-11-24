import { describe, expect, it } from "vitest";
import { exercisesByMuscle, groupForExercise, MAP_GROUPS } from "../src/application/exerciseByMuscle";
import type { CustomExercise } from "../src/domain/workout/customExercise";
import { EXERCISE_LIBRARY } from "../src/domain/workout/exerciseLibrary";
import { TEMPLATE_TO_LIBRARY_ID } from "../src/domain/workout/exerciseHowTo";

/** GRAYSON-TRAIN-BODYMAP-001: library and his own exercises by muscle, his first; navigation only. */
const own = (id: string, name: string, muscleGroup: CustomExercise["muscleGroup"], equipment: string, archivedAt?: string): CustomExercise =>
  ({ id, name, muscleGroup, equipment, repRangeLow: 8, repRangeHigh: 12, createdAt: "2026-11-01T00:00:00.000Z", ...(archivedAt ? { archivedAt } : {}) });

describe("GRAYSON-TRAIN-BODYMAP-001 exercises by muscle", () => {
  it("every library exercise lands in exactly one group, and every group is on the map", () => {
    const groups = exercisesByMuscle({ customs: [] });
    const all = MAP_GROUPS.flatMap((g) => groups[g].map((e) => e.id));
    expect(all.sort()).toEqual(EXERCISE_LIBRARY.map((e) => e.id).sort());
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(EXERCISE_LIBRARY.map((e) => e.muscleGroup))).toEqual(new Set(MAP_GROUPS));
  });

  it("his own come first; archived ones are left out", () => {
    const groups = exercisesByMuscle({ customs: [own("c1", "Hammer Strength Press", "Chest", "Machine"), own("c2", "Old press", "Chest", "Machine", "2026-11-02T00:00:00.000Z")] });
    expect(groups.Chest[0]).toMatchObject({ id: "c1", own: true });
    expect(groups.Chest.some((e) => e.id === "c2")).toBe(false);
    expect(groups.Chest.slice(1).every((e) => !e.own)).toBe(true);
  });

  it("the equipment filter narrows correctly; none on means everything", () => {
    const machines = exercisesByMuscle({ customs: [own("c1", "Hammer Strength Press", "Chest", "Machine")], equipment: ["Machine"] });
    for (const g of MAP_GROUPS) expect(machines[g].every((e) => e.equipment === "Machine")).toBe(true);
    expect(machines.Chest.map((e) => e.id)).toContain("c1");
    const two = exercisesByMuscle({ customs: [], equipment: ["Cable", "Dumbbell"] });
    expect(MAP_GROUPS.flatMap((g) => two[g]).every((e) => e.equipment === "Cable" || e.equipment === "Dumbbell")).toBe(true);
    expect(MAP_GROUPS.flatMap((g) => exercisesByMuscle({ customs: [], equipment: [] })[g]).length).toBe(EXERCISE_LIBRARY.length);
  });

  it("the current exercise's group: built-ins through the library map, his own by theirs; unknown selects nothing", () => {
    for (const [templateId, libId] of Object.entries(TEMPLATE_TO_LIBRARY_ID)) {
      expect(groupForExercise(templateId, [])).toBe(EXERCISE_LIBRARY.find((e) => e.id === libId)!.muscleGroup);
    }
    expect(groupForExercise("machine-chest-press", [])).toBe("Chest");
    expect(groupForExercise("c1", [own("c1", "Hammer Strength Row", "Back", "Machine")])).toBe("Back");
    expect(groupForExercise("something-unknown", [])).toBeNull();
  });
});
