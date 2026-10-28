import { commandResult } from "./helpers/command";
import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, logSleep, logWater, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S2: the cave, Vitals — one reading in depth, opened from SYSTEMS, read-only. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

for (const width of [320, 390]) it(`opens a vital in the cave, switches vitals and returns, writing nothing, at ${width}px`, async () => {
  await page.viewport(width, 820);
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 16, 20));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  await logSleep(day.id, 310, "PRIMARY"); await logProtein(day.id, 38); await logWater(day.id, 16);
  await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 });
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await (await commandResult(screen, "SYSTEMS")).click();
  await screen.getByRole("button", { name: /^Last main sleep: 5h 10m\..* Open in the cave$/ }).click();

  await expect.element(screen.getByRole("heading", { name: "THE CAVE // VITALS", exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.textContent).toBe("BACK TO SYSTEMS");
  await expect.poll(() => document.querySelector(".cave__value")?.textContent).toBe("5:10h");
  // A fresh install has no history yet: the cave says it is still learning instead of inventing a range.
  await expect.element(screen.getByText(/^Still learning your usual: \d+ of 10 days so far\.$/)).toBeVisible();
  await expect.element(screen.getByText(/^Feeds BEYOND's advice\. Two short main sleeps/)).toBeVisible();
  await expect.element(screen.getByText("Logged by you at 20:00.", { exact: true })).toBeVisible();

  await screen.getByRole("button", { name: "ENERGY", exact: true }).click();
  await expect.element(screen.getByText("Check-in 20:00: energy 2, stress 3, mood 3, soreness 2.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Capacity from it: YELLOW.", { exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: "FULL HISTORY", exact: true }).elements()).toHaveLength(0); // energy has no BODY history

  await screen.getByRole("button", { name: "WATER", exact: true }).click();
  await expect.poll(() => document.querySelector(".cave__value")?.textContent).toBe("16oz so far");
  await expect.element(screen.getByText("So far today: 16 oz.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Informational. It does not change BEYOND's advice.", { exact: true })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);
  await screen.getByRole("button", { name: "BACK TO SYSTEMS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEMS", exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.getAttribute("aria-label") ?? "").toMatch(/^Last main sleep: /);
  expect(await db.events.toArray()).toEqual(before);
});

it("opens energy from the check-in row", async () => {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const screen = await render(<App />);
  await (await commandResult(screen, "SYSTEMS")).click();
  await screen.getByRole("button", { name: /^Check-in: GREEN\..* Open energy in the cave$/ }).click();
  await expect.element(screen.getByRole("button", { name: "ENERGY", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText(/^Feeds BEYOND's advice\. Your check-in sets capacity/)).toBeVisible();
});
