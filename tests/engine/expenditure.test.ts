import { describe, expect, it } from "vitest";
import { MIN_INTAKE_DAYS, MIN_WEIGH_INS, projectExpenditure, type ExpenditureWeighIn } from "../../src/engine/expenditure";
import type { DaySummary } from "../../src/engine/dayLedger";

/** Expenditure readout (Drop 6): intake minus stored energy, as a range, or nothing. */
const NOW = new Date(2026, 9, 31, 12, 0);
const dayStart = (back: number) => new Date(2026, 9, 31 - back, 16, 30).toISOString();

function day(back: number, kcal: number | undefined, ended = true): DaySummary {
  return {
    beyondDayId: `d${back}`,
    startedAt: dayStart(back),
    ...(ended ? { endedAt: new Date(2026, 9, 32 - back, 16, 30).toISOString() } : {}),
    livedDayStart: dayStart(back),
    work: { declared: "OFF", scheduled: "OFF" },
    sleep: {},
    ...(kcal !== undefined ? { kcal } : {}),
    workouts: [],
    urges: [],
    cleanDay: false,
    burden: { manualEntries: 0, corrections: 0, trainingSets: 0 },
  };
}

/** Weigh-ins every other day for 26 days, losing `lbPerWeek`, with optional alternating noise. */
function weighIns(lbPerWeek: number, noise = 0): ExpenditureWeighIn[] {
  return Array.from({ length: 14 }, (_, i) => {
    const back = 26 - i * 2;
    return {
      recordedAt: new Date(2026, 9, 31 - back, 8, 0).toISOString(),
      weightLbs: 200 - (lbPerWeek / 7) * (26 - back) + (i % 2 === 0 ? noise : -noise),
    };
  });
}

const twentyDays = Array.from({ length: 20 }, (_, i) => day(i + 1, 2000));

describe("projectExpenditure", () => {
  it("adds back what the weight trend says was burned off: 2,000 kcal eaten, losing 0.5 lb a week → ~2,250", () => {
    const readout = projectExpenditure(twentyDays, weighIns(0.5), NOW);
    expect(readout).toEqual({
      kind: "ESTIMATE",
      lowKcal: 2150,
      highKcal: 2350,
      windowDays: 28,
      intakeDays: 20,
      avgIntakeKcal: 2000,
      weeklyChangeLbs: -0.5,
      weighIns: 14,
    });
  });

  it("widens the range with noisy weigh-ins, and abstains when it's too wide to be useful", () => {
    const some = projectExpenditure(twentyDays, weighIns(0.5, 0.4), NOW);
    expect(some.kind).toBe("ESTIMATE");
    if (some.kind === "ESTIMATE") expect(some.highKcal - some.lowKcal).toBeGreaterThan(200);
    expect(projectExpenditure(twentyDays, weighIns(0.5, 3), NOW)).toMatchObject({ kind: "WAITING", tooNoisy: true });
  });

  it("counts only finished days with meals logged — today and empty days are missing, never zero", () => {
    const days = [...Array.from({ length: MIN_INTAKE_DAYS - 1 }, (_, i) => day(i + 1, 2000)), day(0, 300, false), day(20, undefined)];
    expect(projectExpenditure(days, weighIns(0.5), NOW)).toMatchObject({
      kind: "WAITING",
      intakeDays: { have: MIN_INTAKE_DAYS - 1, need: MIN_INTAKE_DAYS },
      tooNoisy: false,
    });
  });

  it("waits for enough weigh-ins over at least two weeks", () => {
    expect(projectExpenditure(twentyDays, weighIns(0.5).slice(-(MIN_WEIGH_INS - 1)), NOW)).toMatchObject({
      kind: "WAITING",
      weighIns: { have: MIN_WEIGH_INS - 1, need: MIN_WEIGH_INS },
    });
    const bunched = Array.from({ length: 10 }, (_, i) => ({ recordedAt: new Date(2026, 9, 25 + (i % 5), 8).toISOString(), weightLbs: 200 }));
    expect(projectExpenditure(twentyDays, bunched, NOW)).toMatchObject({ kind: "WAITING", spanOk: false });
  });

  it("ignores anything older than 28 days", () => {
    const old = Array.from({ length: 20 }, (_, i) => day(i + 30, 2000));
    expect(projectExpenditure(old, weighIns(0.5), NOW)).toMatchObject({ kind: "WAITING", intakeDays: { have: 0 } });
  });
});
