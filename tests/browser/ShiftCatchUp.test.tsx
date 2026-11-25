import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { completeShiftDown, logWater, markWorkEnded, startDay, startShiftDown, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { getHydrationEntries } from "../../src/application/queries";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { DEFAULT_SCHEDULE_PATTERN, livedDayShiftWindow } from "../../src/engine/scheduledContext";

/**
 * GRAYSON LOG-CATCHUP-001: after SHIFT DOWN, "On shift, did you have:" lists his usual shift food and water; ticked
 * items land on tonight's day at their usual point in the shift. Sat Nov 14 2026 is a night shift (as DayClose).
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
let dayId = "";

beforeEach(async () => {
  for (const k of ["beyond.close.done.v1", "beyond.catchup.done.v1", "beyond.close.prompts.v1"]) localStorage.removeItem(k);
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  const pattern = { ...DEFAULT_SCHEDULE_PATTERN, ...schedule };
  const bowl = await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 });
  // The two shifts before tonight's, each with the bowl ~4.5 h in and two 16 oz waters.
  const past: Date[] = [];
  for (let day = 13; day > 1 && past.length < 2; day--) {
    const start = at(day, 16, 30);
    if (livedDayShiftWindow(start, pattern)) past.unshift(start);
  }
  expect(past).toHaveLength(2);
  for (const start of past) {
    vi.setSystemTime(new Date(start.getTime() + 60_000));
    const id = (await startDay(start.toISOString())).id;
    const shift = livedDayShiftWindow(start, pattern)!;
    vi.setSystemTime(new Date(shift.end.getTime() + 3_600_000));
    await logMeal(id, bowl.id, 1, new Date(shift.start.getTime() + 4.5 * 3_600_000).toISOString());
    await logWater(id, 16, new Date(shift.start.getTime() + 2 * 3_600_000).toISOString());
    await logWater(id, 16, new Date(shift.start.getTime() + 8 * 3_600_000).toISOString());
  }
  vi.setSystemTime(at(14, 16, 31));
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
  vi.setSystemTime(at(15, 6, 5));
  await markWorkEnded(dayId);
  vi.setSystemTime(at(15, 6, 30));
  const started = await startShiftDown(dayId, 10);
  vi.setSystemTime(at(15, 6, 40));
  await completeShiftDown(dayId, started);
  vi.setSystemTime(at(15, 6, 45));
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: ticks the bowl and the water, logs them on tonight at the usual times, then the close follows`, async () => {
    await page.viewport(width, 900);
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const card = screen.getByRole("region", { name: "Shift catch-up" });
    await expect.element(card.getByText("ON SHIFT, DID YOU HAVE:")).toBeVisible();
    await expect.element(card.getByText("Chicken bowl", { exact: true })).toBeVisible();
    await expect.element(card.getByText("Water · 2 × 16 oz", { exact: true })).toBeVisible();
    // Nothing is ticked for him, and the card never takes red (FIELD-AUTHORITY-001).
    await expect.element(card.getByRole("button", { name: "LOG", exact: true })).toBeDisabled();
    expect([...card.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(card.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    await card.getByRole("checkbox", { name: /Chicken bowl/ }).click();
    await card.getByRole("checkbox", { name: /Water/ }).click();
    if (SHOTS) { await page.screenshot({ path: `${SHOTS}/${width}-catch-up.png`, element: card }); }
    await card.getByRole("button", { name: "LOG 2", exact: true }).click();
    await expect.poll(() => document.querySelector("[aria-label='Shift catch-up']")).toBeNull();
    expect((await getMealEntries(dayId)).map((m) => [m.name, m.at])).toEqual([["Chicken bowl", at(14, 22, 30).toISOString()]]);
    expect((await getHydrationEntries(dayId)).map((w) => w.at).sort()).toEqual([at(14, 21).toISOString(), at(15, 3).toISOString()]);
    await expect.element(screen.getByRole("region", { name: "Close the day" })).toBeVisible();
  });
}

it("NOTHING ELSE writes nothing and moves on to the close", async () => {
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  await screen.getByRole("region", { name: "Shift catch-up" }).getByRole("button", { name: "NOTHING ELSE" }).click();
  await expect.poll(() => document.querySelector("[aria-label='Shift catch-up']")).toBeNull();
  expect(await getMealEntries(dayId)).toEqual([]);
  expect(await getHydrationEntries(dayId)).toEqual([]);
  await expect.element(screen.getByRole("region", { name: "Close the day" })).toBeVisible();
});
