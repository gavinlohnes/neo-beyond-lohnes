import { describe, expect, it } from "vitest";
import {
  extendStretch, pauseStretch, resumeStretch, skipStretch, startStretchClock, stretchCueTimeline, stretchCuesBetween, stretchElapsed,
  stretchHolds, stretchPosition, stretchTotalSeconds,
} from "../src/domain/workout/stretchCues";
import { STARTER_ROUTINES, STRETCHES, stretchRoutineProblem, stretchRoutineSeconds, type StretchRoutine } from "../src/domain/workout/stretchLibrary";

/** GRAYSON-HOME-STRETCH-001 slice B: the pure stretch timing. */
const routine: StretchRoutine = {
  id: "t", name: "Test",
  steps: [
    { stretchId: "stretch-neck-side", holdSeconds: 30, bothSides: true, rounds: 1 },
    { stretchId: "stretch-childs-pose", holdSeconds: 20, bothSides: false, rounds: 2 },
    { stretchId: "stretch-standing-calf", holdSeconds: 30, bothSides: true, rounds: 1 },
  ],
};

describe("the library and starters", () => {
  it("fourteen hand-written stretches; three starters of 8 to 10 minutes, 30 s holds, both sides on one-sided ones", () => {
    expect(STRETCHES).toHaveLength(14);
    expect(new Set(STRETCHES.map((s) => s.id)).size).toBe(14);
    for (const s of STRETCHES) { expect(s.id).toMatch(/^stretch-/); expect(s.cues.length).toBeGreaterThanOrEqual(2); }
    for (const r of Object.values(STARTER_ROUTINES)) {
      expect(stretchRoutineProblem(r), r.name).toBeNull();
      const minutes = stretchRoutineSeconds(r) / 60;
      expect(minutes, r.name).toBeGreaterThanOrEqual(8);
      expect(minutes, r.name).toBeLessThanOrEqual(10);
      for (const step of r.steps) {
        expect(step.holdSeconds).toBe(30);
        expect(step.bothSides).toBe(STRETCHES.find((s) => s.id === step.stretchId)!.oneSided);
      }
    }
    expect(Object.values(STARTER_ROUTINES).map((r) => r.name)).toEqual(["After shift", "Before sleep", "After lifting"]);
  });

  it("a routine he saves needs a name, known stretches, holds of 10 s to 5 min and 1 to 5 rounds", () => {
    expect(stretchRoutineProblem({ ...routine, name: " " })).toBe("Give the routine a name.");
    expect(stretchRoutineProblem({ ...routine, steps: [] })).toBe("Add at least one stretch.");
    expect(stretchRoutineProblem({ ...routine, steps: [{ ...routine.steps[0]!, holdSeconds: 5 }] })).toMatch(/Holds are/);
    expect(stretchRoutineProblem({ ...routine, steps: [{ ...routine.steps[0]!, rounds: 6 }] })).toMatch(/Rounds are/);
    expect(stretchRoutineProblem({ ...routine, steps: [{ ...routine.steps[0]!, stretchId: "nope" }] })).toMatch(/isn't in the list/);
  });
});

describe("timing and cues", () => {
  it("both sides, rounds, and the cue at every change: switch sides, again, next, last one, done", () => {
    const holds = stretchHolds(routine);
    expect(holds.map((h) => [h.name, h.side, h.startsAt, h.seconds])).toEqual([
      ["Neck side stretch", "LEFT", 0, 30], ["Neck side stretch", "RIGHT", 30, 30],
      ["Child's pose", null, 60, 20], ["Child's pose", null, 80, 20],
      ["Standing calf stretch", "LEFT", 100, 30], ["Standing calf stretch", "RIGHT", 130, 30],
    ]);
    expect(stretchTotalSeconds(holds)).toBe(160);
    expect(stretchCueTimeline(holds)).toEqual([
      { atSecond: 0, kind: "START", text: "Neck side stretch, left side" },
      { atSecond: 30, kind: "SWITCH", text: "Switch sides" },
      { atSecond: 60, kind: "NEXT", text: "Next: child's pose" },
      { atSecond: 80, kind: "AGAIN", text: "Again" },
      { atSecond: 100, kind: "LAST", text: "Last one: standing calf stretch" },
      { atSecond: 130, kind: "SWITCH", text: "Switch sides" },
      { atSecond: 160, kind: "DONE", text: "Done" },
    ]);
    expect(stretchPosition(holds, 45)).toMatchObject({ hold: { side: "RIGHT" }, remaining: 15, next: { name: "Child's pose" } });
    expect(stretchPosition(holds, 160)).toBeNull();
    // Cues crossed: the start once, then each change exactly when reached.
    const cues = stretchCueTimeline(holds);
    expect(stretchCuesBetween(cues, -1, 0).map((c) => c.kind)).toEqual(["START"]);
    expect(stretchCuesBetween(cues, 0, 29.9)).toEqual([]);
    expect(stretchCuesBetween(cues, 29.9, 30).map((c) => c.kind)).toEqual(["SWITCH"]);
  });

  it("elapsed comes from the clock: pause freezes it, resume carries on, SKIP jumps to the next hold, +15 s lengthens this one", () => {
    const t0 = 1_000_000;
    let clock = startStretchClock(t0);
    expect(stretchElapsed(clock, t0 + 10_000)).toBe(10);
    clock = pauseStretch(clock, t0 + 10_000);
    expect(stretchElapsed(clock, t0 + 70_000)).toBe(10); // paused for a minute
    clock = resumeStretch(clock, t0 + 70_000);
    expect(stretchElapsed(clock, t0 + 75_000)).toBe(15);
    clock = skipStretch(clock, routine, t0 + 75_000); // 15 s into the left side → the right side starts
    expect(stretchElapsed(clock, t0 + 75_000)).toBe(30);
    expect(stretchPosition(stretchHolds(routine, clock.extra), 30)!.hold.side).toBe("RIGHT");
    clock = extendStretch(clock, routine, t0 + 80_000); // 5 s into the right side, +15 s
    const holds = stretchHolds(routine, clock.extra);
    expect(holds[1]!.seconds).toBe(45);
    expect(stretchTotalSeconds(holds)).toBe(175);
    expect(stretchPosition(holds, stretchElapsed(clock, t0 + 80_000))!.remaining).toBe(40);
    // A locked screen doesn't drift: the same clock read later gives the right place.
    expect(stretchPosition(holds, stretchElapsed(clock, t0 + 80_000 + 41_000))!.hold.name).toBe("Child's pose");
  });
});
