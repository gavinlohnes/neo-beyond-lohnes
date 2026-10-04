import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { WeeklyCheckInScreen } from "../../src/ui/screens/weekly/WeeklyCheckInScreen";
import { endDay, logSleep, logWater, setWorkContext, startDay } from "../../src/application/commands";

/**
 * FOUNDATION-A-F1: YOUR USUAL in the weekly check-in, real browser. History
 * is built through the real commands; the clock (Date only) is pinned.
 */
const livedDay = (back: number, h = 16, m = 30) => new Date(2026, 9, 11 - back, h, m, 0, 0);
const NOW = new Date(2026, 9, 12, 9, 0);

async function day(back: number, kind: "WORK" | "OFF", log: (dayId: string) => Promise<unknown>) {
  vi.setSystemTime(livedDay(back));
  const d = await startDay();
  await setWorkContext(d.id, kind, "MANUAL");
  vi.setSystemTime(livedDay(back, 23));
  await log(d.id);
  vi.setSystemTime(new Date(livedDay(back).getTime() + 17.5 * 3_600_000));
  await endDay(d.id);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
});

afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("Weekly check-in — YOUR USUAL (real browser)", () => {
  it("with no history, says what it's still learning and shows no range", async () => {
    await page.viewport(360, 800);
    vi.setSystemTime(NOW);
    const screen = await render(<WeeklyCheckInScreen now={NOW} />);
    const section = screen.getByRole("region", { name: "YOUR USUAL" });
    await expect.element(section).toBeVisible();
    await expect.element(section.getByText(/Still learning your usual: sleep on work days \(0 of 10 work days\)/)).toBeVisible();
    expect(section.element().querySelectorAll("[data-baseline]")).toHaveLength(0);
  });

  it("compares the last week with the usual range, in neutral words, within its line cap and the phone width", async () => {
    for (let i = 0; i < 12; i++) await day(8 + i * 2, "WORK", (id) => logSleep(id, 360 + (i % 3) * 10, "PRIMARY"));
    for (let i = 0; i < 12; i++)
      await day(9 + i * 2, "OFF", async (id) => {
        await logWater(id, 32);
        await logWater(id, 32);
      });
    await day(1, "WORK", (id) => logSleep(id, 300, "PRIMARY"));
    await day(3, "WORK", (id) => logSleep(id, 310, "PRIMARY"));
    await day(2, "OFF", (id) => logWater(id, 64));
    await day(4, "OFF", (id) => logWater(id, 60));
    vi.setSystemTime(NOW);

    for (const width of [320, 360, 375, 412]) {
      await page.viewport(width, 800);
      const screen = await render(<WeeklyCheckInScreen now={NOW} />);
      const section = screen.getByRole("region", { name: "YOUR USUAL" });
      await expect.element(section.getByText(/^Sleep on work days · 5 hr 5 min · below your usual/)).toBeVisible();
      await expect.element(section.getByText(/^Water on days off · 62 oz · inside your usual/)).toBeVisible();
      await expect.element(section.getByText("2 work days this week · usual from 12 work days before", { exact: true })).toBeVisible();
      expect(section.element().querySelectorAll("[data-baseline]").length).toBeLessThanOrEqual(6);
      expect(section.element().querySelectorAll("[data-baseline-quiet]").length).toBeLessThanOrEqual(1);
      expect(section.element().querySelector("[style*='danger'], [style*='accent']")).toBeNull();
      await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      await cleanup();
    }
  });
});
