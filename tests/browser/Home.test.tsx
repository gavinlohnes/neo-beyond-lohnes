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
