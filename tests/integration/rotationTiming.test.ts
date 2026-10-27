import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { correctSleep, endDay, logSleep, logWater, setWorkContext, startDay, voidWaterLog } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { getWholePicture } from "../../src/application/wholePictureQueries";
import { syntheticSleep } from "../helpers/syntheticSleep";

/** ROTATION-002 phase 1b: sleep times only where Garmin's record still backs the day's one main sleep. */
beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); });
afterEach(async () => { vi.useRealTimers(); await db.delete(); });

const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
function garmin(id: string, from: Date, to: Date) {
  const s = syntheticSleep();
  s.records = [{ ...s.records[0]!, id, startTime: from.toISOString(), endTime: to.toISOString(), lastModifiedTime: to.toISOString(), stages: [] }];
  s.window = { startTime: "2026-10-01T00:00:00Z", endTime: "2026-10-25T00:00:00Z" }; s.exportedAt = "2026-10-25T00:00:00Z";
  return s;
}
async function workDay(day: number) {
  vi.setSystemTime(local(day, 20)); const started = await startDay();
  await setWorkContext(started.id, "WORK", "MANUAL");
  return started;
}
const rowOf = async (day: number) => (await getWholePicture(local(20, 20))).rows.find((row) => row.start === local(day, 16, 30).toISOString())!;

describe("ROTATION-002 — sleep timing on the rotation", () => {
  it("places a Garmin main sleep and the scheduled shift in the lived-day frame", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const day = await workDay(12); // Monday, Week A: 18:00–06:00
    await importSleepSnapshot(garmin("night", local(13, 8), local(13, 14, 30)));
    vi.setSystemTime(local(13, 16)); await endDay(day.id);
    const row = await rowOf(12);
    expect(row.sleepHours).toBe(6.5);
    expect(row.sleepWindow).toEqual({ start: 930, end: 1320 });
    expect(row.shiftWindow).toEqual({ start: 90, end: 810 });
  });

  it("shows no times for the owner's own or corrected entry, or more than one main sleep", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const typed = await workDay(12); await logSleep(typed.id, 400, "PRIMARY");
    vi.setSystemTime(local(13, 16)); await endDay(typed.id);
    const corrected = await workDay(13);
    await importSleepSnapshot(garmin("night-2", local(14, 8), local(14, 14)));
    const event = (await db.events.where("type").equals("SLEEP_LOGGED").toArray()).find((e) => e.beyondDayId === corrected.id)!;
    await correctSleep(corrected.id, event.id, 300);
    vi.setSystemTime(local(14, 16)); await endDay(corrected.id);
    const twice = await workDay(14); await logSleep(twice.id, 200, "PRIMARY"); await logSleep(twice.id, 100, "PRIMARY");
    vi.setSystemTime(local(15, 16)); await endDay(twice.id);
    for (const day of [12, 13, 14]) expect((await rowOf(day)).sleepWindow).toBeUndefined();
    expect((await rowOf(13)).sleepHours).toBe(5);
    expect((await rowOf(14)).ambiguousSleep).toBe(true);
  });

  it("follows Garmin's newer version of the same sleep", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const day = await workDay(12);
    await importSleepSnapshot(garmin("night", local(13, 8), local(13, 14)));
    const later = garmin("night", local(13, 8, 30), local(13, 15)); later.records[0]!.lastModifiedTime = local(13, 16).toISOString();
    await importSleepSnapshot(later);
    vi.setSystemTime(local(13, 16)); await endDay(day.id);
    expect((await rowOf(12)).sleepWindow).toEqual({ start: 960, end: 1350 });
  });

  it("ROTATION-003: carries the day's logged naps, and none when none were logged", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const napped = await workDay(12); await logSleep(napped.id, 50, "SUPPLEMENTAL"); await logSleep(napped.id, 25, "SUPPLEMENTAL");
    vi.setSystemTime(local(13, 16)); await endDay(napped.id);
    const plain = await workDay(13); vi.setSystemTime(local(14, 16)); await endDay(plain.id);
    expect((await rowOf(12)).napMinutes).toBe(75);
    expect((await rowOf(13)).napMinutes).toBeUndefined();
  });

  it("ROTATION-004: carries the day's meal, water and workout times in the lived-day frame, leaving undone entries out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const day = await workDay(12);
    vi.setSystemTime(local(12, 22, 15)); await logManualMeal(day.id, { name: "Rice bowl", calories: 600, proteinG: 40, carbsG: 70, fatG: 15 });
    vi.setSystemTime(local(13, 3, 40)); await logWater(day.id, 16);
    vi.setSystemTime(local(13, 4, 0)); const undone = await logWater(day.id, 8); await voidWaterLog(day.id, undone);
    vi.setSystemTime(local(13, 7, 5)); const session = await startWorkout(day.id, "A", "STANDARD");
    vi.setSystemTime(local(13, 7, 50)); await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
    vi.setSystemTime(local(13, 16)); await endDay(day.id);
    const row = await rowOf(12);
    expect(row.marks).toEqual({ meals: [345], water: [670], workouts: [875] });
    expect((await rowOf(13)).marks).toBeUndefined();
  });
});
