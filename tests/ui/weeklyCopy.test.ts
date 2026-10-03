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

import { describeRibbonDay, describeRibbonSummary } from "../../src/ui/screens/weekly/weeklyCopy";

describe("Ribbon copy (2026-10-03)", () => {
  const start = new Date(2026, 9, 1, 16, 30).toISOString(); // Thu Oct 1
  it("describes a tapped day with only what was logged", () => {
    expect(
      describeRibbonDay(
        { livedDayStart: start, hasRecord: true, worked: true, mainSleepMinutes: 435, lift: { status: "COMPLETED", templateId: "B", prCount: 1 }, proteinG: 181.6, urges: 2, cleanDay: true },
        { B: "B" },
      ),
    ).toBe("Thu, Oct 1 · worked · slept 7 hr 15 min · lift B, 1 PR · protein 182 g · 2 urges · clean day");
    expect(describeRibbonDay({ livedDayStart: start, hasRecord: true, worked: false, urges: 0, cleanDay: false }, {})).toBe("Thu, Oct 1 · not working");
    expect(describeRibbonDay({ livedDayStart: start, hasRecord: false, worked: false, urges: 0, cleanDay: false }, {})).toBe("Thu, Oct 1 · nothing logged");
    expect(
      describeRibbonDay({ livedDayStart: start, hasRecord: true, worked: false, lift: { status: "PARTIAL", templateId: "x1", prCount: 0 }, urges: 0, cleanDay: false }, { x1: "Push day" }),
    ).toBe("Thu, Oct 1 · not working · lift Push day (partial)");
  });

  it("sums the strip in one sentence, never grading it", () => {
    const line = describeRibbonSummary([
      { livedDayStart: start, hasRecord: true, worked: true, mainSleepMinutes: 400, urges: 1, cleanDay: true },
      { livedDayStart: start, hasRecord: false, worked: false, urges: 0, cleanDay: false },
    ]);
    expect(line).toBe("Last 2 days, 1 worked, main sleep logged on 1, 0 workouts, protein logged on 0, 1 urge, 1 clean day.");
    expect(line).not.toMatch(/missed|good|bad|score|%/i);
  });
});
