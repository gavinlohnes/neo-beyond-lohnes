import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { endDay, logSleep, setPlannedWork, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** SLEEP-ENGINE-001: two short main sleeps under GREEN suggest the reduced session, on TODAY and TRAIN alike. */
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
const start = new Date(2026, 7, 20);
const at = (index: number, hour: number) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, hour);

async function seed(last: [number, number]) {
  vi.useFakeTimers({ toFake: ["Date"] });
  const sleeps = [...Array<number>(40).fill(420), ...last];
  let id = "";
  for (const [index, minutes] of sleeps.entries()) {
    vi.setSystemTime(at(index, 18));
    const day = await startDay(); id = day.id;
    await setWorkContext(day.id, "WORK", "MANUAL");
    await logSleep(day.id, minutes, "PRIMARY");
    if (index < sleeps.length - 1) { vi.setSystemTime(at(index + 1, 16)); await endDay(day.id); }
  }
  await setPlannedWork(id, true);
  await submitCheckIn(id, { energy: 4, stress: 2, mood: 4, soreness: 0, alcoholUrge: 0 });
}

for (const width of [320, 390]) it(`TODAY names the reduced session and the two nights behind it at ${width}px, without writing`, async () => {
  await page.viewport(width, 900);
  await seed([310, 290]);
  const before = await db.events.count();
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByText("Proceed with planned work — reduced session", { exact: true }).first()).toBeVisible();
  await screen.getByText("See the reasoning", { exact: true }).click();
  const plain = document.querySelector("[data-why-plain]")!;
  await expect.element(page.elementLocator(plain).getByText("Your last two main sleeps (5:10, 4:50) were below your usual range (6:45–7:15 on work days), so the reduced session is suggested. You can still choose the standard one.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Two short main sleeps", { exact: true })).toBeVisible();
  expect(await db.events.count()).toBe(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  // Rendered without the app shell, which supplies the landmark (same as BodyDailyRecord and others).
  expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
});

it("TRAIN suggests the same reduced session and says why, with standard still a choice", async () => {
  await page.viewport(390, 900);
  await seed([310, 290]);
  const screen = await render(<TrainScreen />);
  await screen.getByText("Why this suggestion", { exact: true }).click();
  await expect.element(screen.getByText(/^Capacity is GREEN, but your last two main sleeps were below your usual range/)).toBeVisible();
});

it("one short night changes nothing", async () => {
  await page.viewport(390, 900);
  await seed([420, 290]);
  const screen = await render(<TodayScreen />);
  await expect.element(screen.getByText("Proceed with planned work", { exact: true }).first()).toBeVisible();
  expect(document.body.textContent).not.toContain("reduced session");
});
