import { expect, it } from "vitest";
import { getRecoveryComparison, projectRecoveryComparison } from "../../src/application/recoveryComparison";
import { db } from "../../src/persistence/db";
import type { PeriodValue } from "../../src/domain/health/measuredSeries";
import type { StrengthObservation } from "../../src/engine/strengthReview";
const base = new Date(2026, 2, 1, 16, 30);
const periods: PeriodValue[] = Array.from({ length: 15 }, (_, i) => ({ from: new Date(2026, 2, 1 + i, 16, 30).getTime(), to: new Date(2026, 2, 2 + i, 16, 30).getTime(), dayId: null, value: i < 7 ? 60 : 70, partial: i === 14 }));
const measured = { current: periods[14]!, resting: periods, sleep: periods.map((p) => ({ ...p, value: 420 })), unusual: { sleep: null, resting: null, steps: null } };
const set = (at: number, weight: number, sessionId: string): StrengthObservation => ({ at: new Date(at).toISOString(), weight, reps: 10, sessionId, exerciseId: "press" });
it("uses exact lived-window boundaries, excludes current data and reports measured sample counts", () => {
  const records = [set(periods[0]!.from, 100, "previous"), set(periods[7]!.from, 110, "recent"), set(periods[14]!.from, 1000, "current"), set(base.getTime() - 1, 1000, "old")];
  const result = projectRecoveryComparison(records, { ...measured, sleep: measured.sleep.map((p, i) => i === 8 ? { ...p, value: null } : p) });
  expect(result.weeks?.[0]).toMatchObject({ volume: 1000, sessions: 1, sets: 1, resting: { mean: 60, days: 7 } });
  expect(result.weeks?.[1]).toMatchObject({ volume: 1100, sessions: 1, sleep: { mean: 420, days: 6 } });
  expect(result.weeks?.[0].to).toBe(result.weeks?.[1].from);
  expect(result.weeks?.[1].to).toBe(measured.current.from);
});
it("missing readings and no qualifying training remain unknown, never zero or an adverse verdict", () => {
  const result = projectRecoveryComparison([], { ...measured, resting: periods.map((p) => ({ ...p, value: null })), sleep: periods.map((p) => ({ ...p, value: null })) });
  expect(result.weeks?.[1]).toMatchObject({ volume: null, sessions: 0, resting: { mean: null, days: 0 }, sleep: { mean: null, days: 0 } });
  expect(result.unusual).toEqual(measured.unusual);
  expect(projectRecoveryComparison([], { ...measured, resting: periods.slice(-7) }).weeks).toBeNull();
});
it("reads the actual empty local store without creating a day, records or events", async () => {
  const before = await Promise.all(db.tables.map((table) => table.count()));
  await getRecoveryComparison(new Date(2026, 10, 15, 18));
  expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(before);
});
