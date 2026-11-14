import { vi } from "vitest";
import { logBodyweight, logWater, updateSchedulePattern } from "../../../src/application/commands";
import { createSavedMeal, logMeal } from "../../../src/application/nutritionCommands";
import { createHabit, setHabitDone } from "../../../src/application/habitCommands";
import { saveQuitHabit } from "../../../src/application/quitCommands";
import { importActivitySnapshot } from "../../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../../src/application/externalSleepCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../../src/engine/scheduledContext";
import { db } from "../../../src/persistence/db";
import { syntheticGarminMonth } from "../../helpers/syntheticGarminMonth";

/**
 * A realistic synthetic month for screen tests (BODY-DASH-001's seed, shared by VISUAL-FOUNDATION-003): 30 lived days
 * with Garmin steps, heart rate, sleep and calories; the default schedule saved; four weigh-ins; today's water, a meal,
 * two habits and a quit tracker. The clock must be faked (Date) before calling it; it leaves the clock at `now`.
 */
export const MONTH_FIRST_DAY = new Date(2026, 8, 22, 16, 30).getTime();
export const MONTH_NOW = new Date(2026, 9, 21, 22, 10).getTime(); // day 29 of 30 is in progress (a work day)

export async function seedLivedMonth(firstDay = MONTH_FIRST_DAY, now = MONTH_NOW) {
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now, { calories: true });
  await db.beyondDays.bulkAdd(days);
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  // Weigh-ins on past days, then today's logs.
  for (const [i, lbs] of [[15, 207.4], [20, 206.6], [24, 206.0], [28, 205.2]] as const) {
    vi.setSystemTime(firstDay + i * 86_400_000 + 3 * 3_600_000); await logBodyweight(days[i]!.id, lbs);
  }
  const today = days[29]!.id;
  for (const [h, oz] of [[1, 16], [3, 8], [4.5, 8]] as const) { vi.setSystemTime(firstDay + 29 * 86_400_000 + h * 3_600_000); await logWater(today, oz); }
  vi.setSystemTime(now - 3_600_000);
  const meal = await createSavedMeal({ name: "Chicken and rice", calories: 640, proteinG: 48, carbsG: 70, fatG: 14 });
  await logMeal(today, meal.id);
  const habit = await createHabit({ name: "Fasting", kind: "ANY_DAY" }); await setHabitDone(habit.id, true, today);
  await createHabit({ name: "Stretch", kind: "ANY_DAY" });
  await saveQuitHabit({ name: "Alcohol" });
  vi.setSystemTime(now);
}
