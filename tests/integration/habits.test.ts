import "dexie-export-import";
import { beforeEach, describe, expect, it } from "vitest";
import { createHabit, getHabitDone, setHabitDone } from "../../src/application/habitCommands";
import { getHabitWorkspace } from "../../src/application/habitQueries";
import { confirmProposal } from "../../src/application/alfred/alfredActions";
import { interpret } from "../../src/application/helper/freeHelper";
import { startDay } from "../../src/application/commands";
import { applyRestore } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

beforeEach(async () => {
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});

describe("HABITS-001", () => {
  it("records a correction event when today's mark is undone", async () => {
    const day = await startDay("2026-11-03T17:00:00.000Z");
    const habit = await createHabit({ name: "Mobility", kind: "ANY_DAY" });
    expect(await setHabitDone(habit.id, true, day.id)).toBe(true);
    expect(await setHabitDone(habit.id, false, day.id)).toBe(true);
    expect(await getHabitDone(day.id)).toEqual(new Set());
    expect(await db.events.where("type").equals("HABIT_SET").count()).toBe(2);
  });

  it("shows only weekly and four-week counts from each day's final state", async () => {
    const habit = await createHabit({ name: "Read", kind: "ANY_DAY" });
    const day = await startDay("2026-11-03T17:00:00.000Z");
    await setHabitDone(habit.id, true, day.id);
    const workspace = await getHabitWorkspace(new Date("2026-11-03T20:00:00"));
    expect(workspace.habits[0]).toMatchObject({ done: true, applies: true, thisWeek: 1, fourWeeks: 1 });
  });

  it("free helper proposes one confirm card and writes only after SAVE", async () => {
    const day = await startDay("2026-11-03T17:00:00.000Z");
    const habit = await createHabit({ name: "Mobility", kind: "ANY_DAY" });
    const result = interpret("did mobility", { now: new Date(), savedMeals: [], openTasks: [], openProjects: [], routines: [], habits: [{ id: habit.id, name: habit.name }] });
    expect(result.cards).toEqual([{ kind: "habit_done", habit_id: habit.id, name: "Mobility" }]);
    expect(await getHabitDone(day.id)).toEqual(new Set());
    await confirmProposal(result.cards[0]!);
    expect(await getHabitDone(day.id)).toEqual(new Set([habit.id]));
  });

  it("round-trips habits and restores a v21 backup with habits empty", async () => {
    const oldJson = JSON.parse(await (await db.export()).text());
    oldJson.data.databaseVersion = 21;
    oldJson.data.tables = oldJson.data.tables.filter((table: { name: string }) => table.name !== "habits");
    oldJson.data.data = oldJson.data.data.filter((table: { tableName: string }) => table.tableName !== "habits");
    await createHabit({ name: "Kept", kind: "WORK_DAYS" });
    const backup = new File([await db.export()], "habits.json");
    await db.habits.clear();
    await applyRestore(backup);
    expect((await db.habits.toArray()).map((habit) => habit.name)).toEqual(["Kept"]);
    await applyRestore(new File([JSON.stringify(oldJson)], "v21.json"));
    expect(await db.habits.toArray()).toEqual([]);
  });
});
