import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { archiveSavedMeal, createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getPlannedDayCalorieTarget } from "../../src/application/nutritionTargetQueries";
import { getFitsNow, writeFitsNowOn } from "../../src/application/fitsNowQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/** GRAYSON-FITS-NOW-001 through the application layer. Run under TZ=UTC and TZ=America/Chicago. */
const at = (d: number, h = 18) => new Date(2026, 10, d, h);
beforeEach(async () => {
  await db.open(); localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(() => { vi.useRealTimers(); db.close(); });

async function todayWith(target: number) {
  vi.setSystemTime(at(18, 17));
  const day = await startDay(new Date(2026, 10, 18, 16, 30).toISOString());
  await updateNutritionTargets({ calorieTargetKcal: target });
  const bowl = await createSavedMeal({ name: "Chicken bowl", calories: 520, proteinG: 45, carbsG: 50, fatG: 12 });
  const big = await createSavedMeal({ name: "Lasagne", calories: 1400, proteinG: 50, carbsG: 120, fatG: 60 });
  return { day, bowl, big };
}

describe("Fits now", () => {
  it("reads what's left from the day's target: the plain one when targets by kind of day are off, the day's own when on", async () => {
    const { day } = await todayWith(2000);
    const breakfast = await createSavedMeal({ name: "Eggs", calories: 900, proteinG: 40, carbsG: 10, fatG: 60 });
    await logMeal(day.id, breakfast.id, 1);
    expect((await getFitsNow())).toMatchObject({ kind: "LIST", leftKcal: 1100 });
    await updateNutritionTargets({ dayTargets: { on: true, adjustKcal: { WORK: 200, RECOVERY: 0, OFF: 0, LIFT: 0 } } });
    const today = await getPlannedDayCalorieTarget(new Date(2026, 10, 18, 16, 30));
    expect(today.kind).toBe("WORK");
    expect((await getFitsNow())).toMatchObject({ leftKcal: today.kcal! - 900 });
  });

  it("no calorie target hides it; the switch off hides it", async () => {
    vi.setSystemTime(at(18, 17));
    await startDay();
    await createSavedMeal({ name: "Chicken bowl", calories: 520, proteinG: 45, carbsG: 50, fatG: 12 });
    expect(await getFitsNow()).toBeNull();
    await updateNutritionTargets({ calorieTargetKcal: 2000 });
    expect(await getFitsNow()).not.toBeNull();
    writeFitsNowOn(false);
    expect(await getFitsNow()).toBeNull();
    writeFitsNowOn(true);
    expect(await getFitsNow()).not.toBeNull();
  });

  it("archived meals never show; a meal too big for what's left doesn't either", async () => {
    const { day, bowl, big } = await todayWith(2000);
    const shake = await createSavedMeal({ name: "Shake", calories: 200, proteinG: 30, carbsG: 5, fatG: 3 });
    await archiveSavedMeal(shake.id);
    let fits = await getFitsNow();
    expect(fits?.kind === "LIST" && fits.rows.map((r) => r.meal.id)).toEqual([big.id, bowl.id]);
    // With 1,000 kcal logged, the 1,400 kcal lasagne no longer fits.
    const lunch = await createSavedMeal({ name: "Lunch", calories: 1000, proteinG: 20, carbsG: 100, fatG: 30 });
    await logMeal(day.id, lunch.id, 1);
    fits = await getFitsNow();
    const ids = fits?.kind === "LIST" ? fits.rows.map((r) => r.meal.id) : [];
    expect(ids).toContain(bowl.id);
    expect(ids).not.toContain(big.id);
    expect(ids).not.toContain(shake.id);
  });

  it("LOG writes one MEAL_LOGGED through logMeal, and UNDO (the meal log's void) takes it back", async () => {
    const { day, bowl } = await todayWith(2000);
    const before = await db.events.where("type").equals("MEAL_LOGGED").count();
    const result = await logMeal(day.id, bowl.id, 1);
    expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(before + 1);
    expect((await getFitsNow())).toMatchObject({ leftKcal: 1480 });
    await voidMealLog(day.id, result.eventId);
    expect((await getFitsNow())).toMatchObject({ leftKcal: 2000 });
  });

  it("a protein tie goes to the meal logged most on this kind of day over the last 28 days", async () => {
    const a = await createSavedMeal({ name: "Bowl A", calories: 400, proteinG: 30, carbsG: 40, fatG: 10 });
    const b = await createSavedMeal({ name: "Bowl B", calories: 400, proteinG: 30, carbsG: 40, fatG: 10 });
    // B on two earlier work nights; A on one earlier day off. Today is a work night, so B wins the tie.
    for (const [d, kind, meal] of [[11, "WORK", b], [12, "WORK", b], [14, "OFF", a]] as const) {
      vi.setSystemTime(at(d, 17));
      const earlier = await startDay(new Date(2026, 10, d, 16, 30).toISOString());
      await setWorkContext(earlier.id, kind, "MANUAL");
      await logMeal(earlier.id, meal.id, 1);
      vi.setSystemTime(at(d + 1, 16));
      await endDay(earlier.id);
    }
    vi.setSystemTime(at(18, 17));
    const day = await startDay(new Date(2026, 10, 18, 16, 30).toISOString());
    await setWorkContext(day.id, "WORK", "MANUAL");
    await updateNutritionTargets({ calorieTargetKcal: 2000 });
    const fits = await getFitsNow();
    expect(fits?.kind === "LIST" && fits.rows.map((r) => r.meal.id)).toEqual([b.id, a.id]);
    // On a day off the tie goes the other way.
    await setWorkContext(day.id, "OFF", "MANUAL");
    const off = await getFitsNow();
    expect(off?.kind === "LIST" && off.rows.map((r) => r.meal.id)).toEqual([a.id, b.id]);
  });
});
