/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { SleepMetricSheet } from "../../src/ui/screens/today/SleepMetricSheet";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { logSleep, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

const now = new Date(2026, 9, 21, 22, 10).getTime();
async function seed() {
  const fixture = syntheticGarminMonth(new Date(2026, 8, 22, 16, 30).getTime(), 30, now);
  await db.beyondDays.bulkAdd(fixture.days); await importSleepSnapshot(fixture.sleep);
}
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await page.viewport(390, 844); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });
const sheetOf = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("dialog", { name: "SLEEP", exact: true });

describe("NAV-001 sleep metric", () => {
  it("uses the same week-first sheet from TODAY and DATA, restores focus, and never writes", async () => {
    await seed(); const screen = await render(<App />); const before = await db.events.toArray();
    const tile = screen.getByRole("button", { name: /open sleep$/ }); await tile.click();
    let sheet = sheetOf(screen);
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.element(sheet.getByText("Week of Mon, Oct 19", { exact: true })).toBeVisible();
    await expect.element(sheet.getByText("average a night", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    await expect.poll(() => document.activeElement === tile.element()).toBe(true);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    const dataSleep = screen.getByRole("button", { name: "main sleep history", exact: true }); await dataSleep.click();
    sheet = sheetOf(screen);
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.element(sheet.getByText("Week of Mon, Oct 19", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "ALL SLEEP RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "PROGRESS", exact: true })).toBeVisible();
    expect(await db.events.toArray()).toEqual(before);
  });

  it("maps a keyboard-selected bar to its real source/stages and preserves missing stages", async () => {
    await seed(); const screen = await render(<SleepMetricSheet open onClose={() => {}} />); const sheet = sheetOf(screen);
    await expect.element(sheet.getByText("average a night", { exact: true })).toBeVisible();
    const bars = [...sheet.element().querySelectorAll<SVGGElement>('.measured-bar[role="button"]')].filter((bar) => !bar.getAttribute("aria-label")?.includes("not measured"));
    const bar = bars.at(-1)!; const label = bar.getAttribute("aria-label")!;
    bar.focus(); bar.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await expect.element(sheet.getByRole("button", { name: "Day", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => document.activeElement === sheet.element().querySelector(".sleep-period-navigation p")).toBe(true);
    await expect.element(sheet.getByRole("article", { name: "Imported Garmin sleep" })).toBeVisible();
    await expect.element(sheet.getByRole("img", { name: /^Sleep stages from/ })).toBeVisible();
    await expect.element(sheet.getByText(label.split(" · ")[0]!, { exact: true }).first()).toBeVisible();
    expect([...sheet.element().querySelectorAll(".measured-stages div")].find((row) => row.querySelector("dt")?.textContent === "Deep")?.querySelector("dd")?.textContent).toBe("Not recorded");
    await sheet.getByText("Source details and revisions", { exact: true }).click();
    await expect.element(sheet.getByText("Record: sleep-28", { exact: true })).toBeVisible();
  });

  it("pages calendar periods with buttons and horizontal swipes without accidentally selecting a bar", async () => {
    await seed(); const screen = await render(<SleepMetricSheet open onClose={() => {}} />); const sheet = sheetOf(screen);
    await expect.element(sheet.getByText("Week of Mon, Oct 19", { exact: true })).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "Later sleep period" })).toBeDisabled();
    const chart = sheet.element().querySelector(".sleep-period-chart")!;
    chart.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 60, clientY: 100 }));
    chart.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 180, clientY: 102 }));
    chart.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await expect.element(sheet.getByText("Week of Mon, Oct 12", { exact: true })).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "Week", exact: true })).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", { name: "Later sleep period" }).click();
    await expect.element(sheet.getByText("Week of Mon, Oct 19", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Month", exact: true }).click();
    await expect.element(sheet.getByText("October 2026", { exact: true })).toBeVisible();
    await sheet.getByText("Show nights and records", { exact: true }).click();
    expect(sheet.element().querySelectorAll(".sleep-record-row")).toHaveLength(10);
    await sheet.getByRole("button", { name: "SHOW MORE", exact: true }).click();
    expect(sheet.element().querySelectorAll(".sleep-record-row")).toHaveLength(20);
    await sheet.getByRole("button", { name: "Year", exact: true }).click();
    await expect.element(sheet.getByText("2026", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Earlier sleep period" }).click();
    await expect.element(sheet.getByText("2025", { exact: true })).toBeVisible();
    await expect.element(sheet.getByText(/This period has partial history/)).toBeVisible();
    await expect.element(sheet.getByRole("button", { name: "Earlier sleep period" })).toBeDisabled();
  });

  it("does not turn logged main sleep into Garmin evidence and keeps the records route", async () => {
    const day = await startDay(); await logSleep(day.id, 420, "PRIMARY");
    const screen = await render(<App />); const before = await db.events.toArray();
    await screen.getByRole("button", { name: "Main sleep 7:00, explore records", exact: true }).click();
    const sheet = sheetOf(screen);
    // AUDIT: a night Garmin missed shows the logged main sleep, named as logged, never as measured.
    await expect.element(sheet.getByText("0 measured nights · Garmin · 1 logged by you", { exact: true })).toBeVisible();
    await expect.element(sheet.getByText(/logged$/).first()).toBeInTheDocument();
    expect(sheet.element().textContent).not.toMatch(/Not enough data/);
    await sheet.getByRole("button", { name: "ALL SLEEP RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "PROGRESS", exact: true })).toBeVisible();
    expect(await db.events.toArray()).toEqual(before);
  });

  it("offers retry on a read failure without pretending there is no data", async () => {
    vi.spyOn(db.externalSleepRecords, "toArray").mockRejectedValueOnce(new Error("read failed"));
    const screen = await render(<SleepMetricSheet open onClose={() => {}} />); const sheet = sheetOf(screen);
    await expect.element(sheet.getByRole("alert")).toHaveTextContent("Sleep could not be read");
    await sheet.getByRole("button", { name: "RETRY SLEEP", exact: true }).click();
    await expect.element(sheet.getByText("0 measured nights · Garmin", { exact: true })).toBeVisible();
    expect(await db.events.count()).toBe(0);
  });

  it.each([[320, 640], [390, 844], [844, 390], [1280, 800]])("fits and remains accessible at %sx%s", async (width, height) => {
    await page.viewport(width, height); await seed();
    const screen = await render(<SleepMetricSheet open onClose={() => {}} />); const sheet = sheetOf(screen);
    await expect.element(sheet.getByText("average a night", { exact: true })).toBeVisible();
    for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
    expect(sheet.element().scrollWidth).toBeLessThanOrEqual(sheet.element().clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(sheet.element())).violations).toEqual([]);
  });
});
