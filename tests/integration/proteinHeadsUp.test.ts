import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, logBodyweight, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";
import { dismissProteinHeadsUp, getProteinHeadsUp, saveProteinHeadsUpSettings } from "../../src/application/proteinPatternQueries";

/** GRAYSON-PROTEIN-HEADSUP-001 through the application layer. Run under TZ=UTC and TZ=America/Chicago. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(() => { vi.useRealTimers(); db.close(); });

/** Finished lived days Nov 20–25 with the given protein (one meal each; null = no meal logged). Target 180 g. */
async function days(protein: (number | null)[]): Promise<string[]> {
  vi.setSystemTime(new Date(2026, 10, 19, 17));
  const first = await startDay(new Date(2026, 10, 19, 16, 30).toISOString());
  await logBodyweight(first.id, 180); // 1.0 g/lb → 180 g target
  vi.setSystemTime(new Date(2026, 10, 20, 16, 25)); await endDay(first.id);
  const ids: string[] = [];
  for (const [i, g] of protein.entries()) {
    const d = 20 + i;
    vi.setSystemTime(new Date(2026, 10, d, 17));
    const day = await startDay(new Date(2026, 10, d, 16, 30).toISOString());
    if (g !== null) await logMeal(day.id, (await createSavedMeal({ name: `Meal ${d}`, calories: 1800, proteinG: g, carbsG: 100, fatG: 50 })).id, 1);
    vi.setSystemTime(new Date(2026, 10, d + 1, 16, 25)); await endDay(day.id);
    ids.push(day.id);
  }
  return ids;
}

describe("protein heads-up", () => {
  it("counts finished days with a meal only: a day with no meal is skipped, today never counts", async () => {
    await days([98, 104, null, 91, 170]);
    vi.setSystemTime(new Date(2026, 10, 25, 18)); // Nov 25's lived day is today
    const today = await startDay();
    await logMeal(today.id, (await createSavedMeal({ name: "Today", calories: 500, proteinG: 10, carbsG: 1, fatG: 1 })).id, 1);
    // Counted: Nov 20 (98), 21 (104), 23 (91), 24 (170) → 3 of 4 under 135 g.
    expect((await getProteinHeadsUp())?.line).toBe("Protein has been under 75% of your target on 3 of the last 4 days.");
  });

  it("a marked not-fully-logged day is left out when passed in", async () => {
    const ids = await days([98, 104, 170, 91, 170]);
    vi.setSystemTime(new Date(2026, 10, 25, 18));
    expect(await getProteinHeadsUp()).toBeNull(); // last 4: 104, 170, 91, 170
    // Leave out Nov 24 (170): last 4 counted become 98, 104, 170, 91 → 3 under.
    expect(await getProteinHeadsUp(new Date(), new Set([ids[4]!]))).not.toBeNull();
  });

  it("THAT'S FINE hides it for a week (and its UNDO brings it back); the weekly proposal save keeps his settings", async () => {
    await days([98, 104, 170, 91]);
    vi.setSystemTime(new Date(2026, 10, 24, 18));
    expect(await getProteinHeadsUp()).not.toBeNull();
    const { undo } = await dismissProteinHeadsUp();
    expect(await getProteinHeadsUp()).toBeNull();
    expect(await undo()).toBe(true);
    expect(await getProteinHeadsUp()).not.toBeNull();
    await dismissProteinHeadsUp();
    await updateNutritionTargets({ calorieTargetKcal: 2100 }); // like saving the weekly proposal
    expect((await getNutritionTargets()).proteinHeadsUp?.dismissedAt).toBeDefined();
    vi.setSystemTime(new Date(2026, 11, 2, 18)); // 8 days later: shows again (the same finished days)
    expect(await getProteinHeadsUp()).not.toBeNull();
  });

  it("off, his numbers, an old row and no target", async () => {
    await days([150, 150, 170, 170]);
    vi.setSystemTime(new Date(2026, 10, 24, 18));
    expect(await getProteinHeadsUp()).toBeNull(); // old row: no proteinHeadsUp, defaults apply; 150 g is 83%
    await saveProteinHeadsUpSettings({ on: true, underPercent: 90, days: 2, windowDays: 4 });
    expect((await getProteinHeadsUp())?.line).toBe("Protein has been under 90% of your target on 2 of the last 4 days.");
    await saveProteinHeadsUpSettings({ on: false, underPercent: 90, days: 2, windowDays: 4 });
    expect(await getProteinHeadsUp()).toBeNull();
    await expect(saveProteinHeadsUpSettings({ on: true, underPercent: 40, days: 2, windowDays: 4 })).rejects.toThrow();
    await expect(saveProteinHeadsUpSettings({ on: true, underPercent: 75, days: 5, windowDays: 4 })).rejects.toThrow();
  });
});
