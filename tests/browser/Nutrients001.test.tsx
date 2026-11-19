import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { exportDB } from "dexie-export-import";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { applyRestore } from "../../src/persistence/backup";
import { startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal, logManualMeal } from "../../src/application/nutritionCommands";
import { getMealEntries, getSavedMeals } from "../../src/application/nutritionQueries";

/**
 * NUTRIENTS-001 (Gavin, 2026-11-19: "2. A"): fiber and sodium survive a backup and restore unchanged (the native
 * backup copies the records whole; there's no new table or Dexie version), and the MEAL sheet's day line names them
 * with how many meals recorded them. Synthetic data only.
 */
beforeEach(async () => { try { localStorage.clear(); } catch { /* ignore */ } await page.viewport(360, 800); });
afterEach(() => { cleanup(); });

describe("NUTRIENTS-001", () => {
  it("fiber and sodium round-trip through backup and restore, and older meals still restore without them", async () => {
    const day = await startDay();
    const oats = await createSavedMeal({ name: "Oats", calories: 379, proteinG: 13, carbsG: 68, fatG: 6.5, fiberG: 10.1, sodiumMg: 6 });
    await logMeal(day.id, oats.id, 2);
    await logManualMeal(day.id, { name: "Toast", calories: 200, proteinG: 8, carbsG: 30, fatG: 4 });
    const file = new File([await (await exportDB(db)).text()], "backup.json", { type: "application/json" });
    await db.delete(); await db.open();
    await applyRestore(file);
    expect((await getSavedMeals()).find((m) => m.name === "Oats")).toMatchObject({ fiberG: 10.1, sodiumMg: 6 });
    const entries = await getMealEntries(day.id);
    expect(entries.map((e) => [e.name, e.fiberG, e.sodiumMg])).toEqual([["Oats", 20.2, 12], ["Toast", undefined, undefined]]);
  });

  it("the MEAL sheet's day line names fiber and sodium and how many meals recorded them", async () => {
    const day = await startDay();
    const oats = await createSavedMeal({ name: "Oats", calories: 379, proteinG: 13, carbsG: 68, fatG: 6.5, fiberG: 10.1, sodiumMg: 6 });
    await logMeal(day.id, oats.id, 1);
    await logManualMeal(day.id, { name: "Toast", calories: 200, proteinG: 8, carbsG: 30, fatG: 4 });
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Open LOG" }).click();
    await screen.getByRole("dialog", { name: "LOG" }).getByRole("button", { name: "MEAL", exact: true }).click();
    await expect.poll(() => document.querySelector("dialog[open] [data-food-nutrients]")?.textContent).toBe("Fiber 10.1 g · Sodium 6 mg · from 1 of 2 meals");
    expect(parseFloat(getComputedStyle(document.querySelector("dialog[open] [data-food-nutrients]")!).fontSize)).toBeGreaterThanOrEqual(16);
  });
});
