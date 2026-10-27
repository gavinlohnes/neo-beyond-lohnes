/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** ROTATION-002: "unusual for you" on TODAY's existing Garmin tiles — silent until three finished days leave your range. */
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime(); // day 29 of 30 is in progress

async function seed(high: boolean) {
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now);
  // The three finished days before today: resting heart rate 70, against a usual 58–62.
  if (high) for (const reading of activity.restingHeartRate) if (["rhr-26", "rhr-27", "rhr-28"].includes(reading.id)) reading.bpm = 70;
  await db.beyondDays.bulkAdd(days);
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
}
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); });
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

for (const width of [320, 390]) it(`marks three days above your usual range on the tile and explains it in the sheet at ${width}px, without writing`, async () => {
  await page.viewport(width, 844);
  await seed(true);
  const screen = await render(<App />);
  const tile = screen.getByRole("button", { name: /^Resting heart rate \d+ bpm, usual \d+, above your usual range 3 days running, open resting heart rate$/ });
  await expect.element(tile).toBeVisible();
  await expect.element(tile.getByText("↑ 3 DAYS", { exact: true })).toBeVisible();
  // Steps and sleep stay quiet: nothing unusual there.
  await expect.element(screen.getByRole("button", { name: /^Steps [\d,]+, usual [\d,]+, open steps$/ })).toBeVisible();
  const before = await db.events.toArray();
  await tile.click();
  const sheet = screen.getByRole("dialog", { name: "RESTING HEART RATE", exact: true });
  await expect.element(sheet.getByText("Resting heart rate has been above your usual range for 3 days: Sun, Oct 18: 70 bpm · Mon, Oct 19: 70 bpm · Tue, Oct 20: 70 bpm.", { exact: true })).toBeVisible();
  await expect.element(sheet.getByText(/^Your usual range: 57–63 bpm — the middle 80% of your measured days before these\. A pattern in your own records, not a diagnosis or a cause\.$/)).toBeVisible();
  expect(await db.events.toArray()).toEqual(before);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body)).violations).toEqual([]);
});

it("says nothing when every reading sits inside your range", async () => {
  await page.viewport(390, 844);
  await seed(false);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: /^Resting heart rate \d+ bpm, usual \d+, open resting heart rate$/ })).toBeVisible();
  expect(document.querySelector(".cc-flab--unusual")).toBeNull();
  await screen.getByRole("button", { name: /^Resting heart rate/ }).click();
  await expect.element(screen.getByRole("dialog", { name: "RESTING HEART RATE", exact: true })).toBeVisible();
  expect(document.querySelector("[data-unusual]")).toBeNull();
});
