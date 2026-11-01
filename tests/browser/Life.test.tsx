import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { LifeScreen } from "../../src/ui/screens/more/LifeScreen";
import { createRoutine } from "../../src/application/routineCommands";
import { addPersonDate } from "../../src/application/peopleCommands";

/** LIFE-HUB-001: one place for direction, plans, routines, people, home and memory. Invented data only. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });
const noAxe = async (el: HTMLElement) => expect((await axe.run(el, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);

it("shows each area as a tab over its existing screen, at phone width", async () => {
  await createRoutine({ title: "Pre-shift", moment: "BEFORE_SHIFT", steps: ["Shower"] });
  await addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14 });
  const screen = await render(<LifeScreen active />);
  await expect.element(screen.getByRole("tab", { name: "Direction" })).toHaveAttribute("aria-selected", "true");
  await screen.getByRole("tab", { name: "Routines" }).click();
  await expect.element(screen.getByRole("heading", { name: "Pre-shift" })).toBeVisible();
  await screen.getByRole("tab", { name: "People" }).click();
  await expect.element(screen.getByText("Sam's birthday", { exact: true })).toBeVisible();
  await screen.getByRole("tab", { name: "Plans" }).click();
  await expect.element(screen.getByRole("heading", { name: "Projects · finite efforts" })).toBeVisible();
  await screen.getByRole("tab", { name: "Home" }).click();
  await expect.element(screen.getByRole("heading", { name: "KEEP THE HOUSE RUNNING" })).toBeVisible();
  await screen.getByRole("tab", { name: "Memory" }).click();
  await expect.element(screen.getByRole("heading", { name: "ALFRED REMEMBERS" })).toBeVisible();
  await noAxe(screen.container);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("keeps an unfinished draft when switching tabs", async () => {
  const screen = await render(<LifeScreen active />);
  await screen.getByRole("tab", { name: "Home" }).click();
  await screen.getByRole("textbox", { name: "What" }).fill("Furnace filter");
  await screen.getByRole("tab", { name: "People" }).click();
  await screen.getByRole("tab", { name: "Home" }).click();
  await expect.element(screen.getByRole("textbox", { name: "What" })).toHaveValue("Furnace filter");
});
