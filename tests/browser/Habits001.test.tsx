import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { HabitsPanel } from "../../src/ui/components/HabitsPanel";
import "../../src/ui/screens/more/operator.css";

beforeEach(async () => { await page.viewport(360, 800); await startDay("2026-11-03T17:00:00.000Z"); });
afterEach(() => { cleanup(); window.scrollTo(0, 0); });

it("creates, marks and corrects a habit without streak or missed language at 360px", async () => {
  const screen = await render(<HabitsPanel active />);
  await screen.getByRole("textbox", { name: "Habit name", exact: true }).fill("Mobility");
  await screen.getByRole("button", { name: "SAVE HABIT", exact: true }).click();
  await expect.element(screen.getByText("0 this week · 0 in 4 weeks", { exact: true })).toBeVisible();
  expect(document.body.textContent?.toLowerCase()).not.toContain("streak");
  expect(document.body.textContent?.toLowerCase()).not.toContain("missed");
  const mark = screen.getByRole("button", { name: "MARK DONE", exact: true });
  await mark.click();
  await expect.element(screen.getByText("1 this week · 1 in 4 weeks", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "DONE", exact: true }).click();
  await expect.element(screen.getByText("0 this week · 0 in 4 weeks", { exact: true })).toBeVisible();
  expect(await db.events.where("type").equals("HABIT_SET").count()).toBe(2);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  for (const control of document.querySelectorAll<HTMLElement>(".habits-panel button, .habits-panel input, .habits-panel select")) {
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
  expect((await axe.run(document.body)).violations).toEqual([]);
});
