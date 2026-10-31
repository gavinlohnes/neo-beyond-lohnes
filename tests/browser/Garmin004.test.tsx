/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { importActivitySnapshot } from "../../src/application/externalActivityCommands";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** GARMIN-004 (owner approval 2026-10-22): Garmin numbers on TODAY and their detail sheets. Display only. */
const firstDay = new Date(2026, 8, 22, 16, 30).getTime();
const now = new Date(2026, 9, 21, 22, 10).getTime(); // day 29 of 30 is in progress
const SHOTS = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_GARMIN004_SHOTS;

async function seedGarmin() {
  const { days, activity, sleep } = syntheticGarminMonth(firstDay, 30, now);
  await db.beyondDays.bulkAdd(days);
  await importActivitySnapshot(activity);
  await importSleepSnapshot(sleep);
}
const settle = async () => {
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const shot = async (name: string) => { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/${name}.png`, save: true }); } };

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => { cleanup(); vi.useRealTimers(); window.scrollTo(0, 0); });

describe("GARMIN-004 — Garmin numbers on TODAY", () => {
  for (const width of [320, 390]) it(`adds STEPS and RESTING HR tiles with your usual, and opens their detail without writing at ${width}px`, async () => {
    await page.viewport(width, 844);
    await seedGarmin();
    const screen = await render(<App />);
    const steps = screen.getByRole("button", { name: /^Steps [\d,]+, usual [\d,]+, open steps$/ });
    await expect.element(steps).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Resting heart rate \d+ bpm, usual \d+, open resting heart rate$/ })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Sleep .*, (garmin|logged), usual \d+:\d\d, open sleep$/ })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    if (width === 390) await shot("390-today");

    const before = await db.events.toArray();
    await steps.click();
    const sheet = screen.getByRole("dialog", { name: "STEPS", exact: true });
    await expect.element(sheet.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.element(sheet.getByText("steps so far today", { exact: true })).toBeVisible();
    await expect.element(sheet.getByRole("img", { name: /^Running step total today/ })).toBeVisible();
    await expect.element(sheet.getByText(/^Usual on (work days|days off): [\d,]+ · median of the last 28 days\.$/)).toBeVisible();
    if (width === 390) await shot("390-steps-today");
    await sheet.getByRole("button", { name: "4W", exact: true }).click();
    await expect.element(sheet.getByText("average a day", { exact: true })).toBeVisible();
    await expect.poll(() => sheet.element().querySelector(".measured-readout")?.textContent).toMatch(/ so far$/); // the readout starts on today's bar
    await sheet.getByText("Show as table", { exact: true }).click();
    await expect.element(sheet.getByRole("table")).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    await settle();
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    if (width === 390) await shot("390-steps-4w");
    await sheet.getByRole("button", { name: "1Y", exact: true }).click();
    await expect.element(sheet.getByText("average a week", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.poll(() => document.activeElement).toBe(steps.element());
    expect(await db.events.toArray()).toEqual(before);
  });

  it("opens sleep on the week, then a night with stages, and says an absent stage was not recorded", async () => {
    await page.viewport(390, 844);
    await seedGarmin();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /open sleep$/ }).click();
    const sheet = screen.getByRole("dialog", { name: "SLEEP", exact: true });
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    const bars = sheet.element().querySelectorAll<SVGGElement>('.measured-bar[role="button"]');
    const measured = [...bars].filter((bar) => !bar.getAttribute("aria-label")?.includes("not measured"));
    measured.at(-1)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.element(sheet.getByRole("img", { name: /^Sleep stages from \d\d:\d\d to \d\d:\d\d\.$/ })).toBeVisible();
    const deep = [...sheet.element().querySelectorAll(".measured-stages div")].find((row) => row.querySelector("dt")?.textContent === "Deep");
    expect(deep?.querySelector("dd")?.textContent).toBe("Not recorded");
    await settle();
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    await shot("390-sleep-last-night");
    await sheet.getByRole("button", { name: "Week", exact: true }).click();
    await expect.element(sheet.getByText("average a night", { exact: true })).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "ALL SLEEP RECORDS", exact: true })).toBeVisible();
  });

  it("opens resting heart rate over the month", async () => {
    await page.viewport(390, 844);
    await seedGarmin();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /open resting heart rate$/ }).click();
    const sheet = screen.getByRole("dialog", { name: "RESTING HEART RATE", exact: true });
    await expect.element(sheet.getByRole("button", { name: "7D", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "4W", exact: true }).click();
    await expect.element(sheet.getByText(/^Usual: \d+ bpm · median of the last 28 days\.$/)).toBeVisible();
    await shot("390-resting-4w");
  });

  it("shows no Garmin tiles without Garmin data", async () => {
    await page.viewport(390, 844);
    const { days } = syntheticGarminMonth(firstDay, 30, now);
    await db.beyondDays.bulkAdd(days);
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "Open LOG", exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /open steps$/ }).elements()).toHaveLength(0);
    expect(document.querySelector(".cc-fuel--six")).toBeNull();
  });

  it("SYNC-001: offers SYNC GARMIN, opening the helper, on Android only", async () => {
    await page.viewport(390, 844);
    await seedGarmin();
    const agent = vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15; Pixel) Chrome/141 Mobile");
    try {
      const screen = await render(<App />);
      await screen.getByRole("button", { name: /open steps$/ }).click();
      const sheet = screen.getByRole("dialog", { name: "STEPS", exact: true });
      // BRIDGE-MOMENTS-001: the link carries this week's moments and Alfred's brief to the Bridge.
      await expect.element(sheet.getByRole("link", { name: "SYNC GARMIN", exact: true }))
        .toHaveAttribute("href", expect.stringMatching(/^intent:\/\/sync\?plan=%7B%22home%22.*#Intent;scheme=beyond-bridge;package=app\.beyond\.healthbridge;end$/));
      agent.mockReturnValue("Mozilla/5.0 (Macintosh) Safari/605");
      await sheet.getByRole("button", { name: "4W", exact: true }).click(); // re-render
      expect(sheet.getByRole("link", { name: "SYNC GARMIN" }).elements()).toHaveLength(0);
    } finally { agent.mockRestore(); }
  });
});

