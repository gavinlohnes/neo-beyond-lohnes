import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { HabitsPanel } from "../../src/ui/components/HabitsPanel";
import "../../src/ui/screens/more/operator.css";

// Wednesday 18 November 2026, evening of its lived day.
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 18, 20)); await page.viewport(320, 800); await startDay(new Date(2026, 10, 18, 17).toISOString()); });
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

it("HABIT-QUOTA-001: creates a 2-times-a-week habit and shows the week's progress at 320px", async () => {
  const screen = await render(<HabitsPanel active />);
  await screen.getByRole("textbox", { name: "Habit name", exact: true }).fill("Lift");
  await screen.getByRole("combobox", { name: "When", exact: true }).selectOptions("TIMES_A_WEEK");
  const times = screen.getByRole("combobox", { name: "Times each week (Monday to Sunday)", exact: true });
  await expect.element(times).toHaveValue("3");
  await times.selectOptions("2");
  await screen.getByRole("button", { name: "SAVE HABIT", exact: true }).click();
  await expect.element(screen.getByText("0 of 2 this week · 0 in 4 weeks", { exact: true })).toBeVisible();
  expect((await db.habits.toArray())[0]!.schedule).toEqual({ kind: "TIMES_A_WEEK", perWeek: 2 });
  await screen.getByRole("button", { name: "Done", exact: true }).click();
  await expect.element(screen.getByText("1 of 2 this week · 1 in 4 weeks", { exact: true })).toBeVisible();
  expect(document.body.textContent?.toLowerCase()).not.toContain("streak");
  expect(document.body.textContent?.toLowerCase()).not.toContain("missed");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  for (const control of document.querySelectorAll<HTMLElement>(".habits-panel button, .habits-panel input, .habits-panel select")) {
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("HABIT-QUOTA-001: says Done for this week once the target is met", async () => {
  await db.habits.add({ id: "h1", name: "Swim", schedule: { kind: "TIMES_A_WEEK", perWeek: 1 }, status: "ACTIVE", createdAt: new Date(2026, 10, 1).toISOString(), updatedAt: new Date(2026, 10, 1).toISOString() });
  const screen = await render(<HabitsPanel active />);
  await screen.getByRole("button", { name: "Done", exact: true }).click();
  await expect.element(screen.getByText("1 of 1 this week · Done for this week · 1 in 4 weeks", { exact: true })).toBeVisible();
});
