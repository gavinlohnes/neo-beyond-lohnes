import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { CaveRouteView } from "../../src/ui/screens/systems/CaveRoute";
import { startDay } from "../../src/application/commands";
import { getSleepPlanSettings } from "../../src/application/sleepPlanSettings";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** C4.2a narrowed: owner editing, truthful source explanation, explicit SAVE and UNDO only. */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { await page.viewport(360, 800); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

async function routeAt() {
  await seedRotation();
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  return render(<CaveRouteView />);
}

it("CHANGE sets his own cut-off, says where the number comes from, redraws the time, and UNDO puts it back", async () => {
  const screen = await routeAt();
  const card = screen.getByRole("region", { name: /^NEXT SHIFT/ });
  await expect.element(card.getByText(/^Cut-off: 6 h before sleep: BEYOND's starting default/)).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Wed 00:00.")).toBeVisible();
  // No proposal surface or confidence claim exists, regardless of sleep evidence.
  expect(screen.container.querySelector("[data-cutoff-suggestion]")).toBeNull();
  const schedule = JSON.stringify((await db.schedulePatterns.get("current"))!.weeks);

  await card.getByRole("button", { name: "Change the caffeine cut-off" }).click();
  const editor = card.getByRole("group", { name: "Change the caffeine cut-off" });
  await editor.getByRole("button", { name: "One hour more" }).click();
  await editor.getByRole("button", { name: "One hour more" }).click();
  await expect.element(editor.getByText("8 h before sleep")).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({}); // nothing until SAVE
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/c4-2a-change.png`, element: document.querySelector("[data-plan-card='CAFFEINE']")! });
  await editor.getByRole("button", { name: "SAVE 8 H" }).click();
  await expect.element(card.getByText("Saved. Your caffeine cut-off setting is 8 h before sleep.")).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Tue 22:00.")).toBeVisible();
  await expect.element(card.getByText(/^Cut-off: 8 h before sleep: you set it\./)).toBeVisible();
  expect((await getSleepPlanSettings()).caffeineCutoff).toMatchObject({ hours: 8, setBy: "OWNER" });
  expect(JSON.stringify((await db.schedulePatterns.get("current"))!.weeks)).toBe(schedule);

  await card.getByRole("button", { name: "UNDO" }).click();
  await expect.element(card.getByText("Undone. Your cut-off is back as it was.")).toBeVisible();
  await expect.element(card.getByText("No substantial caffeine after Wed 00:00.")).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({});
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("CANCEL and bounded editing write nothing and make no personalized benefit claim", async () => {
  const screen = await routeAt();
  const card = screen.getByRole("region", { name: /^NEXT SHIFT/ });
  await expect.element(card.getByText(/not a proven safe cutoff or a personalized benefit/)).toBeVisible();
  await expect.element(card.getByRole("link", { name: "Study source" })).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/");
  expect(screen.container.textContent).not.toContain("Confidence:");
  expect(screen.container.textContent).not.toContain("DELTA SUGGESTS");
  await card.getByRole("button", { name: "Change the caffeine cut-off" }).click();
  const editor = card.getByRole("group", { name: "Change the caffeine cut-off" });
  for (let i = 0; i < 3; i++) await editor.getByRole("button", { name: "One hour less" }).click();
  await expect.element(editor.getByRole("button", { name: "One hour less" })).toBeDisabled();
  await expect.element(editor.getByText(/Below BEYOND's 6 h starting default/)).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({});
  await editor.getByRole("button", { name: "CANCEL", exact: true }).click();
  await expect.element(card.getByText(/^Cut-off: 6 h/)).toBeVisible();
  expect(await getSleepPlanSettings()).toEqual({});
  expect(screen.container.querySelector("[data-cutoff-suggestion]")).toBeNull();
});
