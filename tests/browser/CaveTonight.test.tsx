import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logSleep, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S3: TODAY's comms line opens the cave on TONIGHT — the call as made, your normal, what's overdue. Read-only. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

for (const width of [320, 390]) it(`comms opens Tonight with the call, writing nothing, at ${width}px`, async () => {
  await page.viewport(width, 820);
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 16, 20));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  await logSleep(day.id, 310, "PRIMARY");
  await submitCheckIn(day.id, { energy: 2, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 });
  await createObligation({ title: "Blood work", dueAt: "2026-10-10" });
  const before = await db.events.toArray();
  const screen = await render(<App />);

  // A fresh install has no history: the comms line says so instead of inventing a normal. It never repeats the call.
  const comms = screen.getByRole("button", { name: /^Comms: Still learning your normal: 0 of 10 days so far\. Open tonight in the cave$/ });
  await expect.element(comms).toBeVisible();
  expect(document.querySelectorAll(".mode-header .comms-line")).toHaveLength(1);
  await comms.click();

  await expect.element(screen.getByRole("heading", { name: "THE CAVE // TONIGHT", exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.textContent).toBe("BACK TO SYSTEMS");
  await expect.element(screen.getByRole("button", { name: "TONIGHT", exact: true })).toHaveAttribute("aria-pressed", "true");
  const cave = screen.getByRole("region", { name: "THE CAVE // TONIGHT" });
  await expect.element(cave.getByText("Protect recovery", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("Not answered yet. Answer it on TODAY.", { exact: true })).toBeVisible();
  await expect.element(cave.getByText(/^Your check-in put capacity at YELLOW: energy is low \(2 of 5\)\.$/)).toBeVisible();
  await expect.element(cave.getByText("Nothing to judge yet.", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("Blood work · due Oct 10", { exact: true })).toBeVisible();

  await screen.getByRole("button", { name: "VITALS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "THE CAVE // VITALS", exact: true })).toBeVisible();
  await expect.poll(() => document.querySelector(".cave__value")?.textContent).toBe("5:10h");
  await screen.getByRole("button", { name: "TONIGHT", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "THE CAVE // TONIGHT" }).getByText("Protect recovery", { exact: true })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);
  await screen.getByRole("button", { name: "BACK TO SYSTEMS", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "MORE // SYSTEMS", exact: true })).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
});
