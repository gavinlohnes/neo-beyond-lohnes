/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { SleepMetricSheet } from "../../src/ui/screens/today/SleepMetricSheet";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** SLEEP-RHYTHM-001: the rhythm section on the real sleep page, from a synthetic Garmin month (no owner data). */
const now = new Date(2026, 9, 21, 22, 10).getTime();
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await page.viewport(360, 780); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("SLEEP-RHYTHM-001", () => {
  it("shows when you slept on work days and days off, one row per measured night, fitting a phone and never writing", async () => {
    const fixture = syntheticGarminMonth(new Date(2026, 8, 22, 16, 30).getTime(), 30, now);
    await db.beyondDays.bulkAdd(fixture.days); await importSleepSnapshot(fixture.sleep);
    const before = await db.events.toArray();
    const screen = await render(<SleepMetricSheet open onClose={() => {}} />);
    const sheet = screen.getByRole("dialog", { name: "SLEEP", exact: true });
    await expect.element(sheet.getByText("RHYTHM · LAST 4 WEEKS", { exact: true })).toBeVisible();
    await expect.element(sheet.getByText(/^Work days: asleep around \d+:\d\d (am|pm), up around \d+:\d\d (am|pm) · usually within \d+m · \d+ nights\.$/)).toBeInTheDocument();
    await expect.element(sheet.getByText(/^Days off: asleep around/)).toBeInTheDocument();
    const chart = sheet.getByRole("img", { name: /^When you slept, \d+ measured nights, newest first$/ });
    await expect.element(chart).toBeInTheDocument();
    const rows = chart.element().querySelectorAll(".sleep-rhythm__row");
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(rows.length).toBeLessThanOrEqual(28);
    expect(chart.element().querySelectorAll('.sleep-rhythm__row[data-kind="WORK"]').length).toBeGreaterThan(0);
    expect(chart.element().querySelectorAll('.sleep-rhythm__row[data-kind="OFF"]').length).toBeGreaterThan(0);
    // The fixture sleeps at the same clock time every day, so no clock-change line is claimed.
    expect(sheet.element().textContent).not.toMatch(/On days off your sleep sits/);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    // The app-wide 16 px floor (UX_DECISIONS): every visible piece of text in the section.
    const section = chart.element().closest("section")!;
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    const sizes: { text: string; px: number }[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      sizes.push({ text: node.textContent.trim(), px: parseFloat(getComputedStyle(node.parentElement!).fontSize) });
    }
    expect(sizes.length).toBeGreaterThan(5);
    expect(sizes.filter((s) => s.px < 16)).toEqual([]);
    expect(await db.events.toArray()).toEqual(before);
  });
});
