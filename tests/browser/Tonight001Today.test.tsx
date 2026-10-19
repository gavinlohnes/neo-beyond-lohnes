import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import "../../src/ui/styles/fonts";
import { logWater, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";
import { completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { ReportView } from "../../src/ui/screens/report/ReportView";
import { db } from "../../src/persistence/db";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * TONIGHT-001 PR 2 (owner approval, 2026-10-19). Same fixed calendar as the
 * mode tests: Mon Oct 12 2026 is a work night (18:00–06:00), Wed Oct 14 a day off.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);
const rows = () => [...document.querySelectorAll("[data-shift-clock-row]")].map((el) => el.getAttribute("data-shift-clock-row")!);
const plannedWork = async () =>
  (await db.events.where("type").equals("PLANNED_WORK_SET").toArray()).map((e) => (e.payload as { planned: boolean }).planned);

async function saveOwnersSchedule() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
}
async function startDayAt(when: Date): Promise<BeyondDay> {
  vi.setSystemTime(when);
  return startDay();
}
async function savedMeals() {
  const shake = await createSavedMeal({ name: "Protein shake", calories: 160, proteinG: 30, carbsG: 4, fatG: 2 });
  const bowl = await createSavedMeal({ name: "Chicken rice bowl", calories: 560, proteinG: 45, carbsG: 62, fatG: 12 });
  const wrap = await createSavedMeal({ name: "Turkey wrap", calories: 420, proteinG: 38, carbsG: 30, fatG: 14 });
  return { shake, bowl, wrap };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await page.viewport(390, 844);
  await saveOwnersSchedule();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the morning call", () => {
  it("asks one question after the shift, says so in the headline, and SLEEP FIRST records only a not-today answer", async () => {
    const day = await startDayAt(at(12, 16, 30));
    vi.setSystemTime(at(13, 6, 40));
    const onOpenTrain = vi.fn();
    const screen = await render(<TodayScreen onOpenTrain={onOpenTrain} />);

    await expect.poll(rows).toEqual(["WORKOUT_CALL", "NIGHT_CLOSED", "MAIN_SLEEP"]);
    await expect.element(screen.getByRole("heading", { name: "Train or sleep?" })).toBeVisible();
    await expect.element(screen.getByText("Nothing urgent. One question below.", { exact: true })).toBeVisible();
    expect(document.body.textContent).not.toContain("Nothing needs you right now.");
    // SHIFT DOWN and the check-in moved to TOOLS; the card links to the check-in.
    expect(rows()).not.toContain("SHIFT_DOWN");
    await expect.element(screen.getByRole("button", { name: "CHECK IN FIRST" })).toBeVisible();

    const before = await db.events.count();
    await screen.getByRole("button", { name: /^SLEEP FIRST/ }).click();
    await expect.element(screen.getByText(/^Not today\. A stays next\./)).toBeVisible();
    expect(await plannedWork()).toEqual([false]);
    expect(await db.events.count()).toBe(before + 1);
    expect(onOpenTrain).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Nothing needs you right now.", { exact: true })).toBeVisible();
    expect(day.id).toBeTruthy();
  });

  it("TRAIN and SHORT record a planned workout and open TRAIN with that variant", async () => {
    await startDayAt(at(12, 16, 30));
    vi.setSystemTime(at(13, 6, 40));
    const onOpenTrain = vi.fn();
    const screen = await render(<TodayScreen onOpenTrain={onOpenTrain} />);
    await screen.getByRole("button", { name: /^SHORT · A REDUCED/ }).click();
    await expect.poll(() => onOpenTrain.mock.calls.at(-1)?.[0]).toBe("WORKOUT_REDUCED");
    expect(await plannedWork()).toEqual([true]);
    await expect.element(screen.getByText(/^Planned · A/)).toBeVisible();
  });

  it("steps back once a workout is finished, and the night's totals show it", async () => {
    const day = await startDayAt(at(12, 16, 30));
    const { bowl } = await savedMeals();
    await logMeal(day.id, bowl.id);
    await logWater(day.id, 24);
    vi.setSystemTime(at(13, 6, 45));
    const session = await startWorkout(day.id, "A", "REDUCED");
    await completeWorkout(day.id, session.id, "REDUCED", "PARTIAL", 25);
    vi.setSystemTime(at(13, 7, 30));
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("THE NIGHT", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("1 meal · 24 oz water", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("A · reduced, partial", { exact: true })).toBeVisible();
    expect(document.querySelector(".workout-call")).toBeNull();
  });

  it("on a day off asks after waking, and LATER keeps a quiet row without writing anything", async () => {
    const day = await startDayAt(at(14, 16, 30));
    await setWorkContext(day.id, "OFF", "MANUAL");
    vi.setSystemTime(at(15, 9, 5));
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "A today?" })).toBeVisible();
    const before = await db.events.count();
    await screen.getByRole("button", { name: /^LATER/ }).click();
    await expect.element(screen.getByText(/^Later · A/)).toBeVisible();
    expect(await db.events.count()).toBe(before);
  });
});

describe("quick log", () => {
  it("logs a recent saved meal in one tap on shift, with UNDO that voids it", async () => {
    const day = await startDayAt(at(12, 16, 30));
    const { shake, wrap } = await savedMeals();
    await logMeal(day.id, shake.id);
    await logMeal(day.id, wrap.id);
    vi.setSystemTime(at(12, 22, 10));
    const screen = await render(<TodayScreen />);
    await expect.poll(rows).toEqual(["QUICK_LOG", "SHIFT_HANDOFF"]);
    await screen.getByRole("button", { name: "Log Turkey wrap", exact: true }).click();
    await expect.element(screen.getByText("Turkey wrap logged · 420 kcal · 38 g.", { exact: true })).toBeVisible();
    expect((await db.events.where("type").equals("MEAL_LOGGED").toArray())).toHaveLength(3);
    // Focus stays on the logged item (it moves to the front), never dropped to the page.
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Log Turkey wrap");
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(async () => (await db.events.where("type").equals("MEAL_LOG_VOIDED").toArray()).length).toBe(1);
  });

  it("MEAL opens a searchable sheet on TODAY that logs through the same command", async () => {
    const day = await startDayAt(at(12, 16, 30));
    await savedMeals();
    vi.setSystemTime(at(12, 23, 0));
    const onOpenBody = vi.fn();
    const screen = await render(<TodayScreen onOpenBody={onOpenBody} />);
    await screen.getByRole("button", { name: "Log a meal", exact: true }).click();
    const sheet = screen.getByRole("dialog");
    await expect.element(sheet.getByRole("button", { name: "Log Protein shake" })).toBeVisible();
    await sheet.getByLabelText("Find a meal").fill("chick");
    await expect.poll(() => document.querySelectorAll('dialog [aria-label^="Log "]').length).toBe(1);
    await sheet.getByRole("button", { name: "Log Chicken rice bowl" }).click();
    await expect.element(screen.getByText("Chicken rice bowl logged · 560 kcal · 45 g.", { exact: true })).toBeVisible();
    const logged = await db.events.where("type").equals("MEAL_LOGGED").toArray();
    expect(logged.map((e) => e.beyondDayId)).toEqual([day.id]);
    expect(onOpenBody).not.toHaveBeenCalled();
  });
});

describe("protein target and briefing", () => {
  it("says a weigh-in sets the protein target instead of NO TARGET", async () => {
    await startDayAt(at(14, 16, 30));
    vi.setSystemTime(at(14, 17, 0));
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByText("ADD WEIGHT", { exact: true })).toBeVisible();
  });

  it("the 03:00 briefing leads with tonight so far", async () => {
    const day = await startDayAt(at(12, 16, 30));
    const { bowl } = await savedMeals();
    vi.setSystemTime(at(12, 22, 14));
    await logMeal(day.id, bowl.id);
    await logWater(day.id, 48);
    vi.setSystemTime(at(13, 3, 5));
    const screen = await render(<ReportView timing="BRIEFING" now={at(13, 3, 5)} />);
    await expect.element(screen.getByText("Tonight so far", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Protein 45 g · Water 48 oz", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Last meal 22:14", { exact: true })).toBeVisible();
    expect(document.querySelector('[data-report-item="BLOCK"]')).toBeNull();
  });
});
