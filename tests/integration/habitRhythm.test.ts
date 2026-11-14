import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHabit, getHabitDone, setHabitAnswer, setHabitDone, setHabitArchived } from "../../src/application/habitCommands";
import { getHabitWorkspace } from "../../src/application/habitQueries";
import { logEvent, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { projectHabitAnswers } from "../../src/domain/habits";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

const NOW = new Date(2026, 10, 14, 20);
const at = (day: number, hour = 17) => new Date(2026, 10, day, hour).toISOString();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
  await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

describe("HABIT-RHYTHM-001", () => {
  it("preserves old undo meaning, stores explicit No, and appends corrections without rewriting history", async () => {
    const day = await startDay(at(14));
    const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
    await logEvent(day.id, "HABIT_SET", { habitId: habit.id, done: true }, "USER", "legacy-true");
    await logEvent(day.id, "HABIT_SET", { habitId: habit.id, done: false }, "USER", "legacy-undo");
    const original = await db.events.toArray();
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("UNRECORDED");
    expect(await setHabitAnswer(habit.id, "NOT_DONE", day.id)).toBe(true);
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("NOT_DONE");
    expect(await getHabitDone(day.id)).toEqual(new Set());
    expect(await setHabitDone(habit.id, true, day.id)).toBe(true);
    expect(await getHabitDone(day.id)).toEqual(new Set([habit.id]));
    expect(await setHabitDone(habit.id, false, day.id)).toBe(true);
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("UNRECORDED");
    for (const event of original) expect(await db.events.get(event.id)).toEqual(event);
  });

  it("serializes duplicate answers and keeps idempotent clears write-free", async () => {
    const day = await startDay(at(14)); const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    expect(await setHabitAnswer(habit.id, "UNRECORDED", day.id)).toBe(false);
    const results = await Promise.all([setHabitAnswer(habit.id, "NOT_DONE", day.id), setHabitAnswer(habit.id, "NOT_DONE", day.id)]);
    expect(results.sort()).toEqual([false, true]);
    expect(await db.events.where("type").equals("HABIT_SET").count()).toBe(1);
    expect(await setHabitAnswer(habit.id, "UNRECORDED", day.id)).toBe(true);
    expect(await setHabitAnswer(habit.id, "UNRECORDED", day.id)).toBe(false);
  });

  it("corrects the selected original day at real recording time, leaving today and read-side data unchanged", async () => {
    const past = await startDay(at(13)); const habit = await createHabit({ name: "Walk", kind: "ANY_DAY" });
    const today = await startDay(at(14));
    const before = await db.events.toArray(); const dayBefore = await db.beyondDays.toArray();
    const w = await getHabitWorkspace();
    expect(w.habits[0]!.history).toHaveLength(28);
    expect(w.habits[0]!.history.at(-2)).toMatchObject({ dayId: past.id, answer: "UNRECORDED" });
    expect(await db.events.toArray()).toEqual(before); expect(await db.beyondDays.toArray()).toEqual(dayBefore);
    await setHabitAnswer(habit.id, "DONE", past.id);
    const event = await db.events.where("type").equals("HABIT_SET").first();
    expect(event).toMatchObject({ beyondDayId: past.id, occurredAt: NOW.toISOString(), recordedAt: NOW.toISOString() });
    expect(await getHabitDone(today.id)).toEqual(new Set());
    expect((await getHabitWorkspace()).habits[0]!.history.at(-2)!.answer).toBe("DONE");
  });

  it("shows honest gaps, recorded work before planned context, and the 16:30 rollover without writes", async () => {
    const day = await startDay(at(13)); await setWorkContext(day.id, "WORK", "MANUAL");
    const habit = await createHabit({ name: "On shift", kind: "WORK_DAYS" }); await setHabitAnswer(habit.id, "DONE", day.id);
    vi.setSystemTime(new Date(2026, 10, 14, 2));
    let w = await getHabitWorkspace();
    expect(w.date).toBe("2026-11-13"); expect(w.habits[0]!.history.at(-1)).toMatchObject({ work: "WORK", workPlanned: false, answer: "DONE" });
    const dayCount = await db.beyondDays.count(); const eventCount = await db.events.count();
    vi.setSystemTime(new Date(2026, 10, 14, 16, 30)); w = await getHabitWorkspace();
    expect(w.date).toBe("2026-11-14"); expect(w.dayId).toBeNull();
    expect(w.habits[0]!.history.at(-1)).toMatchObject({ dayId: null, answer: "UNRECORDED", work: "UNKNOWN", applies: false });
    expect(await db.beyondDays.count()).toBe(dayCount); expect(await db.events.count()).toBe(eventCount);
  });

  it("uses recorded work context ahead of a saved plan and labels planned gaps", async () => {
    const { id: _id, createdAt: _created, updatedAt: _updated, ...pattern } = DEFAULT_SCHEDULE_PATTERN;
    await updateSchedulePattern(pattern);
    const day = await startDay(at(14)); await createHabit({ name: "Read", kind: "ANY_DAY" });
    const planned = (await getHabitWorkspace()).habits[0]!.history.at(-1)!.work;
    const recorded = planned === "WORK" ? "OFF" : "WORK";
    await setWorkContext(day.id, recorded, "MANUAL");
    const history = (await getHabitWorkspace()).habits[0]!.history;
    expect(history.at(-1)).toMatchObject({ work: recorded, workPlanned: false });
    expect(history.slice(0, -1).some((d) => d.dayId === null && d.workPlanned)).toBe(true);
  });

  it("does not start a day for an invalid habit and rolls failed appends back", async () => {
    await expect(setHabitAnswer("missing", "DONE")).rejects.toThrow("HABIT_NOT_FOUND");
    expect(await db.beyondDays.count()).toBe(0);
    const day = await startDay(at(14)); const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    const before = await db.events.toArray();
    const add = vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("storage interrupted"));
    await expect(setHabitAnswer(habit.id, "NOT_DONE", day.id)).rejects.toThrow("storage interrupted");
    add.mockRestore();
    expect(await db.events.toArray()).toEqual(before);
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("UNRECORDED");
  });

  it("keeps the effective answer on its original record when a lived day was manually restarted", async () => {
    const first = await startDay(at(14, 17)); const habit = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
    await setHabitAnswer(habit.id, "DONE", first.id); await startDay(at(14, 19));
    const cell = (await getHabitWorkspace()).habits[0]!.history.at(-1)!;
    expect(cell).toMatchObject({ dayId: first.id, answer: "DONE" });
    await setHabitAnswer(habit.id, "UNRECORDED", cell.dayId!);
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("UNRECORDED");
  });

  it("rejects unknown/archived habits, missing/future days and invalid answers without writing", async () => {
    const day = await startDay(at(14)); const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    const future = { ...day, id: "future", startedAt: at(15) }; await db.beyondDays.add(future);
    const before = await db.events.count();
    await expect(setHabitAnswer("missing", "DONE", day.id)).rejects.toThrow("HABIT_NOT_FOUND");
    await expect(setHabitAnswer(habit.id, "DONE", "missing")).rejects.toThrow("DAY_NOT_FOUND");
    await expect(setHabitAnswer(habit.id, "DONE", future.id)).rejects.toThrow("FUTURE_DAY");
    await expect(setHabitAnswer(habit.id, "INVALID" as "DONE", day.id)).rejects.toThrow("INVALID_HABIT_ANSWER");
    await setHabitArchived(habit.id, true);
    await expect(setHabitAnswer(habit.id, "DONE", day.id)).rejects.toThrow("HABIT_NOT_FOUND");
    expect(await db.events.count()).toBe(before);
  });

  it("preserves the lazy current-day gateway for confirmed Alfred marks", async () => {
    const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    await setHabitDone(habit.id, true);
    expect(await db.beyondDays.count()).toBe(1);
    expect(await db.events.where("type").equals("DAY_STARTED").count()).toBe(1);
    const w = await getHabitWorkspace();
    expect(w.habits[0]!.answer).toBe("DONE");
  });

  it("round-trips explicit No and clear answers through the existing native backup", async () => {
    const day = await startDay(at(14)); const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    await setHabitAnswer(habit.id, "NOT_DONE", day.id);
    const file = new File([await db.export()], "habits.json");
    await setHabitAnswer(habit.id, "UNRECORDED", day.id);
    await applyRestore(file);
    expect((await getHabitWorkspace()).habits[0]!.answer).toBe("NOT_DONE");
  });

  it("keeps 28 unique local 16:30 boundaries across daylight-saving changes", async () => {
    vi.setSystemTime(new Date(2026, 10, 2, 20));
    await startDay(at(2)); await createHabit({ name: "Read", kind: "ANY_DAY" });
    const history = (await getHabitWorkspace()).habits[0]!.history;
    expect(new Set(history.map((d) => d.date)).size).toBe(28);
    for (const d of history) { expect(new Date(d.from).getHours()).toBe(16); expect(new Date(d.from).getMinutes()).toBe(30); }
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "America/New_York") {
      expect(history.map((d) => Date.parse(d.to) - Date.parse(d.from))).toContain(25 * 3600_000);
    }
  });

  it("ignores malformed answers and resolves same-time history using persisted sequence", () => {
    const event = { type: "HABIT_SET", occurredAt: at(14), payload: { habitId: "h", done: true } };
    expect(projectHabitAnswers([{ ...event, seq: 2, payload: { habitId: "h", done: false, answer: "NOT_DONE" } }, { ...event, seq: 1 }, { ...event, seq: 3, payload: { habitId: "h", done: true, answer: "NOT_DONE" } }]).get("h")).toBe("NOT_DONE");
  });
});
