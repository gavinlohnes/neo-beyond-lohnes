import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { App } from "../../src/app/App";
import { logBodyweight, startDay, updateSchedulePattern } from "../../src/application/commands";
import { markEatingWindow, saveEatingWindowSettings } from "../../src/application/eatingWindow";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";
import { openLogTarget } from "./helpers/logSheet";
import "../../src/ui/styles/global.css";

/**
 * GRAYSON C4.8b: TODAY's Eating Window card offers END FAST at a meal logged during the fast (he decides), and the
 * meal sheet shows protein against the open window. Sat Nov 14 2026 is a work night. VITE_WALKTHROUGH_SHOTS saves shots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
let dayId = "";
beforeEach(async () => {
  localStorage.removeItem("beyond.eating.dismissed.v1");
  localStorage.setItem("beyond.orientation.v1", "seen");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
  dayId = (await startDay(at(14, 16, 30).toISOString())).id;
  await saveEatingWindowSettings({ enabled: true, eatingHours: 10, opensAt: { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" }, safetyCheckedAt: at(14, 16).toISOString() });
  await logBodyweight(dayId, 200);
  vi.setSystemTime(at(15, 0));
  await markEatingWindow("CLOSED");
  const bowl = await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 });
  vi.setSystemTime(at(15, 4));
  await logMeal(dayId, bowl.id, 1, at(15, 2, 10).toISOString());
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: END FAST AT 02:10 ends the fast at the meal; the meal alone changed nothing`, async () => {
    await page.viewport(width, 900);
    const screen = await render(<TodayScreen onOpenLife={() => {}} />);
    const card = screen.getByRole("region", { name: "Eating window" });
    await expect.element(card.getByText(/FAST IN PROGRESS/)).toBeVisible();
    await expect.element(card.getByText("You logged Chicken bowl at 02:10, during this fast.")).toBeVisible();
    expect([...card.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(card.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-eating-offer.png`, element: card });
    await card.getByRole("button", { name: "END FAST AT 02:10" }).click();
    await expect.element(card.getByText(/^OPEN/)).toBeVisible();
    await expect.element(card.getByText(/^Protein 45 \/ \d+ g · \d+ g left with \d+:\d\d of window\.$/)).toBeVisible();
    await expect.element(card.getByText(/Fast ended at 02:10\./)).toBeVisible();
    const marks = await db.events.where("type").equals("EATING_WINDOW_MARKED").toArray();
    expect(marks.map((m) => m.occurredAt).sort()).toEqual([at(15, 0).toISOString(), at(15, 2, 10).toISOString()]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-eating-open.png`, element: card });
  });
}

it("NOT NOW keeps fasting and writes nothing", async () => {
  const screen = await render(<TodayScreen onOpenLife={() => {}} />);
  const card = screen.getByRole("region", { name: "Eating window" });
  await card.getByRole("button", { name: "NOT NOW" }).click();
  await expect.poll(() => card.element().textContent?.includes("during this fast")).toBe(false);
  await expect.element(card.getByText(/FAST IN PROGRESS/)).toBeVisible();
  expect(await db.events.where("type").equals("EATING_WINDOW_MARKED").count()).toBe(1);
});

it("the meal sheet says where the window stands while logging", async () => {
  await page.viewport(360, 800);
  const screen = await render(<App />);
  if (document.querySelector(".shift-change")) await screen.getByRole("button", { name: "CONTINUE", exact: true }).click();
  vi.setSystemTime(at(15, 4));
  await openLogTarget(screen, "MEAL");
  const sheet = screen.getByRole("dialog", { name: "MEAL", exact: true });
  await expect.element(sheet.getByText("Eating window: fasting since 00:00. Logging food doesn't end it; TODAY will offer that.")).toBeVisible();
});
