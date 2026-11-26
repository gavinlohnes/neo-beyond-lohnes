import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { RecordSheets } from "../../src/ui/components/RecordSheets";
import { FitsNowBlock } from "../../src/ui/components/FitsNowBlock";
import { NutritionTargetsSettings } from "../../src/ui/screens/more/NutritionTargetsSettings";
import { startDay } from "../../src/application/commands";
import { archiveSavedMeal, createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-FITS-NOW-001: Fits now at the top of the MEAL sheet's list and one line on the BODY food card. LOG logs one
 * serving now through logMeal (the meal log's own receipt; removal stays in DATA's history, per OWNER-GO-001).
 * VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const sheet = () => render(<RecordSheets target="meal" open={() => {}} close={() => {}} onSaved={() => {}} onBusy={() => {}} onHistory={() => {}} onWorkout={() => {}} onNotes={() => {}} />);
const block = () => document.querySelector("[aria-label='Fits now']") as HTMLElement | null;
let dayId = "";

beforeEach(async () => {
  localStorage.clear();
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 12));
  dayId = (await startDay()).id;
  await updateNutritionTargets({ calorieTargetKcal: 2000 });
  const eggs = await createSavedMeal({ name: "Eggs on toast", calories: 1400, proteinG: 40, carbsG: 90, fatG: 60 });
  await logMeal(dayId, eggs.id, 1);
  await createSavedMeal({ name: "Chicken rice bowl", calories: 520, proteinG: 45, carbsG: 50, fatG: 12 });
  await createSavedMeal({ name: "Protein shake", calories: 220, proteinG: 30, carbsG: 8, fatG: 3 });
  await createSavedMeal({ name: "Lasagne", calories: 900, proteinG: 50, carbsG: 80, fatG: 40 });
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-FITS-NOW-001", () => {
  it("the MEAL sheet shows up to three of his meals that fit what's left, each with what it leaves; LOG logs one serving now", async () => {
    const screen = await sheet();
    const fits = screen.getByRole("region", { name: "Fits now" });
    await expect.element(fits.getByText("Chicken rice bowl", { exact: true })).toBeVisible();
    await expect.element(fits.getByText("Leaves 80 kcal")).toBeVisible();
    expect(fits.getByText("Lasagne").elements()).toHaveLength(0); // 900 kcal against 600 left
    // Fits now comes before LIKELY NOW.
    const likely = screen.getByRole("heading", { name: "LIKELY NOW" }).element();
    expect(block()!.compareDocumentPosition(likely) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const el of block()!.querySelectorAll<HTMLElement>("button")) expect(Math.round(el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
    await page.viewport(360, 900);
    expect((await axe.run(block()!, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/meal-sheet-${w}.png`, element: block()! }); }
    await page.viewport(360, 900);

    const before = await db.events.where("type").equals("MEAL_LOGGED").count();
    await fits.getByRole("button", { name: "Log Chicken rice bowl now" }).click();
    await expect.element(screen.getByText("Chicken rice bowl logged.")).toBeVisible();
    const logged = await db.events.where("type").equals("MEAL_LOGGED").toArray();
    expect(logged).toHaveLength(before + 1);
    const last = logged.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).at(-1)!;
    expect(last.beyondDayId).toBe(dayId);
    expect((last.payload as { name: string }).name).toBe("Chicken rice bowl");
  });

  it("nothing fits: one plain line and no list", async () => {
    const lunch = await createSavedMeal({ name: "Big lunch", calories: 420, proteinG: 10, carbsG: 60, fatG: 15 });
    await logMeal(dayId, lunch.id, 1); // 180 kcal left
    for (const m of await db.savedMeals.toArray()) if (["Chicken rice bowl", "Protein shake", "Big lunch"].includes(m.name)) await archiveSavedMeal(m.id);
    const screen = await sheet();
    await expect.element(screen.getByRole("region", { name: "Fits now" }).getByText("None of your saved meals fit the 180 kcal left")).toBeVisible();
    expect(block()!.querySelectorAll("button")).toHaveLength(0);
  });

  it("the BODY food card line names the best fit", async () => {
    const screen = await render(<FitsNowBlock compact busy={false} />);
    await expect.element(screen.getByText("Fits now: Chicken rice bowl · 520 kcal · 45 g protein")).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/body-line-360.png`, element: document.querySelector("[data-fits-now-line]") as HTMLElement });
  });

  it("switched off in Nutrition targets, it's gone", async () => {
    const settings = await render(<NutritionTargetsSettings />);
    const open = settings.getByRole("button", { name: "Open TARGETS", exact: true });
    await expect.element(open).toBeEnabled();
    await open.click();
    const box = settings.getByRole("checkbox", { name: /^Show Fits now/ });
    await expect.element(box).toBeChecked();
    await box.click();
    await expect.element(box).not.toBeChecked();
    await cleanup();
    const screen = await sheet();
    await expect.element(screen.getByRole("heading", { name: "LIKELY NOW" })).toBeVisible();
    expect(block()).toBeNull();
  });
});
