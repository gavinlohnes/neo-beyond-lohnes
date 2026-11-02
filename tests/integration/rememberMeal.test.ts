import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { confirmProposal } from "../../src/application/alfred/alfredActions";
import { getSavedMeals } from "../../src/application/nutritionQueries";

/** FREE-HELPER-002: SAVE + REMEMBER MEAL keeps an estimate as a saved meal, so next time it logs free. Invented data. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("keeps the meal and logs it from the saved meal, once", async () => {
  const day = await startDay();
  await confirmProposal({ kind: "log_meal", name: "Pepperoni pizza, 2 slices", calories: 640, protein_g: 28, remember: true });
  const [meal] = await getSavedMeals();
  expect(meal).toMatchObject({ name: "Pepperoni pizza, 2 slices", calories: 640, proteinG: 28 });
  const logged = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter((e) => e.type === "MEAL_LOGGED");
  expect(logged).toHaveLength(1);
  expect(logged[0]!.payload).toMatchObject({ calories: 640, proteinG: 28 });
});

it("plain SAVE still logs without keeping a meal", async () => {
  await startDay();
  await confirmProposal({ kind: "log_meal", name: "Burger", calories: 650, protein_g: 30 });
  expect(await getSavedMeals()).toEqual([]);
});
