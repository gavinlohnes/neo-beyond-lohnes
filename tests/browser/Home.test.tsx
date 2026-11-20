import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { HomePanel } from "../../src/ui/components/HomePanel";
import { db } from "../../src/persistence/db";

/** HOME-001 at phone width. Invented house details only. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });

it("adds a repeating job with details by hand and shows it coming round", async () => {
  const screen = await render(<HomePanel active />);
  await expect.element(screen.getByText("No repeating home jobs yet.")).toBeVisible();
  await screen.getByRole("textbox", { name: "What" }).fill("Furnace filter");
  await screen.getByRole("textbox", { name: "Details (optional)" }).fill("16x25x1");
  await screen.getByRole("spinbutton", { name: "Repeat every (optional)" }).fill("3");
  const next = new Date(); next.setDate(next.getDate() + 10);
  const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  await screen.getByLabelText("Next due").fill(iso);
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Saved: Furnace filter, every 3 months", { exact: false })).toBeVisible();
  await expect.element(screen.getByText("in 10 days", { exact: false })).toBeVisible();
  await expect.element(screen.getByText("Furnace filter: 16x25x1")).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});

it("keeps a plain fact without a repeat", async () => {
  const screen = await render(<HomePanel active />);
  await screen.getByRole("textbox", { name: "What" }).fill("Plumber");
  await screen.getByRole("textbox", { name: "Details (optional)" }).fill("Ace Plumbing");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Plumber: Ace Plumbing")).toBeVisible();
  expect(await db.obligations.count()).toBe(0);
});

it("HOME-SCHEDULE-001: a common house job fills the form and saves nothing until ADD", async () => {
  await page.viewport(360, 800);
  const screen = await render(<HomePanel active />);
  const before = await db.events.count();
  await screen.getByText("Common house and dog jobs", { exact: true }).click();
  await screen.getByRole("button", { name: "Furnace filter", exact: true }).click();
  await expect.element(screen.getByRole("textbox", { name: "What" })).toHaveValue("Furnace filter");
  await expect.element(screen.getByRole("spinbutton", { name: /Repeat every/ })).toHaveValue(3);
  expect(await db.events.count()).toBe(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("GRAYSON-Q1: CO detector and dog presets fill the form, then SAVE makes an ordinary Home repeat", async () => {
  const screen = await render(<HomePanel active />);
  await screen.getByText("Common house and dog jobs", { exact: true }).click();
  const presets: [string, number, string][] = [
    ["CO detectors", 1, "months"], ["Dog flea and tick", 1, "months"], ["Dog heartworm", 1, "months"],
    ["Vet checkup", 1, "years"], ["Dog food", 4, "weeks"],
  ];
  for (const [name, every, unit] of presets) {
    await screen.getByRole("button", { name, exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "What" })).toHaveValue(name);
    await expect.element(screen.getByRole("spinbutton", { name: /Repeat every/ })).toHaveValue(every);
    await expect.element(screen.getByRole("combobox", { name: "Unit" })).toHaveDisplayValue(unit);
  }
  expect(await db.obligations.count()).toBe(0);
  const next = new Date(); next.setDate(next.getDate() + 7);
  const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  await screen.getByLabelText("Next due").fill(iso);
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("Saved: Dog food, every 4 weeks", { exact: false })).toBeVisible();
  const saved = await db.obligations.toArray();
  expect(saved.map((o) => o.title)).toEqual(["Home: Dog food"]);
  expect(saved[0]?.recurrence?.rrule).toContain("FREQ=WEEKLY;INTERVAL=4");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("GRAYSON-Q2: an alert time saves with the repeating job and shows when it comes round", async () => {
  const screen = await render(<HomePanel active />);
  await screen.getByRole("textbox", { name: "What" }).fill("Dog heartworm");
  await screen.getByRole("spinbutton", { name: "Repeat every (optional)" }).fill("1");
  await expect.element(screen.getByText("No time set: the phone alert comes at 16:00 on the due day.")).toBeVisible();
  const next = new Date(); next.setDate(next.getDate() + 5);
  const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  await screen.getByLabelText("Next due").fill(iso);
  await screen.getByLabelText("Alert time (optional)").fill("08:30");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.element(screen.getByText("alert at 08:30", { exact: false })).toBeVisible();
  await expect.element(screen.getByText("at 08:30 · in 5 days", { exact: false })).toBeVisible();
  expect((await db.obligations.toArray())[0]).toMatchObject({ title: "Home: Dog heartworm", remindAt: "08:30" });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});
