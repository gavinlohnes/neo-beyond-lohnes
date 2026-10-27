import { describe, expect, it } from "vitest";
import { unlockGoal } from "../../src/ui/unlockGoal";
import { patternsGoal } from "../../src/ui/screens/review/rotationCopy";
import { describeUsual } from "../../src/ui/screens/today/MeasuredSheet";

describe("DELTA-004 — not enough data becomes a goal", () => {
  it("says what to log and what it unlocks, leaving out steps already met", () => {
    const meals = { more: 6, action: (n: number) => `log meals on ${n} more days` };
    expect(unlockGoal([meals], "your daily burn estimate")).toBe("Log meals on 6 more days. Unlocks: your daily burn estimate.");
    expect(unlockGoal([meals, { more: 0, action: () => "weigh in" }], "x")).toBe("Log meals on 6 more days. Unlocks: x.");
    expect(unlockGoal([{ more: 1, action: () => "a" }, { more: 1, action: () => "b" }, { more: 1, action: () => "c" }], "x", "log")).toBe("Log a, b and c. Unlocks: x.");
    expect(unlockGoal([{ more: 0, action: () => "a" }], "x")).toBeUndefined();
    expect(unlockGoal([{ more: 1, action: () => "a and b" }, { more: 1, action: () => "c" }], "x")).toBe("A and b; c. Unlocks: x.");
  });

  it("turns rotation and Garmin floors into goals, and goes quiet once met", () => {
    expect(patternsGoal(2)).toBe("Mark each day work or off and log main sleep and a check-in through 1 more work run. Unlocks: shift-by-shift patterns.");
    expect(patternsGoal(3)).toBeNull();
    expect(describeUsual("resting", { value: null, samples: 9 })).toBe("Wear your Garmin for 5 more days. Unlocks: your usual (9 of 14 days).");
    expect(describeUsual("resting", { value: 58, samples: 20 })).toBe("Usual: 58 bpm · median of the last 28 days.");
  });
});
