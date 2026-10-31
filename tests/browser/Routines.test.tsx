import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { RoutinesPanel } from "../../src/ui/components/RoutinesPanel";
import { TodayRoutine } from "../../src/ui/components/TodayRoutine";
import { createRoutine, getRoutineTicks, getRoutines } from "../../src/application/routineCommands";
import { startDay } from "../../src/application/commands";

/** ROUTINES-001 at phone width. Invented routines only. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });
const noAxe = async (el: HTMLElement) => expect((await axe.run(el, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

it("writes and edits a routine by hand in MORE → ROUTINES", async () => {
  const screen = await render(<RoutinesPanel active />);
  await expect.element(screen.getByText("No routines in use.")).toBeVisible();
  await screen.getByRole("button", { name: "NEW ROUTINE" }).click();
  await screen.getByRole("textbox", { name: "Name" }).fill("Pre-shift");
  await screen.getByRole("textbox", { name: "Steps, one per line" }).fill("Shower\nPack meals\n\nFill bottle");
  await screen.getByRole("button", { name: "SAVE ROUTINE" }).click();
  await expect.element(screen.getByRole("heading", { name: "Pre-shift" })).toBeVisible();
  expect((await getRoutines())[0]!.steps.map((s) => s.text)).toEqual(["Shower", "Pack meals", "Fill bottle"]);
  await screen.getByRole("button", { name: "EDIT", exact: true }).click();
  await screen.getByRole("combobox", { name: "When" }).first().selectOptions("After shift");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("AFTER SHIFT", { exact: true })).toBeVisible();
  await noAxe(screen.container);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("TODAY shows only the current moment's routine, collapsed, and remembers today's ticks", async () => {
  const day = await startDay();
  const pre = await createRoutine({ title: "Pre-shift", moment: "BEFORE_SHIFT", steps: ["Shower", "Fill bottle"] });
  await createRoutine({ title: "Wind-down", moment: "AFTER_SHIFT", steps: ["Curtains"] });
  const screen = await render(<TodayRoutine dayId={day.id} moment="BEFORE_SHIFT" active />);
  await expect.element(screen.getByText("BEFORE SHIFT · Pre-shift")).toBeVisible();
  expect(screen.container.textContent).not.toContain("Wind-down");
  await screen.getByText("BEFORE SHIFT · Pre-shift").click();
  await screen.getByRole("checkbox", { name: "Fill bottle" }).click();
  await expect.poll(async () => (await getRoutineTicks(day.id)).size).toBe(1);
  await expect.element(screen.getByRole("checkbox", { name: "Fill bottle" })).toBeChecked();
  expect(screen.container.textContent).not.toMatch(/missed|streak|of 2/i);
  await noAxe(screen.container);
  await cleanup();
  const again = await render(<TodayRoutine dayId={day.id} moment="BEFORE_SHIFT" active />);
  await again.getByText("BEFORE SHIFT · Pre-shift").click();
  await expect.element(again.getByRole("checkbox", { name: "Fill bottle" })).toBeChecked();
  await expect.element(again.getByRole("checkbox", { name: "Shower" })).not.toBeChecked();
  expect(pre.steps).toHaveLength(2);
});

it("TODAY shows nothing when no routine fits the moment", async () => {
  const day = await startDay();
  await createRoutine({ title: "Day off", moment: "DAY_OFF", steps: ["Long walk"] });
  const screen = await render(<TodayRoutine dayId={day.id} moment="ON_SHIFT" active />);
  await new Promise((r) => setTimeout(r, 200));
  expect(screen.container.textContent).toBe("");
  const none = await render(<TodayRoutine dayId={day.id} moment={null} active />);
  expect(none.container.textContent).toBe("");
});
