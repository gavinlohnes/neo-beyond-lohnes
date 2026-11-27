import { describe, expect, it } from "vitest";
import { buildHomeTwin, gapLine, twinExercises } from "../src/domain/workout/homeTwin";
import type { SwapCandidate } from "../src/domain/workout/workoutChanges";

/** GRAYSON-HOME-STRETCH-001 slice C: the pure twin. */
const move = (exerciseId: string, name: string, muscleGroup: string): SwapCandidate =>
  ({ exerciseId, name, muscleGroup, equipment: "Bodyweight", repRangeLow: 6, repRangeHigh: 15, incrementLbs: 0, mine: false });
const homeMoves = [move("home-incline-push-up", "Incline Push-Up", "Chest"), move("home-prone-pull-down", "Prone Pull-Down", "Back"),
  move("home-reverse-snow-angel", "Reverse Snow Angel", "Back"), move("home-bodyweight-squat", "Bodyweight Squat", "Legs")];
const lift = (exerciseId: string, name: string, sets = 3) => ({ exerciseId, name, sets, repRangeLow: 8, repRangeHigh: 12, incrementLbs: 5 });
const groups: Record<string, string> = { bench: "Chest", fly: "Chest", pulldown: "Back", row: "Back", press: "Legs", burpee: "Full Body" };

describe("buildHomeTwin", () => {
  it("each lift gets a home move for the same muscle group; sets carry over; rep ranges come from the home move", () => {
    const rows = buildHomeTwin({ exercises: [lift("bench", "Bench Press", 4), lift("pulldown", "Lat Pulldown"), lift("row", "Cable Row"), lift("press", "Leg Press")], groupOf: (id) => groups[id] ?? null, homeMoves });
    expect(rows.map((r) => [r.from.name, r.to?.name, r.muscleGroup])).toEqual([
      ["Bench Press", "Incline Push-Up", "Chest"], ["Lat Pulldown", "Prone Pull-Down", "Back"], ["Cable Row", "Reverse Snow Angel", "Back"], ["Leg Press", "Bodyweight Squat", "Legs"],
    ]);
    expect(rows[0]!.to).toEqual({ exerciseId: "home-incline-push-up", name: "Incline Push-Up", sets: 4, repRangeLow: 6, repRangeHigh: 15, incrementLbs: 0 });
  });

  it("a gap is reported, never guessed; an unknown lift too", () => {
    const rows = buildHomeTwin({ exercises: [lift("burpee", "Burpee"), lift("mystery", "Cable Woodchop")], groupOf: (id) => groups[id] ?? null, homeMoves });
    expect(rows.every((r) => r.to === null)).toBe(true);
    expect(rows.map(gapLine)).toEqual(["No home move for full body yet", "No home move for Cable Woodchop yet"]);
  });

  it("two lifts for a group with one home move: the move is reused, and the twin holds it once with the sets added", () => {
    const rows = buildHomeTwin({ exercises: [lift("bench", "Bench Press", 3), lift("fly", "Chest Fly", 2)], groupOf: (id) => groups[id] ?? null, homeMoves });
    expect(rows.map((r) => r.to?.exerciseId)).toEqual(["home-incline-push-up", "home-incline-push-up"]);
    expect(twinExercises(rows)).toEqual([{ exerciseId: "home-incline-push-up", name: "Incline Push-Up", sets: 5, repRangeLow: 6, repRangeHigh: 15, incrementLbs: 0 }]);
  });

  it("it ranks with T2's swap ranker: the home move he did most recently wins its group", () => {
    const last = new Map([["home-reverse-snow-angel", { weight: 0, reps: 12, at: "2026-11-20T10:00:00.000Z" }]]);
    const rows = buildHomeTwin({ exercises: [lift("pulldown", "Lat Pulldown")], groupOf: (id) => groups[id] ?? null, homeMoves, lastByExercise: last });
    expect(rows[0]!.to?.name).toBe("Reverse Snow Angel");
  });
});
