import { describe, expect, it } from "vitest";
import type { DaySummary } from "../../src/engine/dayLedger";
import { MIN_BASELINE_DAYS, projectPersonalBaselines } from "../../src/engine/personalBaselines";
import { deriveSleepDebt, describeSleepTargets, describeUnjudged, learnedSleepTargets, SLEEP_DEBT_DAYS } from "../../src/application/sleepDebt";

/**
 * SLEEP-DEBT-LEARNED-001: sleep owed against the operator's own learned main sleep (Weekly's personal baselines),
 * per kind of day. Invented history only. Dates are built with local constructors, so the file means the same in
 * any time zone; run it under TZ=UTC and TZ=America/Chicago. The second "now" puts the US DST change (Nov 1 2026)
 * inside the windows.
 */
const hm = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

describe.each([
  ["Mon Oct 12 2026 09:00", new Date(2026, 9, 12, 9, 0)],
  ["Mon Nov 16 2026 09:00 (DST change inside the windows)", new Date(2026, 10, 16, 9, 0)],
])("deriveSleepDebt, now %s", (_label, NOW) => {
  // The lived day `back` days before the one NOW is in (which starts at 16:30 the day before NOW's date).
  const start = (back: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1 - back, 16, 30, 0, 0).toISOString();
  let n = 0;
  const day = (back: number, kind: "WORK" | "OFF" | "UNKNOWN", sleep: DaySummary["sleep"], startedAt = start(back)): DaySummary => ({
    beyondDayId: `d${++n}`, startedAt, livedDayStart: start(back), work: { declared: kind, scheduled: "OFF" }, sleep,
    workouts: [], urges: [], cleanDay: false, burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
  });
  const night = (back: number, kind: "WORK" | "OFF" | "UNKNOWN", minutes: number) => day(back, kind, { primaryMinutes: minutes });
  /** `count` baseline nights of a kind, 8, 10, 12… lived days back (inside the 56-day baseline, outside the last 7). */
  const baseline = (kind: "WORK" | "OFF", count: number, values: number[], firstBack = 8) =>
    Array.from({ length: count }, (_, i) => night(firstBack + i * 2, kind, values[i % values.length]!));
  // Work nights 340–380 → usual 340–370 (the 30-minute narrowest range around the 355 median); days off 460–500 → 460–490.
  const workHistory = () => baseline("WORK", 12, [340, 350, 360, 370, 380]);
  const offHistory = () => baseline("OFF", 12, [460, 470, 480, 490, 500], 9);

  it("the target is the low end of the usual main-sleep range for that kind of day, from the personal baselines", () => {
    const history = [...workHistory(), ...offHistory()];
    const targets = learnedSleepTargets(history, NOW);
    const weekly = projectPersonalBaselines(history, NOW).filter((b) => b.measure === "MAIN_SLEEP");
    expect(targets).toEqual({ WORK: { kind: "LEARNED", minutes: 340, baselineDays: 12 }, OFF: { kind: "LEARNED", minutes: 460, baselineDays: 12 } });
    // The same numbers Weekly shows: one source of truth.
    for (const b of weekly) expect(b.kind !== "LEARNING" && b.low).toBe((targets[b.dayKind] as { minutes: number }).minutes);
    expect(describeSleepTargets(targets, hm)).toBe("work days 5h40 (from 12 days), days off 7h40 (from 12 days)");
  });

  it("judges work nights against the work target and nights off against the off target, never 7 hours", () => {
    const history = [...workHistory(), ...offHistory(),
      night(1, "WORK", 320), // 20 under 340
      night(2, "WORK", 340), // at target: 0
      night(3, "OFF", 430), // 30 under 460
      night(4, "OFF", 400), // 60 under 460 (against a fixed 7 h it would have owed 20)
    ]; // The other three logged days are baseline nights at or above their targets.
    const debt = deriveSleepDebt(history, NOW);
    expect(debt).toMatchObject({ status: "LEARNED", owedMinutes: 110, days: SLEEP_DEBT_DAYS, judgedDays: SLEEP_DEBT_DAYS });
    expect(debt.perDay.slice(0, 4).map((d) => [d.kind, d.targetMinutes, d.owedMinutes])).toEqual([
      ["WORK", 340, 20], ["WORK", 340, 0], ["OFF", 460, 30], ["OFF", 460, 60],
    ]);
    // A 5h20 work night against a 7-hour need would have owed 100; against his usual work night it owes 20.
    expect(debt.perDay[0]!.owedMinutes).toBe(20);
  });

  it("looks at the last 7 lived days with sleep logged, newest first, and leaves out days not yet begun", () => {
    const history = [...workHistory(), ...offHistory(), night(-1, "WORK", 60)];
    const debt = deriveSleepDebt(history, NOW);
    expect(debt.perDay.map((d) => d.livedDayStart)).toEqual([8, 9, 10, 11, 12, 13, 14].map(start));
  });

  it("thin evidence: still learning, with the day counts, and no owed figure (no fixed-7-hour fallback)", () => {
    const history = [...baseline("WORK", MIN_BASELINE_DAYS - 1, [360]), ...baseline("OFF", 3, [480], 9),
      night(1, "WORK", 200), night(2, "OFF", 200)];
    const debt = deriveSleepDebt(history, NOW);
    expect(debt).toMatchObject({ status: "LEARNING", owedMinutes: 0, judgedDays: 0, days: SLEEP_DEBT_DAYS });
    expect(debt.targets).toEqual({ WORK: { kind: "LEARNING", have: 9, need: 10 }, OFF: { kind: "LEARNING", have: 3, need: 10 } });
    expect(debt.perDay.every((d) => d.targetMinutes === undefined && d.owedMinutes === 0)).toBe(true);
    expect(describeSleepTargets(debt.targets, hm)).toBe("work days still learning (9 of 10 days), days off still learning (3 of 10 days)");
    expect(describeUnjudged(debt)).toBe("");
  });

  it("a learned kind is judged while the other is still learning; the unjudged days are named, not counted", () => {
    const history = [...workHistory(), ...baseline("OFF", 4, [480], 9), night(1, "WORK", 300), night(2, "OFF", 200), night(3, "OFF", 200)];
    const debt = deriveSleepDebt(history, NOW);
    expect(debt.status).toBe("LEARNED");
    expect(debt.perDay.slice(0, 3).map((d) => d.owedMinutes)).toEqual([40, 0, 0]);
    expect(debt.days - debt.judgedDays).toBeGreaterThanOrEqual(2);
    expect(describeSleepTargets(debt.targets, hm)).toBe("work days 5h40 (from 12 days), days off still learning (4 of 10 days)");
    expect(describeUnjudged(debt)).toMatch(/^\d logged days not counted \(still learning that kind of day, work\/off unknown, or only a nap logged\)\.$/);
  });

  it("a day whose work context is unknown is not judged", () => {
    const debt = deriveSleepDebt([...workHistory(), ...offHistory(), night(1, "UNKNOWN", 100)], NOW);
    expect(debt.perDay[0]).toMatchObject({ kind: "UNKNOWN", targetMinutes: undefined, owedMinutes: 0 });
    expect(debt.judgedDays).toBe(debt.days - 1);
  });

  it("sleep above the usual owes nothing and repays nothing: no negative debt", () => {
    const over = deriveSleepDebt([...workHistory(), ...offHistory(), night(1, "WORK", 600), night(2, "OFF", 700)], NOW);
    expect(over.perDay.slice(0, 2).map((d) => d.owedMinutes)).toEqual([0, 0]);
    const mixed = deriveSleepDebt([...workHistory(), ...offHistory(), night(1, "WORK", 600), night(2, "WORK", 300)], NOW);
    // The long night doesn't cancel the short one.
    expect(mixed.perDay.slice(0, 2).map((d) => d.owedMinutes)).toEqual([0, 40]);
    expect(mixed.owedMinutes).toBeGreaterThanOrEqual(40);
    expect([over, mixed].every((d) => d.perDay.every((p) => p.owedMinutes >= 0))).toBe(true);
  });

  it("naps count toward the night, and two records in one lived day are one night with one target", () => {
    const history = [...workHistory(), ...offHistory(),
      day(1, "WORK", { primaryMinutes: 280, napMinutes: 40 }), // 320: owes 20
      day(2, "WORK", { primaryMinutes: 200 }), day(2, "WORK", { primaryMinutes: 120 }), // 320 together: owes 20 once, not twice
    ];
    const debt = deriveSleepDebt(history, NOW);
    expect(debt.perDay.slice(0, 2).map((d) => [d.sleptMinutes, d.owedMinutes])).toEqual([[320, 20], [320, 20]]);
  });

  it("FOLLOWUPS-001: a day with only a nap logged is not judged against a full night, and is named as not counted", () => {
    const history = [...workHistory(), ...offHistory(),
      day(1, "WORK", { napMinutes: 45 }), // nap only: not judged (it would have owed 295 against 340)
      day(2, "WORK", { primaryMinutes: 280, napMinutes: 40 }), // main sleep logged: judged, the nap still counts (owes 20)
    ];
    const debt = deriveSleepDebt(history, NOW);
    expect(debt.perDay.slice(0, 2).map((d) => [d.sleptMinutes, d.targetMinutes, d.owedMinutes])).toEqual([[45, undefined, 0], [320, 340, 20]]);
    expect(debt).toMatchObject({ status: "LEARNED", owedMinutes: 20, days: SLEEP_DEBT_DAYS, judgedDays: SLEEP_DEBT_DAYS - 1 });
    expect(describeUnjudged(debt)).toBe("1 logged day not counted (still learning that kind of day, work/off unknown, or only a nap logged).");
    // The baseline leaves the nap-only day out too: the target is unchanged by it.
    expect(debt.targets).toEqual(learnedSleepTargets([...workHistory(), ...offHistory()], NOW));
    // Only naps in the window: no owed figure ("still learning"), never a nap judged as a night.
    const naps = Array.from({ length: SLEEP_DEBT_DAYS }, (_, i) => day(i + 1, "WORK", { napMinutes: 30 }));
    const napsOnly = deriveSleepDebt([...workHistory(), ...offHistory(), ...naps], NOW);
    expect(napsOnly.targets.WORK).toEqual({ kind: "LEARNED", minutes: 340, baselineDays: 12 });
    expect(napsOnly).toMatchObject({ status: "LEARNING", owedMinutes: 0, judgedDays: 0, days: SLEEP_DEBT_DAYS });
  });

  it("nothing logged: NO_SLEEP", () => {
    expect(deriveSleepDebt([], NOW)).toMatchObject({ status: "NO_SLEEP", owedMinutes: 0, days: 0, judgedDays: 0, perDay: [] });
  });
});
