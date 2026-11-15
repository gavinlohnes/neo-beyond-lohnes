import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logBodyweight, logSleep, logWater, markWorkEnded, setWorkContext, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getBodyweightEntries, getHydrationEntries, getProteinEntries, getSleepEntries } from "../../src/application/queries";
import { ALFRED_TOOLS, confirmProposal, describeConfirmError, describeProposal, toProposal, undoSavedLog, type AlfredProposal } from "../../src/application/alfred/alfredActions";
import { REGISTRY, resolveProposal } from "../../src/application/alfred/alfredTools";
import { confirmContextProposal } from "../../src/application/alfred/contextActions";
import { buildPlanningContext } from "../../src/application/alfred/personalContext";
import { createObligation } from "../../src/application/intentCommands";
import { getObligation } from "../../src/application/intentQueries";
import { createHabit, getHabitDone } from "../../src/application/habitCommands";
import { createCollection } from "../../src/application/collectionCommands";
import { getConfirmedExceptions } from "../../src/application/scheduleExceptions";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * ALFRED-TOOLS-001: one typed registry for every card Alfred or the free helper may propose, and the new confirm-first
 * tools for commands BEYOND already had. Invented data. Sun Nov 15 2026 04:21 local; the lived day opened Sat 16:30.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const NOW = new Date(2026, 10, 15, 4, 21);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); });

/** What Alfred's tool call becomes after BEYOND fills it: a card, or what Alfred is told instead. */
async function card(name: string, input: Record<string, unknown>): Promise<AlfredProposal | string> {
  const p = toProposal(name, input);
  if (!p) return "UNUSABLE";
  return resolveProposal(p, new Date());
}
const ok = (c: AlfredProposal | string) => { if (typeof c === "string") throw new Error(`expected a card, got: ${c}`); return c; };

describe("the registry", () => {
  it("every tool Claude sees is a registry kind with a parser; helper-only kinds stay off his list", () => {
    const names = ALFRED_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(REGISTRY[name as keyof typeof REGISTRY]?.parse).toBeTypeOf("function");
    expect(names).not.toContain("routine_tick");
    expect(names).not.toContain("log_set");
    for (const added of ["set_work_context", "schedule_change", "schedule_swap", "log_protein", "correct_log", "remove_log", "task_release", "task_waiting", "habit_done", "collection_add", "handoff_note"]) expect(names).toContain(added);
    // A helper-only kind's name never becomes a card from Alfred.
    expect(toProposal("routine_tick", { routine_id: "r", step_id: "s", text: "x", routine_title: "y" })).toBeNull();
  });

  it("the existing cards read exactly as before", () => {
    expect(describeProposal({ kind: "log_water", oz: 16 })).toBe("Log 16 oz water");
    expect(describeProposal({ kind: "log_sleep", minutes: 425, nap: false })).toBe("Log main sleep 7h 05m");
    expect(describeProposal({ kind: "work_ended" })).toBe("Work ended");
    expect(describeProposal({ kind: "task_new_date", task_id: "t", title: "Call bank", due_date: "2026-11-20" })).toBe("New date: Call bank · Fri, Nov 20");
  });
});

describe("times on food, water and protein", () => {
  it("'I had a shake with 30 g at 03:10' logs protein at 03:10, and its UNDO takes it back", async () => {
    const day = await startDay();
    const c = ok(await card("log_protein", { grams: 30, time: "03:10" }));
    expect(describeProposal(c)).toBe("Log 30 g protein · at 03:10");
    expect(await getProteinEntries(day.id)).toEqual([]); // nothing before SAVE
    const result = await confirmProposal(c);
    const [entry] = await getProteinEntries(day.id);
    expect(new Date(entry!.at).getHours()).toBe(3);
    expect(await undoSavedLog(result.undo!)).toBe(true);
    expect(await getProteinEntries(day.id)).toEqual([]);
  });

  it("meal and water keep the time he named; no time means now", async () => {
    const day = await startDay();
    await confirmProposal(ok(await card("log_meal", { name: "Chicken bowl", calories: 650, protein_g: 45, time: "01:30" })));
    await confirmProposal(ok(await card("log_water", { oz: 20 })));
    const [meal] = await getMealEntries(day.id);
    expect(new Date(meal!.at).getHours()).toBe(1);
    expect((await getHydrationEntries(day.id))[0]!.effectiveAmountOz).toBe(20);
  });

  it("a time that isn't real goes back to Alfred instead of becoming a card", async () => {
    await startDay();
    expect(await card("log_water", { oz: 16, time: "25:00" })).toMatch(/can't be placed/);
  });
});

describe("corrections and removals of sleep and weight", () => {
  it("Alfred corrects today's latest sleep; BEYOND fills which log and its value", async () => {
    const day = await startDay();
    await logSleep(day.id, 300);
    const c = ok(await card("correct_log", { metric: "sleep", to: 390 }));
    expect(describeProposal(c)).toBe("Change last sleep: 5h 00m → 6h 30m");
    await confirmProposal(c);
    expect((await getSleepEntries(day.id))[0]!.effectiveDurationMinutes).toBe(390);
    expect(await card("correct_log", { metric: "weight", to: 200 })).toMatch(/No weight logged today/);
  });

  it("remove_log takes out today's latest weight; HISTORY keeps it; a stale card is refused", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 212);
    const c = ok(await card("remove_log", { metric: "weight" }));
    expect(describeProposal(c)).toBe("Remove today's last weight (212 lbs)");
    const ctx = await buildPlanningContext(false);
    await confirmContextProposal(c, ctx, false);
    expect(await getBodyweightEntries(day.id)).toEqual([]);
    expect(await db.events.where("type").equals("BODYWEIGHT_LOGGED").count()).toBe(1);
    // The same card again: the log it named is gone.
    await expect(confirmContextProposal(c, await buildPlanningContext(false), false)).rejects.toThrow("CONTEXT_CHANGED");
  });
});

describe("work and schedule", () => {
  it("'I'm off today' proposes today OFF; already-true is said, not carded", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    const c = ok(await card("set_work_context", { context: "OFF" }));
    expect(describeProposal(c)).toBe("Today is a day off");
    await confirmProposal(c);
    expect((await db.beyondDays.get(day.id))!.workContext).toBe("OFF");
    expect(await card("set_work_context", { context: "OFF" })).toMatch(/already a day off/);
  });

  it("an extra shift and a swap on future days run SCHEDULE-EXCEPTIONS-001's own commands", async () => {
    const extra = ok(await card("schedule_change", { date: "2026-11-21", kind: "WORK", note: "Covering for Sam" }));
    expect(describeProposal(extra)).toBe("Extra shift · Sat, Nov 21 · Covering for Sam");
    await confirmProposal(extra);
    const swap = ok(await card("schedule_swap", { work_date: "2026-11-22", off_date: "2026-11-23" }));
    await confirmProposal(swap);
    const confirmed = await getConfirmedExceptions();
    expect([...confirmed.keys()].sort()).toEqual(["2026-11-21", "2026-11-22", "2026-11-23"]);
    // The command's own refusal reaches the card in plain words.
    const again = ok(await card("schedule_change", { date: "2026-11-21", kind: "WORK" }));
    const error = await confirmProposal(again).catch((e: unknown) => e);
    expect(describeConfirmError(error)).toMatch(/Nothing changed\.$/);
    expect(describeConfirmError(error)).not.toMatch(/EXCEPTION_/);
  });

  it("a handoff note needs a shift marked ended", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    expect(await card("handoff_note", { note: "Pump 3 is leaking" })).toMatch(/marked ended/);
    await markWorkEnded(day.id);
    await confirmProposal(ok(await card("handoff_note", { note: "Pump 3 is leaking" })));
    expect(await db.events.where("type").equals("SHIFT_HANDOFF_NOTED").count()).toBe(1);
  });
});

describe("tasks, habits and lists", () => {
  it("drop and waiting run through the task guard", async () => {
    await startDay();
    const a = await createObligation({ title: "Renew passport" });
    const b = await createObligation({ title: "Hear back from HR" });
    const ctx = await buildPlanningContext(false);
    await confirmContextProposal(ok(await card("task_waiting", { task_id: b.id, title: "Hear back from HR" })), ctx, false);
    expect((await getObligation(b.id))!.status).toBe("WAITING");
    // The task list changed since that context was read: a card made from it is refused.
    await expect(confirmContextProposal(ok(await card("task_release", { task_id: b.id, title: "Hear back from HR" })), ctx, false)).rejects.toThrow("CONTEXT_CHANGED");
    await confirmContextProposal(ok(await card("task_release", { task_id: a.id, title: "Renew passport" })), await buildPlanningContext(false), false);
    expect((await getObligation(a.id))!.status).toBe("RELEASED");
  });

  it("habits and lists are found by name by BEYOND, never Alfred's guess", async () => {
    const day = await startDay();
    const habit = await createHabit({ name: "Mobility", kind: "ANY_DAY" });
    await createCollection("Gift ideas", [{ label: "Idea", type: "TEXT" }]);
    const h = ok(await card("habit_done", { habit: "mobility" }));
    expect(h).toMatchObject({ habit_id: habit.id, name: "Mobility" });
    await confirmProposal(h);
    expect(await getHabitDone(day.id)).toEqual(new Set([habit.id]));
    expect(await card("habit_done", { habit: "juggling" })).toMatch(/No single habit/);
    const g = ok(await card("collection_add", { collection: "gift ideas", value: "Heated blanket" }));
    expect(describeProposal(g)).toBe("Add to Gift ideas · Idea: Heated blanket");
    await confirmProposal(g);
    expect(await db.collectionItems.count()).toBe(1);
  });
});
