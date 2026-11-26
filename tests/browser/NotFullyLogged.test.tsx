import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import { NotFullyLoggedRow } from "../../src/ui/screens/body/NotFullyLoggedRow";
import { ShortDaysRow } from "../../src/ui/screens/review/ShortDaysRow";
import { startDay, endDay } from "../../src/application/commands";
import { getAnsweredDayIds, getPartialDayIds, isDayPartial } from "../../src/application/foodDayMark";

/**
 * GRAYSON-MISSION-REVIEW-001 slice A: "Not fully logged" under a day's food (a fix, so UNDO), and the monthly review's
 * days that look short (nothing marked by itself; DONE records his answer). VITE_WALKTHROUGH_SHOTS=<dir> saves shots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const fits = async (root: HTMLElement) => {
  for (const w of [320, 360, 412]) { await page.viewport(w, 900); expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w); }
  await page.viewport(360, 900);
  for (const el of root.querySelectorAll<HTMLElement>("button, label")) expect(Math.round(el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect((await axe.run(root, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
};
const shot = async (name: string, el: HTMLElement) => {
  if (!SHOTS) return;
  for (const w of [320, 360, 412]) { await page.viewport(w, 900); await page.screenshot({ path: `${SHOTS}/${name}-${w}.png`, element: el }); }
  await page.viewport(360, 900);
};

beforeEach(async () => { await page.viewport(360, 900); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 20, 12)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-MISSION-REVIEW-001 slice A", () => {
  it("Not fully logged: a switch under the day's food; marking shows UNDO; UNDO puts it back", async () => {
    const day = await startDay();
    const screen = await render(<NotFullyLoggedRow dayId={day.id} />);
    const toggle = screen.getByRole("switch", { name: "Not fully logged" });
    await expect.element(toggle).not.toBeChecked();
    await fits(screen.container as HTMLElement);
    await toggle.click();
    await expect.element(screen.getByText("Marked not fully logged.")).toBeVisible();
    await expect.element(screen.getByText("This day is left out of the burn estimate. Its weigh-ins still count.")).toBeVisible();
    expect(await isDayPartial(day.id)).toBe(true);
    await fits(screen.container as HTMLElement);
    await shot("health-record-marked", screen.container as HTMLElement);
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(toggle).not.toBeChecked();
    expect(await isDayPartial(day.id)).toBe(false);
  });

  it("days that look short: each with date and calories; DONE records each answer; UNDO unmarks", async () => {
    const ids: string[] = [];
    for (const d of [17, 18]) {
      vi.setSystemTime(new Date(2026, 10, d, 17));
      const day = await startDay(new Date(2026, 10, d, 16, 30).toISOString());
      vi.setSystemTime(new Date(2026, 10, d + 1, 16, 25)); await endDay(day.id);
      ids.push(day.id);
    }
    const days = [
      { beyondDayId: ids[0]!, livedDayStart: new Date(2026, 10, 17, 16, 30).toISOString(), kcal: 450 },
      { beyondDayId: ids[1]!, livedDayStart: new Date(2026, 10, 18, 16, 30).toISOString(), kcal: 610 },
    ];
    const screen = await render(<ShortDaysRow days={days} onChanged={() => {}} />);
    await expect.element(screen.getByText("2 days look short. Mark them as not fully logged?")).toBeVisible();
    await expect.element(screen.getByText("Tue, Nov 17 · 450 kcal logged")).toBeVisible();
    await fits(screen.container as HTMLElement);
    await shot("short-days", screen.container as HTMLElement);
    expect(await getAnsweredDayIds()).toEqual(new Set()); // nothing marked by itself
    await screen.getByRole("switch", { name: "Tue, Nov 17 · 450 kcal logged" }).click();
    await screen.getByRole("button", { name: "DONE" }).click();
    await expect.element(screen.getByText("1 day marked not fully logged. The burn estimate leaves it out.")).toBeVisible();
    expect(await getPartialDayIds()).toEqual(new Set([ids[0]]));
    expect(await getAnsweredDayIds()).toEqual(new Set(ids));
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(() => getPartialDayIds()).toEqual(new Set());
  });
});
