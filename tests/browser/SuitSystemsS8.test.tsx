import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logWater, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { commandResult } from "./helpers/command";

/** SUIT-ALIVE S8: suit systems (cloak on your word, vision with auto night) and the cave's LOG. */
beforeEach(() => { try { localStorage.removeItem("beyond.vision"); } catch { /* fine */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); try { localStorage.removeItem("beyond.vision"); } catch { /* fine */ } });

it("switches night vision on by itself at midnight on shift, and a chosen vision holds", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 17, 0, 30));
  const screen = await render(<App />);
  await expect.poll(() => document.documentElement.dataset.vision).toBe("NIGHT");

  await (await commandResult(screen, "SYSTEMS")).click();
  const vision = screen.getByRole("group", { name: "Vision" });
  await expect.element(vision.getByRole("button", { name: "AUTO", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.element(screen.getByText(/^Now: night vision \(auto\)\./)).toBeVisible();
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".systems")!)).violations).toEqual([]); // AA holds in night vision

  await vision.getByRole("button", { name: "THERMAL", exact: true }).click();
  await expect.poll(() => document.documentElement.dataset.vision).toBe("THERMAL");
  await vision.getByRole("button", { name: "NORMAL", exact: true }).click();
  await expect.poll(() => document.documentElement.dataset.vision).toBeUndefined();
  expect(localStorage.getItem("beyond.vision")).toBe("NORMAL");
});

it("CLOAK enters stealth only when pressed, and never by itself late in a shift", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 17, 4, 30));
  const screen = await render(<App />);
  await (await commandResult(screen, "SYSTEMS")).click();
  await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEMS", exact: true })).toBeVisible();
  expect(document.querySelector(".stealth")).toBeNull();
  await screen.getByRole("button", { name: "CLOAK", exact: true }).click();
  await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
});

it.each([320, 390])("the cave's LOG rebuilds what it said and keeps the recorder, writing nothing, at %ipx", async (width) => {
  await page.viewport(width, 820);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 });
  vi.setSystemTime(new Date(2026, 9, 16, 19, 0)); await logWater(day.id, 16);
  vi.setSystemTime(new Date(2026, 9, 16, 19, 30));
  const before = await db.events.toArray();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /^Comms: / }).click();
  await screen.getByRole("button", { name: "LOG", exact: true }).click();
  const cave = screen.getByRole("region", { name: "THE CAVE // LOG" });
  const comms = cave.getByRole("list", { name: "What the cave said today, newest first" });
  await expect.element(comms.getByText("On shift. Food and bottle not confirmed.", { exact: true })).toBeVisible();
  await expect.element(comms.getByText(/^Protect recovery\. /)).toBeVisible();
  await cave.getByRole("button", { name: "RECORDER", exact: true }).click();
  await expect.element(cave.getByRole("list", { name: "Today's records, newest first" })).toBeVisible();
  expect(document.querySelectorAll(".log__line--you").length).toBeGreaterThanOrEqual(2);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);
  expect(await db.events.toArray()).toEqual(before);
});
