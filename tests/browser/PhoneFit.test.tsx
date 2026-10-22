import { commandResult } from "./helpers/command";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { BodyScreen } from "../../src/ui/screens/body/BodyScreen";
import { SessionDraftProvider } from "../../src/ui/sessionDrafts";
import { logBodyweight, logProtein, logSleep, logWater, startDay } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { db } from "../../src/persistence/db";

/**
 * Leftovers from the PR #228 reviews:
 *   R3 — the Obligation EDIT form's Due/Planned row widened the page at 320/360 px;
 *   R4 — an open but unchanged BODY correction editor counted as unsaved input.
 */

function reloadWouldWarn(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
/** Draft registration settles through React effects; let them run before asserting "no warning". */
async function settled() {
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

afterEach(async () => { cleanup(); window.scrollTo(0, 0); await page.viewport(1280, 800); });

describe("R3 — Obligation EDIT fits a phone", () => {
  beforeEach(async () => { await startDay(); });
  it.each([320, 360, 412])("keeps the edit form within the viewport and the nav reachable at %ipx", async (width) => {
    await page.viewport(width, 800);
    await createObligation({ title: "Task A", dueAt: "2026-10-20", plannedAt: "2026-10-14" });
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
    await (await commandResult(screen, "MISSIONS & OBLIGATIONS")).click();
    await screen.getByRole("button", { name: "Open Task A", exact: true }).click();
    await screen.getByRole("button", { name: "EDIT", exact: true }).click();
    const due = screen.getByLabelText("Due", { exact: true });
    const planned = screen.getByLabelText("Planned", { exact: true });
    await expect.element(due).toHaveValue("2026-10-20");
    await expect.element(planned).toHaveValue("2026-10-14");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    for (const input of [due.element(), planned.element()]) expect(input.getBoundingClientRect().right).toBeLessThanOrEqual(width);
    // Narrow phones stack the dates; wider ones keep them side by side.
    const [dueTop, plannedTop] = [due.element().getBoundingClientRect().top, planned.element().getBoundingClientRect().top];
    if (width <= 360) expect(plannedTop).toBeGreaterThan(dueTop);
    else expect(plannedTop).toBe(dueTop);
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
  });
});

describe("R4 — BODY warns only about changed correction input", () => {
  it("opening every correction editor unchanged does not warn; a change warns; restoring it clears", async () => {
    await page.viewport(360, 800);
    const day = await startDay();
    await logWater(day.id, 16);
    await logSleep(day.id, 400);
    await logBodyweight(day.id, 180);
    await logProtein(day.id, 30);
    const dinner = await createSavedMeal({ name: "Dinner", calories: 600, proteinG: 45, carbsG: 60, fatG: 15 });
    await logMeal(day.id, dinner.id);
    const eventsBefore = await db.events.count();
    const screen = await render(<SessionDraftProvider><BodyScreen /></SessionDraftProvider>);

    // Inspecting a record shows only its own tool; each editor is checked while it is open.
    const editors: [record: string, input: string, saved: string, changed: string][] = [
      ["Water · 16 oz", "Corrected amount (oz)", "16", "12"],
      ["Main sleep · 6 hr 40 min", "", "", ""],
      ["Bodyweight · 180 lbs", "Corrected weight (lbs)", "180", "179"],
      ["Protein · 30 g", "Corrected amount (g)", "30", "25"],
    ];
    for (const [record, label, saved, changed] of editors) {
      await screen.getByRole("button", { name: `Open ${record}`, exact: true }).click();
      await expect.poll(() => document.activeElement instanceof HTMLInputElement).toBe(true);
      await settled();
      expect(reloadWouldWarn(), record).toBe(false);
      if (!label) {
        // Sleep: hours and minutes are prefilled from the saved duration (6 hr 40 min).
        const hours = page.elementLocator(document.activeElement as HTMLElement);
        await expect.element(hours).toHaveValue(6);
        await hours.fill("5");
        await expect.poll(reloadWouldWarn).toBe(true);
        await hours.fill("6");
        await expect.poll(reloadWouldWarn).toBe(false);
        continue;
      }
      const input = screen.getByRole("spinbutton", { name: label });
      await expect.element(input).toHaveValue(Number(saved));
      await input.fill(changed);
      await expect.poll(reloadWouldWarn, { message: record }).toBe(true);
      await input.fill(saved);
      await expect.poll(reloadWouldWarn, { message: record }).toBe(false);
    }

    await screen.getByRole("button", { name: "Open Dinner", exact: true }).click();
    const calories = screen.getByRole("spinbutton", { name: "Corrected calories" });
    await expect.element(calories).toHaveValue(600);
    await settled();
    expect(reloadWouldWarn()).toBe(false);
    await calories.fill("550");
    await expect.poll(reloadWouldWarn).toBe(true);
    await calories.fill("600");
    await expect.poll(reloadWouldWarn).toBe(false);

    // Typed new input still warns as before.
    await screen.getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Open SLEEP" }).click();
    await page.elementLocator(document.getElementById("sleep-hours")!).fill("7");
    await expect.poll(reloadWouldWarn).toBe(true);
    expect(await db.events.count()).toBe(eventsBefore);
  });
});
