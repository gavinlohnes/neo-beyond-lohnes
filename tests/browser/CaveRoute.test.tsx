import { afterEach, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { setWorkContext, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SUIT-ALIVE S4: the route — next three points on TODAY, the whole day in the cave, callouts on comms. Read-only. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); await page.viewport(1280, 800); });

async function workDayAt(hour: number, minute: number) {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 16, 16, 40));
  const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(new Date(2026, 9, 16, hour, minute));
}

for (const width of [320, 390]) it(`shows the next points and opens the full route, writing nothing, at ${width}px`, async () => {
  await page.viewport(width, 820);
  // Mid-shift: before and after the shift, S6's preflight and debrief band takes this line's place.
  await workDayAt(19, 0);
  const before = await db.events.toArray();
  const screen = await render(<App />);

  // OWNER-GO-001: on shift TODAY's header already counts down to the end, so the route line steps back;
  // the full route is in the cave.
  await expect.element(screen.getByRole("button", { name: /^Comms:/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /^Route, next:/ }).elements()).toHaveLength(0);
  await screen.getByRole("button", { name: "DATA", exact: true }).click();
  await expect.poll(() => document.querySelector<HTMLButtonElement>('[data-cave-tab="route"]')).not.toBeNull();
  document.querySelector<HTMLButtonElement>('[data-cave-tab="route"]')!.click();
  document.querySelector<HTMLButtonElement>('[data-cave-tab="route"]')!.focus();

  await expect.element(screen.getByRole("heading", { name: "THE CAVE // ROUTE", exact: true })).toBeVisible();
  await expect.poll(() => document.activeElement?.getAttribute("data-cave-tab")).toBe("route");
  const cave = screen.getByRole("region", { name: "THE CAVE // ROUTE" });
  await expect.element(cave.getByText("Work day, 16:30 to 16:30. Solid points are fixed. Hollow points are your usual, not orders.", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("SHIFT · passed", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("SHIFT ENDS · next", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("From your schedule. Food not confirmed, bottle not confirmed.", { exact: true })).toBeVisible();
  await expect.element(cave.getByText("Usual sleep and wake times appear after 3 Garmin-timed work days; 0 so far.", { exact: true })).toBeVisible();

  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const animation of document.getAnimations()) animation.finish();
  expect((await axe.run(document.querySelector(".cave")!)).violations).toEqual([]);
  expect(await db.events.toArray()).toEqual(before);
});

it("calls out the shift on comms for half an hour after it starts", async () => {
  await workDayAt(18, 10);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "Comms: On shift. Food and bottle not confirmed. Open tonight in the cave" })).toBeVisible();
  expect(screen.getByRole("button", { name: /^Route, next:/ }).elements()).toHaveLength(0);
});
