import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logBodyweight, logWater, startDay } from "../../src/application/commands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { db } from "../../src/persistence/db";

/**
 * NUMBERS-CLEANUP-001 (Gavin, 2026-11-14): the cave's NUMBERS tab keeps its copy of today's numbers and the weight
 * card, folded into one closed "Today's readings" disclosure, since the dashboard above now leads. Every tile, way
 * in and LOG WEIGHT is one tap away. Also the dashboard's Lifestyle links, clicked (review of #512).
 */
beforeEach(async () => { await page.viewport(360, 800); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 18, 20)); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const openData = async (screen: Awaited<ReturnType<typeof render>>) => {
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();
};

it("folds NUMBERS' copy of today's numbers and weight into a closed disclosure that keeps every control", async () => {
  const day = await startDay(); await logWater(day.id, 12); await logBodyweight(day.id, 204.6);
  const before = await db.events.count();
  const screen = await render(<App />);
  await openData(screen);
  const summary = [...document.querySelectorAll("summary")].find((s) => s.textContent === "Today's readings")!;
  expect((summary.parentElement as HTMLDetailsElement).open).toBe(false);
  // Closed: the cave's copies aren't on screen; History still is.
  expect(screen.getByRole("button", { name: "water history", exact: true }).elements().every((e) => (e as HTMLElement).offsetParent === null)).toBe(true);
  await expect.element(screen.getByRole("region", { name: "History" })).toBeVisible();
  await summary.click();
  // Open: the same tiles, ways in and LOG WEIGHT as before.
  await expect.element(screen.getByRole("button", { name: "water history", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "WEIGHT HISTORY", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("region", { name: "Progress" }).getByRole("button", { name: "LOG WEIGHT", exact: true })).toBeVisible();
  expect((await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
  await screen.getByRole("button", { name: "water history", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "BACK TO DATA", exact: true })).toBeVisible();
  expect(await db.events.count()).toBe(before);
});

it("Lifestyle: HABITS opens YOUR LIFE and QUIT TRACKER opens the quit tracker in LOG, writing nothing", async () => {
  await startDay(); await saveQuitHabit({ name: "Alcohol" });
  const before = await db.events.count();
  const screen = await render(<App />);
  await openData(screen);
  await screen.getByRole("button", { name: "QUIT TRACKER" }).click();
  const sheet = screen.getByRole("dialog");
  await expect.element(sheet).toBeVisible();
  await expect.element(sheet.getByText("URGE", { exact: true }).first()).toBeVisible();
  await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
  await screen.getByRole("button", { name: "HABITS" }).click();
  await expect.poll(() => document.querySelector("#workspace-COMMAND")?.hasAttribute("hidden")).toBe(false);
  await expect.poll(() => document.querySelector("#workspace-COMMAND")?.textContent ?? "").toMatch(/LIFE/);
  expect(await db.events.count()).toBe(before);
});
