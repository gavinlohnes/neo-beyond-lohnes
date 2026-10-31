import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { PeoplePanel } from "../../src/ui/components/PeoplePanel";
import { addPersonDate } from "../../src/application/peopleCommands";
import { db } from "../../src/persistence/db";

/** RELATIONSHIPS-001: the People view at phone width. Invented people only. */
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("adds a birthday by hand, shows it coming up, and keeps the fact", async () => {
  await addPersonDate({ person: "Robin", occasion: "Birthday", month: 11, day: 2 });
  const screen = await render(<PeoplePanel active />);
  await expect.element(screen.getByText("tomorrow", { exact: false })).not.toBeInTheDocument();
  await expect.element(screen.getByText("in 2 days", { exact: false })).toBeVisible();
  await screen.getByRole("textbox", { name: "Who" }).fill("Sam");
  await screen.getByRole("combobox", { name: "Month" }).selectOptions("Mar");
  await screen.getByRole("spinbutton", { name: "Day" }).fill("14");
  await screen.getByRole("textbox", { name: "Note (optional)" }).fill("Likes gardening");
  await screen.getByRole("button", { name: "SAVE DATE" }).click();
  await expect.element(screen.getByText("Saved: Sam's birthday, March 14. It repeats every year.")).toBeVisible();
  await expect.element(screen.getByText("Sam: birthday March 14. Likes gardening")).toBeVisible();
  const titles = [...screen.container.querySelectorAll(".understanding-item strong")].map((el) => el.textContent);
  expect(titles).toEqual(["Robin's birthday", "Sam's birthday"]);
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("refuses a date that doesn't exist and saves nothing", async () => {
  const screen = await render(<PeoplePanel active />);
  await screen.getByRole("textbox", { name: "Who" }).fill("Sam");
  await screen.getByRole("combobox", { name: "Month" }).selectOptions("Feb");
  await screen.getByRole("spinbutton", { name: "Day" }).fill("30");
  await screen.getByRole("button", { name: "SAVE DATE" }).click();
  await expect.element(screen.getByText("That date doesn't exist. Nothing was saved.")).toBeVisible();
  expect(await db.obligations.count()).toBe(0);
  expect(await db.alfredMemories.count()).toBe(0);
});
