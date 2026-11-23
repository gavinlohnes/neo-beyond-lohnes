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
