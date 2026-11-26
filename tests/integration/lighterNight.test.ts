import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { enableMinimumDay, endDay, setPlannedWork, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { createObligation, modifyObligation } from "../../src/application/intentCommands";
import { getPlannedWorkDeclaration } from "../../src/application/queries";
import { getFitsNow } from "../../src/application/fitsNowQueries";
import { getLighterNight, readLighterNightSettings, writeLighterNightSettings } from "../../src/application/lighterNightQueries";
import { dismissLighterNight, STALE_LINE, takeLighterNight, undoLighterFood, undoLighterHome, undoLighterLift } from "../../src/application/lighterNightCommands";
import { applySettingsBlock, readTravellingSettings } from "../../src/persistence/settingsTransfer";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * GRAYSON-LIGHTER-NIGHT-001 through the application layer. Run under TZ=UTC and TZ=America/Chicago.
 * The default rotation (18:00 → 06:00) has nights Fri 13, Sat 14, Sun 15 Nov 2026 (a run of 3, first day off Mon 16)
 * and Wed 18, Thu 19 (a run of 2).
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
async function dayOn(d: number, h = 17) {
  vi.setSystemTime(at(d, h));
  return startDay(at(d, 16, 30).toISOString());
}
let dayId = "";
let bowl = "", shake = "";

beforeEach(async () => {
  await db.open(); localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  bowl = (await createSavedMeal({ name: "Chicken bowl", calories: 520, proteinG: 45, carbsG: 50, fatG: 12 })).id;
  shake = (await createSavedMeal({ name: "Shake", calories: 300, proteinG: 60, carbsG: 8, fatG: 3 })).id;
  // The bowl is his work-night usual: logged on the earlier night of Sat 14 Nov.
  const earlier = await dayOn(14);
  await setWorkContext(earlier.id, "WORK", "MANUAL");
  await logMeal(earlier.id, bowl, 1);
  vi.setSystemTime(at(15, 16));
  await endDay(earlier.id);
});
afterEach(() => { vi.useRealTimers(); db.close(); });

async function lastNight() {
  const day = await dayOn(15);
  dayId = day.id;
  const job = await createObligation({ title: "Home: Filter change", plannedAt: "2026-11-15", dueAt: "2026-11-15" });
  return { day, job };
}

describe("when it shows", () => {
  it("on the last night of a run of 3, before the shift: the why and three parts", async () => {
    await lastNight();
    const got = await getLighterNight();
    expect(got?.view).toEqual({
      kind: "OFFER", why: "Last night of 3.",
      lines: { lift: "Lift: SHORT A", food: "Food: your work-night usuals first", home: "Home: Filter change (due tonight, still due) moves to Mon, your first day off" },
    });
    expect(got?.plan.firstOff).toBe("2026-11-16");
  });

  it("a run of 2 counts; night one, a day off and once the shift has started don't", async () => {
    await dayOn(18);
    expect(await getLighterNight()).toBeNull(); // night one
    await dayOn(16);
    expect(await getLighterNight()).toBeNull(); // first day off
    await dayOn(19);
    expect((await getLighterNight())?.view).toMatchObject({ kind: "OFFER", why: "Last night of 2." });
    vi.setSystemTime(at(19, 18, 1));
    expect(await getLighterNight()).toBeNull(); // the shift has started
  });

  it("never on a Minimum Day", async () => {
    const { day } = await lastNight();
    await enableMinimumDay(day.id);
    expect(await getLighterNight()).toBeNull();
  });

  it("each part hides when it has nothing: no lift after NOT TODAY, no usuals with Fits now off, no home job tonight", async () => {
    const { day, job } = await lastNight();
    await setPlannedWork(day.id, false);
    localStorage.setItem("beyond.fitsNow.v1", JSON.stringify({ on: false }));
    await modifyObligation(job.id, { plannedAt: "2026-11-17" });
    expect(await getLighterNight()).toBeNull();
  });
});

describe("TAKE IT", () => {
  it("writes the planned answer and the move, and nothing else; Fits now puts his usuals first tonight", async () => {
    const { job } = await lastNight();
    await updateNutritionTargets({ calorieTargetKcal: 2000 });
    const before = await db.events.toArray();
    const ordinary = await getFitsNow();
    expect(ordinary?.kind === "LIST" && ordinary.rows[0]!.meal.id).toBe(shake); // more protein first
    await takeLighterNight((await getLighterNight())!.plan);
    const added = (await db.events.toArray()).filter((e) => !before.some((b) => b.id === e.id)).map((e) => e.type).sort();
    expect(added).toEqual(["OBLIGATION_MODIFIED", "PLANNED_WORK_SET"]);
    expect(await getPlannedWorkDeclaration(dayId)).toBe(true);
    const moved = (await db.obligations.get(job.id))!;
    expect(moved).toMatchObject({ plannedAt: "2026-11-16", dueAt: "2026-11-15" });
    const usuals = await getFitsNow();
    expect(usuals?.kind === "LIST" && usuals.rows[0]!.meal.id).toBe(bowl);
    expect((await getLighterNight())?.view).toMatchObject({ kind: "TAKEN", folded: "Lighter night: SHORT A · your usuals · Filter change Mon." });
  });

  it("a plan changed since the card showed refuses with a plain line and writes nothing", async () => {
    const { job } = await lastNight();
    const shown = (await getLighterNight())!.plan;
    vi.setSystemTime(at(15, 17, 5));
    await modifyObligation(job.id, { description: "the upstairs one" });
    const before = await db.events.count();
    await expect(takeLighterNight(shown)).rejects.toThrow(STALE_LINE);
    expect(await db.events.count()).toBe(before);
    expect((await getLighterNight())?.view.kind).toBe("OFFER");
  });

  it("each UNDO alone: the food part goes, the lift and the move stay", async () => {
    const { job } = await lastNight();
    await takeLighterNight((await getLighterNight())!.plan);
    undoLighterFood(dayId);
    const view = (await getLighterNight())!.view;
    expect(view).toMatchObject({ kind: "TAKEN", folded: "Lighter night: SHORT A · Filter change Mon." });
    expect((await db.obligations.get(job.id))!.plannedAt).toBe("2026-11-16");
    expect(await getPlannedWorkDeclaration(dayId)).toBe(true);
  });

  it("UNDO the home part moves each job back; a job changed elsewhere is left as it is", async () => {
    const { job } = await lastNight();
    const other = await createObligation({ title: "Home: Gutters", plannedAt: "2026-11-15" });
    await takeLighterNight((await getLighterNight())!.plan);
    expect((await db.obligations.get(other.id))!.plannedAt).toBe("2026-11-16");
    vi.setSystemTime(at(15, 17, 5));
    await modifyObligation(other.id, { plannedAt: "2026-11-18" });
    // After midnight, still the same lived day.
    vi.setSystemTime(at(16, 2));
    expect(await undoLighterHome(dayId)).toEqual({ changedElsewhere: ["Gutters"] });
    expect((await db.obligations.get(job.id))!.plannedAt).toBe("2026-11-15");
    expect((await db.obligations.get(other.id))!.plannedAt).toBe("2026-11-18");
  });

  it("UNDO the lift puts back the answer that was there; with none before, the answer stays and it says so", async () => {
    const { day } = await lastNight();
    await takeLighterNight((await getLighterNight())!.plan);
    expect(await undoLighterLift(day.id)).toEqual({ answerKept: true });
    expect(await getPlannedWorkDeclaration(day.id)).toBe(true);
    expect((await getLighterNight())?.view).toMatchObject({ kind: "TAKEN", folded: "Lighter night: your usuals · Filter change Mon." });
  });
});

describe("NOT TONIGHT and his switches", () => {
  it("NOT TONIGHT hides the card for the lived day and writes nothing", async () => {
    await lastNight();
    const before = await db.events.count();
    dismissLighterNight(dayId);
    expect(await getLighterNight()).toBeNull();
    expect(await db.events.count()).toBe(before);
  });

  it("the card and each part switch off, and the switches travel with the backup", async () => {
    await lastNight();
    writeLighterNightSettings({ on: true, lift: false, food: true, home: false });
    expect((await getLighterNight())?.view).toMatchObject({ lines: { food: expect.any(String) } });
    expect(Object.keys((await getLighterNight())!.view.kind === "OFFER" ? ((await getLighterNight())!.view as { lines: object }).lines : {})).toEqual(["food"]);
    writeLighterNightSettings({ on: false, lift: true, food: true, home: true });
    expect(await getLighterNight()).toBeNull();
    const block = readTravellingSettings();
    expect(block.values["beyond.lighterNight.v1"]).toBeDefined();
    localStorage.clear();
    expect(readLighterNightSettings().on).toBe(true);
    applySettingsBlock(block);
    expect(readLighterNightSettings()).toEqual({ on: false, lift: true, food: true, home: true });
  });
});
