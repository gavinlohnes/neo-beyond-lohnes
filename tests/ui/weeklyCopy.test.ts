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
import { describeExpenditure, describeFinding, describeFindings, describeWaitingFindings } from "../../src/ui/screens/weekly/weeklyCopy";
import type { Finding } from "../../src/engine/findings";

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

describe("read-only findings copy", () => {
  const names = { bench: "Bench Press", legpress: "Leg Press" };
  const all: Finding[] = [
    {
      kind: "SLEEP_BEFORE_WORKOUT",
      windowDays: 45,
      shortSleepMinutes: 360,
      shortSleep: { workouts: 6, completed: 2, prs: 0 },
      longerSleep: { workouts: 9, completed: 8, prs: 1 },
    },
    { kind: "TRAINING_WINDOW", windowDays: 45, beforeShift: { workouts: 6, completed: 5, prs: 3 }, afterShift: { workouts: 9, completed: 4, prs: 1 } },
    {
      kind: "URGE_TIMING",
      windowDays: 45,
      total: 12,
      byPhase: [
        { phase: "EXPECTED_POST_WORK", count: 9 },
        { phase: "OFF", count: 2 },
        { phase: "PRE_WORK", count: 1 },
      ],
    },
    { kind: "STALL", exerciseId: "bench", sessions: 4, topWeights: { min: 185, max: 185 } },
    { kind: "EXERCISE_STORY", exerciseId: "legpress", fromWeight: 200, toWeight: 270, sessions: 12, days: 50 },
  ];

  it("says each finding in counts, with its window", () => {
    expect(all.map((f) => describeFinding(f, names))).toEqual([
      {
        title: "Sleep before workouts",
        lines: ["Under 6 hr: 2 of 6 complete · 0 PRs", "6 hr or more: 8 of 9 complete · 1 PR"],
        basis: "Last 45 days · the main sleep logged in the 24 hours before each workout.",
      },
      {
        title: "Before vs. after the shift",
        lines: ["Before the shift: 5 of 6 complete · 3 PRs", "After the shift: 4 of 9 complete · 1 PR"],
        basis: "Last 45 days · work days only.",
      },
      {
        title: "When urges came",
        lines: ["9 of 12 after a shift · 2 off work · 1 before a shift"],
        basis: "Last 45 days · placed against your saved schedule.",
      },
      { title: "Bench Press", lines: ["No new record in the last 4 sessions · top set 185 lb each time"] },
      { title: "Leg Press", lines: ["Top set 200 → 270 lb over 7 weeks · 12 sessions"] },
    ]);
  });

  it("gives a stall's range of top sets, and drops weight for bodyweight lifts", () => {
    expect(describeFinding({ kind: "STALL", exerciseId: "bench", sessions: 4, topWeights: { min: 175, max: 185 } }, names).lines).toEqual([
      "No new record in the last 4 sessions · top sets 175–185 lb",
    ]);
    expect(describeFinding({ kind: "STALL", exerciseId: "pullup", sessions: 4, topWeights: { min: 0, max: 0 } }, names)).toEqual({
      title: "pullup",
      lines: ["No new record in the last 4 sessions"],
    });
  });

  it("never claims a cause or a habit", () => {
    const text = all.flatMap((f) => {
      const c = describeFinding(f, names);
      return [c.title, ...c.lines, c.basis ?? ""];
    });
    for (const line of text) expect(line).not.toMatch(/\b(usually|tends?|because|causes?|leads? to|always|never|better|worse|should)\b/i);
  });

  it("puts one lift's story and stall under a single heading, story first", () => {
    const grouped = describeFindings(
      [
        all[2]!,
        { kind: "STALL", exerciseId: "bench", sessions: 4, topWeights: { min: 185, max: 185 } },
        { kind: "EXERCISE_STORY", exerciseId: "legpress", fromWeight: 200, toWeight: 270, sessions: 12, days: 50 },
        { kind: "EXERCISE_STORY", exerciseId: "bench", fromWeight: 165, toWeight: 185, sessions: 9, days: 30 },
      ],
      names,
    );
    expect(grouped.map((g) => [g.title, g.lines])).toEqual([
      ["When urges came", ["9 of 12 after a shift · 2 off work · 1 before a shift"]],
      ["Bench Press", ["Top set 165 → 185 lb over 4 weeks · 9 sessions", "No new record in the last 4 sessions · top set 185 lb each time"]],
      ["Leg Press", ["Top set 200 → 270 lb over 7 weeks · 12 sessions"]],
    ]);
  });

  it("names what's still counting in one line, or nothing when all are shown", () => {
    expect(
      describeWaitingFindings([
        { kind: "SLEEP_BEFORE_WORKOUT", have: 2, need: 6 },
        { kind: "TRAINING_WINDOW", have: 0, need: 6 },
        { kind: "URGE_TIMING", have: 3, need: 6 },
      ]),
    ).toBe(
      "Not enough data yet: sleep before workouts (2 of 6 each way), before vs. after the shift (0 of 6 each way), when urges came (3 of 6 urges).",
    );
    expect(describeWaitingFindings([])).toBeUndefined();
  });
});

describe("expenditure readout copy (Drop 6)", () => {
  it("says a range, where it came from, and what it assumes", () => {
    expect(
      describeExpenditure({ kind: "ESTIMATE", lowKcal: 2150, highKcal: 2350, windowDays: 28, intakeDays: 20, avgIntakeKcal: 2000, weeklyChangeLbs: -0.5, weighIns: 14 }),
    ).toEqual({
      headline: "About 2,150–2,350 kcal a day",
      detail: "Estimated from the last 28 days: 20 days with meals logged (avg 2,000 kcal) and weight down 0.5 lb a week. Assumes those days' meals were all logged.",
    });
  });

  it("says exactly what it's still waiting for", () => {
    const waiting = { kind: "WAITING", windowDays: 28, intakeDays: { have: 6, need: 14 }, weighIns: { have: 3, need: 8 }, spanOk: false, tooNoisy: false } as const;
    expect(describeExpenditure(waiting)).toEqual({
      detail: "Not enough data yet — needs 14 days with meals logged (have 6) and 8 weigh-ins over 2 weeks (have 3) in the last 28 days.",
    });
    expect(describeExpenditure({ ...waiting, intakeDays: { have: 20, need: 14 }, weighIns: { have: 10, need: 8 }, spanOk: true, tooNoisy: true })).toEqual({
      detail: "Not enough data yet — weight is moving around too much for a useful range.",
    });
  });
});
