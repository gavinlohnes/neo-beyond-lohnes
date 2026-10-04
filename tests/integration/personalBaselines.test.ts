import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import {
  correctSleep,
  endDay,
  logProtein,
  logSleep,
  logWater,
  setWorkContext,
  startDay,
  voidSleepLog,
  voidWaterLog,
} from "../../src/application/commands";
import { MINIMUM_DAY_HYDRATE_OZ } from "../../src/application/queries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getWeeklySummary } from "../../src/application/weeklyQueries";
import { WHOLE_DAY_WATER_ENTRY_OZ } from "../../src/engine/livedDaySeries";

/**
 * FOUNDATION-A-F1 through the real commands and fake-indexeddb: corrections
 * and undos reach the baselines through the Day Ledger, and reading Weekly
 * writes nothing.
 */

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

/** Lived day starting `back` days before Oct 11 2026 16:30 local. */
const livedDay = (back: number, h = 16, m = 30) => new Date(2026, 9, 11 - back, h, m, 0, 0);
const NOW = new Date(2026, 9, 12, 9, 0);

/** One finished work day: started 16:30, main sleep logged next morning, ended 10:00. Returns the sleep log id. */
async function workDay(back: number, minutes: number): Promise<{ dayId: string; sleepId: string }> {
  vi.setSystemTime(livedDay(back));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(livedDay(back).getTime() + 17 * 3_600_000)); // 09:30 next morning
  const sleepId = await logSleep(day.id, minutes, "PRIMARY");
  vi.setSystemTime(new Date(livedDay(back).getTime() + 17.5 * 3_600_000));
  await endDay(day.id);
  return { dayId: day.id, sleepId };
}

async function tableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of db.tables) counts[table.name] = await table.count();
  return counts;
}

describe("personal baselines from real history", () => {
  it("use corrected values, drop undone logs, and compare the last week against the weeks before", async () => {
    const logged: { dayId: string; sleepId: string }[] = [];
    for (let i = 0; i < 12; i++) logged.push(await workDay(8 + i * 2, 360));
    // A correction counts at its corrected value; an undone night leaves the baseline entirely.
    await correctSleep(logged[0]!.dayId, logged[0]!.sleepId, 365);
    await voidSleepLog(logged[1]!.dayId, logged[1]!.sleepId);
    await workDay(1, 290);
    await workDay(3, 300);

    vi.setSystemTime(NOW);
    const { baselines } = await getWeeklySummary(NOW);
    const workSleep = baselines.find((b) => b.measure === "MAIN_SLEEP" && b.dayKind === "WORK")!;
    expect(workSleep).toMatchObject({ kind: "COMPARED", baselineDays: 11, periodDays: 2, period: 295, verdict: "BELOW" });
  });

  it("an undone water entry leaves the entry count too, so a half-logged day stops counting", async () => {
    vi.setSystemTime(livedDay(2));
    const day = await startDay();
    vi.setSystemTime(livedDay(2, 18));
    await logWater(day.id, 8);
    const second = await logWater(day.id, 8);
    await logProtein(day.id, 30);
    await voidWaterLog(day.id, second);

    const [summary] = await getDaySummaries();
    expect(summary!.waterOz).toBe(8);
    expect(summary!.entryCounts).toEqual({ water: 1, food: 1 });
  });

  it("reading Weekly writes nothing", async () => {
    for (let i = 0; i < 3; i++) await workDay(1 + i, 360);
    vi.setSystemTime(NOW);
    const before = await tableCounts();
    await getWeeklySummary(NOW);
    await getWeeklySummary(NOW);
    expect(await tableCounts()).toEqual(before);
  });

  it("the whole-day water amount is the app's own Minimum Day water amount", () => {
    expect(WHOLE_DAY_WATER_ENTRY_OZ).toBe(MINIMUM_DAY_HYDRATE_OZ);
  });
});
