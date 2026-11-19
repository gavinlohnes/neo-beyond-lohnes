import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHabit, setHabitAnswer } from "../../src/application/habitCommands";
import { getHabitToday, getHabitWorkspace } from "../../src/application/habitQueries";
import { getBodyDashboardExtras } from "../../src/application/bodyDashboardQueries";
import { startDay } from "../../src/application/commands";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

// November 2026: Monday the 16th to Sunday the 22nd is one week; lived days start at 16:30 local.
const at = (day: number, hour = 17) => new Date(2026, 10, day, hour).toISOString();
const clock = (day: number, hour = 20) => vi.setSystemTime(new Date(2026, 10, day, hour));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); clock(16);
  await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

/** Start the lived day of `day` (and answer the habit on it) with the clock on that evening. */
async function live(day: number, habitId?: string, answer?: "DONE" | "NOT_DONE") {
  clock(day);
  const d = await startDay(at(day));
  if (habitId && answer) await setHabitAnswer(habitId, answer, d.id);
  return d;
}

describe("HABIT-QUOTA-001 — N times a week", () => {
  it("stays due until the week's target is met, then leaves today's list", async () => {
    const habit = await createHabit({ name: "Lift", kind: "TIMES_A_WEEK", perWeek: 3 });
    expect(habit.schedule).toEqual({ kind: "TIMES_A_WEEK", perWeek: 3 });
    await live(16, habit.id, "DONE");
    await live(17, habit.id, "DONE");
    await live(18);
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, done: false, week: { done: 2, target: 3 } });
    await live(19, habit.id, "DONE");
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, done: true, week: { done: 3, target: 3 } });
    await live(20);
    const today = (await getHabitToday())[0]!;
    expect(today).toMatchObject({ applies: false, week: { done: 3, target: 3 } });
    const w = (await getHabitWorkspace()).habits[0]!;
    expect(w).toMatchObject({ applies: false, thisWeek: 3, perWeek: 3 });
    // History: Wednesday (unrecorded, target not met) applied; Friday (target met) did not.
    expect(w.history.find((d) => d.date === "2026-11-18")).toMatchObject({ answer: "UNRECORDED", applies: true });
    expect(w.history.find((d) => d.date === "2026-11-20")).toMatchObject({ answer: "UNRECORDED", applies: false });
  });

  it("counts only Done: Didn't do it and unrecorded days never fill the week", async () => {
    const habit = await createHabit({ name: "Walk", kind: "TIMES_A_WEEK", perWeek: 2 });
    await live(16, habit.id, "NOT_DONE");
    await live(17, habit.id, "DONE");
    await live(18, habit.id, "NOT_DONE");
    await live(19);
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, week: { done: 1, target: 2 } });
  });

  it("a habit done today still shows today, even beyond its target", async () => {
    const habit = await createHabit({ name: "Read", kind: "TIMES_A_WEEK", perWeek: 1 });
    await live(16, habit.id, "DONE");
    await live(17, habit.id, "DONE");
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, done: true, week: { done: 2, target: 1 } });
  });

  it("starts fresh on Monday's lived day; Sunday night still belongs to the week before", async () => {
    const habit = await createHabit({ name: "Swim", kind: "TIMES_A_WEEK", perWeek: 1 });
    await live(16, habit.id, "DONE");
    await live(22);
    expect((await getHabitToday())[0]).toMatchObject({ applies: false, week: { done: 1, target: 1 } });
    clock(23, 10); // Monday morning is still Sunday's lived day (before 16:30).
    expect((await getHabitToday())[0]).toMatchObject({ applies: false, week: { done: 1, target: 1 } });
    await live(23);
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, week: { done: 0, target: 1 } });
    expect((await getHabitWorkspace()).habits[0]).toMatchObject({ thisWeek: 0, fourWeeks: 1 });
  });

  it("does not depend on the work context: an unknown day still counts and applies", async () => {
    const habit = await createHabit({ name: "Stretch", kind: "TIMES_A_WEEK", perWeek: 2 });
    await live(16, habit.id, "DONE");
    const w = await getHabitWorkspace();
    expect(w.habits[0]!.history.at(-1)).toMatchObject({ answer: "DONE", applies: true });
  });

  it("BODY shows the weekly progress on a due quota habit and drops it once met", async () => {
    const quota = await createHabit({ name: "Lift", kind: "TIMES_A_WEEK", perWeek: 2 });
    await createHabit({ name: "Water plants", kind: "ANY_DAY" });
    await live(16, quota.id, "DONE");
    let extras = await getBodyDashboardExtras(null, new Date());
    expect(extras.habits).toEqual([
      { name: "Lift", done: true, answer: "DONE", week: { done: 1, target: 2 } },
      { name: "Water plants", done: false, answer: "UNRECORDED" },
    ]);
    await live(17, quota.id, "DONE");
    await live(18);
    extras = await getBodyDashboardExtras(null, new Date());
    expect(extras.habits?.map((h) => h.name)).toEqual(["Water plants"]);
  });

  it("rejects a missing or out-of-range weekly target and stores it only on quota habits", async () => {
    for (const perWeek of [undefined, 0, 7, 2.5]) {
      await expect(createHabit({ name: "Bad", kind: "TIMES_A_WEEK", ...(perWeek === undefined ? {} : { perWeek }) }))
        .rejects.toThrow("Choose 1 to 6 times a week.");
    }
    await expect(createHabit({ name: "Bad", kind: "SOMETIMES" as never })).rejects.toThrow();
    expect((await createHabit({ name: "Daily", kind: "ANY_DAY", perWeek: 3 })).schedule).toEqual({ kind: "ANY_DAY" });
    expect(await db.habits.count()).toBe(1);
  });

  it("existing habits read exactly as before (no weekly target)", async () => {
    const habit = await createHabit({ name: "Mobility", kind: "ANY_DAY" });
    await live(16, habit.id, "DONE");
    expect((await getHabitToday())[0]).toMatchObject({ applies: true, week: null });
    expect((await getHabitWorkspace()).habits[0]).toMatchObject({ perWeek: null, thisWeek: 1 });
  });

  it("round-trips the weekly target through backup and restore", async () => {
    await createHabit({ name: "Lift", kind: "TIMES_A_WEEK", perWeek: 4 });
    await createHabit({ name: "Old", kind: "WORK_DAYS" });
    const backup = new File([await db.export()], "habits.json");
    await db.habits.clear();
    await applyRestore(backup);
    const restored = (await db.habits.toArray()).sort((a, b) => a.name.localeCompare(b.name));
    expect(restored.map((h) => h.schedule)).toEqual([{ kind: "TIMES_A_WEEK", perWeek: 4 }, { kind: "WORK_DAYS" }]);
  });
});
