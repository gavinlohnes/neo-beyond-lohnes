import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logProtein, logWater, retimeLog, startDay, voidWaterLog } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { getHydrationEntries, getProteinEntries } from "../../src/application/queries";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { checkLogTime, resolveWhen } from "../../src/application/logTimes";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";

/** LOG-TIME-001: when it actually happened — entered with a time, or moved after. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(async () => { vi.useRealTimers(); await db.delete(); });
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).toISOString();

describe("WHEN", () => {
  it("resolves a choice inside the lived day, after midnight included", () => {
    const started = at(27, 16, 35), now = new Date(2026, 9, 28, 4, 30);
    expect(resolveWhen({ kind: "NOW" }, started, now)).toBeUndefined();
    expect(resolveWhen({ kind: "AGO", minutes: 60 }, started, now)).toBe(at(28, 3, 30));
    expect(resolveWhen({ kind: "AT", hhmm: "02:00" }, started, now)).toBe(at(28, 2));
    expect(resolveWhen({ kind: "AT", hhmm: "17:10" }, started, now)).toBe(at(27, 17, 10));
    expect(() => checkLogTime(started, at(28, 16, 31))).toThrow(/LOG_TIME_OUTSIDE_DAY/);
    expect(() => checkLogTime(started, at(27, 16, 29))).toThrow(/LOG_TIME_OUTSIDE_DAY/);
  });

  it("logs at the time it happened, a pre-log ahead included, and keeps when it was entered", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const day = await startDay();
    vi.setSystemTime(new Date(2026, 9, 28, 4, 30));
    await logWater(day.id, 16, at(28, 2));
    await logProtein(day.id, 30, at(28, 6));
    await logManualMeal(day.id, { name: "Chili", calories: 600, proteinG: 40, carbsG: 50, fatG: 20 }, false, at(28, 1, 15));
    const [water] = await getHydrationEntries(day.id);
    expect(water).toMatchObject({ at: at(28, 2), recordedAt: at(28, 4, 30) });
    expect((await getProteinEntries(day.id))[0]!.at).toBe(at(28, 6));
    expect((await getMealEntries(day.id))[0]!.at).toBe(at(28, 1, 15));
    await expect(logWater(day.id, 8, at(28, 17))).rejects.toThrow(/LOG_TIME_OUTSIDE_DAY/);
  });

  it("moves a log after the fact, latest move wins, amount untouched; never a voided log", async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const day = await startDay();
    vi.setSystemTime(new Date(2026, 9, 28, 4, 30));
    const id = await logWater(day.id, 24);
    expect(await retimeLog(day.id, id, at(28, 1))).toBe(true);
    expect(await retimeLog(day.id, id, at(28, 1))).toBe(false);
    expect(await retimeLog(day.id, id, at(28, 1, 30))).toBe(true);
    expect((await getHydrationEntries(day.id))[0]).toMatchObject({ at: at(28, 1, 30), effectiveAmountOz: 24 });
    const moved = (await db.events.toArray()).filter((e) => e.type === "LOG_RETIMED").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(moved).toHaveLength(2);
    expect(describeEvent(moved[1]!)).toBe("Water log moved to 01:30.");
    await voidWaterLog(day.id, id);
    await expect(retimeLog(day.id, id, at(28, 2))).rejects.toThrow(/LOG_VOIDED/);
  });
});
