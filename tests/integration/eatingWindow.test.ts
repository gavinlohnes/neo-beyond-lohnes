import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { getEatingWindowSettings, getEatingWindowView, markEatingWindow, saveEatingWindowSettings, skipEatingWindowToday, voidEatingWindowEvent } from "../../src/application/eatingWindow";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/** GRAYSON C4.8a against real records. Sat Nov 14 2026 is a Week A work night. */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const on = { enabled: true, eatingHours: 10, opensAt: { WORK: "14:00", RECOVERY: "14:00", OFF: "10:00" }, safetyCheckedAt: at(14, 15).toISOString() };

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(14, 16, 31));
  await updateSchedulePattern(ROTATION);
  await startDay(at(14, 16, 30).toISOString());
});
afterEach(() => { vi.useRealTimers(); db.close(); });

it("is off and invisible until set up; settings survive a schedule save and write no event", async () => {
  expect(await getEatingWindowSettings()).toBeNull();
  expect(await getEatingWindowView(at(14, 20))).toBeNull();
  const events = await db.events.count();
  await saveEatingWindowSettings(on, at(14, 17));
  await updateSchedulePattern(ROTATION);
  expect(await getEatingWindowSettings()).toMatchObject({ enabled: true, eatingHours: 10 });
  expect(await db.events.count()).toBe(events);
});

it("his marks drive the card, and UNDO and SKIP are additive", async () => {
  await saveEatingWindowSettings(on, at(14, 17));
  expect((await getEatingWindowView(at(14, 20)))!.state).toMatchObject({ kind: "PLANNED", opensAt: "14:00" });
  vi.setSystemTime(at(15, 0));
  const closed = await markEatingWindow("CLOSED");
  expect((await getEatingWindowView(at(15, 11, 42)))!.state).toMatchObject({ kind: "FASTING", elapsedMinutes: 702 });
  await voidEatingWindowEvent(closed);
  expect((await getEatingWindowView(at(15, 11, 42)))!.state.kind).toBe("PLANNED");
  const skip = await skipEatingWindowToday();
  expect((await getEatingWindowView(at(15, 12)))!.state.kind).toBe("SKIPPED");
  await voidEatingWindowEvent(skip);
  expect((await getEatingWindowView(at(15, 12)))!.state.kind).toBe("PLANNED");
  expect(await db.events.where("type").equals("EATING_WINDOW_MARKED").count()).toBe(1); // nothing deleted
});

it("turning on needs a completed safety check", async () => {
  await expect(saveEatingWindowSettings({ ...on, safetyCheckedAt: "" })).rejects.toThrow();
});

it("C4.8b: a meal during the fast is offered as its end; he ends it at the meal time, not now", async () => {
  const { createSavedMeal, logMeal } = await import("../../src/application/nutritionCommands");
  const { getActiveDay } = await import("../../src/application/queries");
  await saveEatingWindowSettings(on, at(14, 17));
  vi.setSystemTime(at(15, 0));
  await markEatingWindow("CLOSED");
  const day = (await getActiveDay())!;
  const bowl = await createSavedMeal({ name: "Chicken bowl", calories: 650, proteinG: 45, carbsG: 60, fatG: 18 });
  vi.setSystemTime(at(15, 4));
  await logMeal(day.id, bowl.id, 1, at(15, 2, 10).toISOString());
  const view = (await getEatingWindowView(at(15, 4)))!;
  expect(view.state.kind).toBe("FASTING"); // the meal alone moved nothing
  expect(view.prompt).toMatchObject({ kind: "END_AT", name: "Chicken bowl", at: at(15, 2, 10).toISOString() });
  await markEatingWindow("OPENED", view.prompt!.at, at(15, 4));
  expect((await getEatingWindowView(at(15, 4)))!.state).toMatchObject({ kind: "OPEN", since: at(15, 2, 10).toISOString() });
  await expect(markEatingWindow("CLOSED", at(15, 9).toISOString(), at(15, 4))).rejects.toThrow(/EATING_MARK_AHEAD/);
  await expect(markEatingWindow("CLOSED", at(16, 17).toISOString(), at(16, 18))).rejects.toThrow(/LOG_TIME_OUTSIDE_DAY/);
});

it("C4.8b: a fast begun on the previous lived day offers only a meal it can be ended at, and the tap works", async () => {
  const { createSavedMeal, logMeal } = await import("../../src/application/nutritionCommands");
  const { getActiveDay } = await import("../../src/application/queries");
  await saveEatingWindowSettings(on, at(14, 17));
  const first = (await getActiveDay())!;
  vi.setSystemTime(at(15, 14));
  await markEatingWindow("CLOSED"); // the fast starts on the 14th's lived day
  const snack = await createSavedMeal({ name: "Snack", calories: 200, proteinG: 10, carbsG: 20, fatG: 8 });
  vi.setSystemTime(at(15, 15, 5));
  await logMeal(first.id, snack.id, 1, at(15, 15).toISOString()); // still the 14th's lived day
  vi.setSystemTime(at(15, 16, 31));
  const second = await startDay(at(15, 16, 30).toISOString());
  // Only the snack so far: it can't be a mark on today's day, so nothing is offered (never a dead button).
  expect((await getEatingWindowView(at(15, 18)))!.prompt).toBeNull();
  const dinner = await createSavedMeal({ name: "Dinner", calories: 700, proteinG: 50, carbsG: 60, fatG: 20 });
  vi.setSystemTime(at(15, 18));
  await logMeal(second.id, dinner.id, 1, at(15, 17, 30).toISOString());
  const view = (await getEatingWindowView(at(15, 18)))!;
  expect(view.prompt).toMatchObject({ kind: "END_AT", name: "Dinner", at: at(15, 17, 30).toISOString() });
  await markEatingWindow("OPENED", view.prompt!.at, at(15, 18));
  expect((await getEatingWindowView(at(15, 18)))!.state).toMatchObject({ kind: "OPEN", since: at(15, 17, 30).toISOString() });
});
