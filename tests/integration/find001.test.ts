import { describe, expect, it } from "vitest";
import { noteShiftHandoff, startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { createSavedMeal, logMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { createDecisionJournalEntry } from "../../src/application/journalCommands";
import { sealTimeCapsule } from "../../src/application/timeCapsuleCommands";
import { searchAll } from "../../src/application/searchQueries";

/** FIND-001: one search across lifts, PRs, notes, meals, journal and History. */

async function chestSession(weight: number) {
  const day = await startDay();
  const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, s.id, "machine-chest-press", 1, weight, 10);
  await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED", 45);
  return day;
}

describe("FIND-001 searchAll", () => {
  it('"chest" returns the chest lift, every chest PR, each day it was trained, and a chest note', async () => {
    await chestSession(100);
    await chestSession(110);
    const day = await chestSession(120);
    await noteShiftHandoff(day.id, "Chest machine seat is broken at the gym");
    const results = await searchAll("chest");
    const kinds = results.map((r) => r.domain);
    expect(kinds.filter((k) => k === "LIFT")).toHaveLength(1);
    expect(results.filter((r) => r.domain === "PR").map((r) => r.title)).toEqual(
      expect.arrayContaining(["Machine Chest Press · Heaviest: 110 lb × 10", "Machine Chest Press · Heaviest: 120 lb × 10"]),
    );
    expect(kinds.filter((k) => k === "DAY")).toHaveLength(3);
    expect(results.find((r) => r.domain === "NOTE")).toMatchObject({ dayId: day.id });
    expect(results.find((r) => r.domain === "LIFT")).toMatchObject({ exerciseId: "machine-chest-press" });
  });

  it("finds meals (saved and on the day they were eaten) and journal entries", async () => {
    const day = await startDay();
    const oats = await createSavedMeal({ name: "Overnight oats", calories: 400, proteinG: 30, carbsG: 50, fatG: 10 });
    await logMeal(day.id, oats.id);
    await createDecisionJournalEntry({ title: "Train before shift", decision: "Lift at 1600 on work days" });
    expect((await searchAll("oats")).map((r) => r.domain).sort()).toEqual(["DAY", "MEAL"]);
    expect((await searchAll("shift")).map((r) => r.domain)).toContain("JOURNAL");
  });

  it("a meal deleted after logging isn't shown as eaten that day", async () => {
    const day = await startDay();
    const bake = await createSavedMeal({ name: "Zucchini bake", calories: 500, proteinG: 20, carbsG: 40, fatG: 20 });
    const logged = await logMeal(day.id, bake.id);
    await voidMealLog(day.id, logged.eventId);
    // The saved meal itself is still findable; the day it was deleted from is not.
    expect((await searchAll("zucchini")).map((r) => r.domain)).toEqual(["MEAL"]);
  });

  it("a sealed time capsule's text is never searchable", async () => {
    await sealTimeCapsule("Remember the zebra plan", 3);
    expect(await searchAll("zebra")).toEqual([]);
  });
});
