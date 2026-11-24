import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay, logWater } from "../../src/application/commands";
import { logManualMeal, voidMealLog } from "../../src/application/nutritionCommands";
import { getDayLogEntries } from "../../src/application/logEntries";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { HistoryScreen } from "../../src/ui/screens/history/HistoryScreen";
import { FIX_UNDO_MS } from "../../src/ui/hooks/useUndoWindow";
import { openLogTarget } from "./helpers/logSheet";

/**
 * GRAYSON-FIX-UNDO-001 (Gavin, 2026-11-24 02:02 CT): REMOVE on TODAY's log sheet is one tap and shows UNDO for 8 s; an
 * amount fix shows UNDO too; History puts a removed entry back later. A routine new log stays quiet. Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
async function aa(label: string, root: Element = document.body) {
  await settle();
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
function checkTargets(root: Element, width: number) {
  for (const button of root.querySelectorAll<HTMLElement>("button")) {
    if (!button.offsetParent) continue;
    expect(button.getBoundingClientRect().height, `${width} ${button.textContent} height`).toBeGreaterThanOrEqual(44);
  }
  for (const el of root.querySelectorAll<HTMLElement>(".log-entry p, .log-entry button")) {
    expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent} font`).toBeGreaterThanOrEqual(16);
  }
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}
async function seed() {
  vi.setSystemTime(new Date(2026, 10, 23, 17, 0));
  const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 23, 19, 15));
  await logManualMeal(day.id, { name: "Butter Chicken and Rice", calories: 560, proteinG: 46, carbsG: 60, fatG: 18 });
  await logWater(day.id, 16);
  vi.setSystemTime(new Date(2026, 10, 23, 19, 26));
  return day;
}
const waterSheet = () => page.getByRole("dialog", { name: "WATER", exact: true });

describe("GRAYSON-FIX-UNDO-001 on TODAY's log sheet", () => {
  it("REMOVE is one tap with no confirm step, then UNDO puts it back", async () => {
    const day = await seed();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Water 16 oz at 19:15", exact: true }).click();
    await expect.element(waterSheet()).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-sheet-before-remove-360.png`, element: waterSheet().element() as HTMLElement }); }

    await waterSheet().getByRole("button", { name: "REMOVE", exact: true }).click();
    // No "Remove …?" step and no KEEP IT: it's removed at once.
    await expect.element(page.getByText("Removed. It stays in HISTORY as removed.", { exact: true })).toBeVisible();
    expect(page.getByRole("button", { name: "KEEP IT" }).query()).toBeNull();
    expect(await getEffectiveHydrationTotal(day.id)).toBe(0);
    const undo = waterSheet().getByRole("button", { name: "Undo the removal", exact: true });
    await expect.element(undo).toBeVisible();
    await undo.click();
    await expect.element(waterSheet().getByText("Put back. HISTORY shows the removal and the put-back.", { exact: true })).toBeVisible();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(16);
    await expect.element(waterSheet().getByText("16 oz", { exact: true })).toBeVisible();
  }, 60_000);

  it("the removed state with its UNDO fits 320/360/412 px, 44 px targets, 16 px text, axe clean", async () => {
    await seed();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Water 16 oz at 19:15", exact: true }).click();
    await waterSheet().getByRole("button", { name: "REMOVE", exact: true }).click();
    await expect.element(waterSheet().getByRole("button", { name: "Undo the removal", exact: true })).toBeVisible();
    // Only the layout is checked here, so a slow run can outlast the 8 s window without changing the result.
    for (const width of [320, 412, 360]) {
      await page.viewport(width, 900); await settle();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-sheet-removed-undo-${width}.png`, element: waterSheet().element() as HTMLElement });
      checkTargets(waterSheet().element(), width);
      await aa(`removed ${width}`, waterSheet().element());
    }
  }, 60_000);

  it("SAVE AMOUNT shows UNDO, which saves the amount from before the fix", async () => {
    const day = await seed();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Water 16 oz at 19:15", exact: true }).click();
    await waterSheet().getByRole("button", { name: "EDIT AMOUNT", exact: true }).click();
    await waterSheet().getByRole("spinbutton", { name: "Water (oz)", exact: true }).fill("160");
    await waterSheet().getByRole("button", { name: "SAVE AMOUNT", exact: true }).click();
    await expect.element(waterSheet().getByText("160 oz", { exact: true })).toBeVisible();
    const undo = waterSheet().getByRole("button", { name: "Undo the amount fix", exact: true });
    await expect.element(undo).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-sheet-fix-undo-360.png`, element: waterSheet().element() as HTMLElement }); }
    await undo.click();
    await expect.element(waterSheet().getByText("16 oz", { exact: true })).toBeVisible();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(16);
  });

  it("keyboard only: Enter on REMOVE, focus lands on UNDO, Enter puts it back", async () => {
    const day = await seed();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^THE NIGHT SO FAR/ }).click();
    await screen.getByRole("button", { name: "Edit Water 16 oz at 19:15", exact: true }).click();
    const remove = waterSheet().getByRole("button", { name: "REMOVE", exact: true });
    await expect.element(remove).toBeVisible();
    (remove.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    const undo = waterSheet().getByRole("button", { name: "Undo the removal", exact: true });
    await expect.element(undo).toBeVisible();
    // REMOVE left with the entry; focus is on UNDO, not lost to the page.
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Undo the removal");
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(16);
  });

  it("a routine new log keeps its quiet message with no Undo (OWNER-GO-001)", async () => {
    await seed();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await openLogTarget(screen, "WATER");
    const sheet = screen.getByRole("dialog", { name: "WATER", exact: true });
    await sheet.getByRole("button", { name: "+8 oz", exact: true }).click();
    await expect.element(screen.getByText(/^8 oz recorded/)).toBeVisible();
    expect(page.getByRole("button", { name: /^undo/i }).query()).toBeNull();
  });

  it("the Undo window is the shared 8 seconds", () => {
    expect(FIX_UNDO_MS).toBe(8000);
  });
});

describe("GRAYSON-FIX-UNDO-001 in History", () => {
  it("a removed entry offers PUT IT BACK later; History then shows the removal and the put-back", async () => {
    const day = await seed();
    const meal = (await getDayLogEntries(day.id)).find((e) => e.kind === "MEAL")!;
    vi.setSystemTime(new Date(2026, 10, 23, 19, 40));
    await voidMealLog(day.id, meal.rootEventId);
    vi.setSystemTime(new Date(2026, 10, 23, 21, 0));
    await page.viewport(360, 800);
    const screen = await render(<HistoryScreen />);
    await screen.getByRole("button", { name: "SHOW" }).first().click();
    const putBack = screen.getByRole("button", { name: "Put back the entry removed at 19:40", exact: true });
    await expect.element(putBack).toBeVisible();
    for (const width of [320, 412, 360]) {
      await page.viewport(width, 800); await settle();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-history-removed-${width}.png` });
      for (const b of document.querySelectorAll<HTMLElement>(".history-put-back")) {
        expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(parseFloat(getComputedStyle(b).fontSize)).toBeGreaterThanOrEqual(16);
      }
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
      await aa(`history ${width}`);
    }
    await putBack.click();
    await expect.element(screen.getByText("Meal log put back.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Meal log deleted.", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Put back the entry/ }).query()).toBeNull();
    expect((await getDayLogEntries(day.id)).map((e) => e.kind)).toEqual(["MEAL", "WATER"]);
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-history-put-back-360.png` }); }
    await aa("history after put back");
  }, 60_000);
});
