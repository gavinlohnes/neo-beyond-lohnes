import { describe, expect, it } from "vitest";
import { describeBurdenLine } from "../../src/ui/screens/weekly/weeklyCopy";

describe("describeBurdenLine (Drop 1, Burden Meter)", () => {
  it("states entries per day (whole entries) and the week's corrections", () => {
    expect(describeBurdenLine({ days: 5, entriesPerDay: 6.4, corrections: 1 })).toBe(
      "Entries per day: 6 · corrections this week: 1",
    );
    expect(describeBurdenLine({ days: 3, entriesPerDay: 6.5, corrections: 0 })).toBe(
      "Entries per day: 7 · corrections this week: 0",
    );
  });

  it("says there's nothing to measure rather than showing zeros", () => {
    expect(describeBurdenLine({ days: 0, corrections: 0 })).toBe("Not enough data yet — no days this week.");
  });

  it("never judges", () => {
    const line = describeBurdenLine({ days: 7, entriesPerDay: 30, corrections: 9 });
    expect(line).not.toMatch(/too|high|low|good|bad|score|target|%/i);
  });
});
