import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDay } from "../../src/application/commands";
import { createObligation, modifyObligation, satisfyObligation } from "../../src/application/intentCommands";
import { CARRY_CHANGED, completeCarriedTask, getUnfinishedPlans, setCarriedPlannedDay } from "../../src/application/dayClose";
import { getTaskSmartLists } from "../../src/application/planTodayQueries";
import { obligationModifyInputSchema } from "../../src/persistence/intentValidation";
import { buildRecurrenceRule } from "../../src/engine/recurrence";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-CARRY-001: what he didn't get to, at the close. November 2026: Monday the 16th. Lived days start at 16:30,
 * so a work night Monday 16:30 → Tuesday 16:30 closes Monday's plans. Runs under TZ=UTC and TZ=America/Chicago.
 */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(16, 17));
  await db.open(); await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());
const expected = (t: { updatedAt: string; plannedAt?: string | undefined }) => ({ updatedAt: t.updatedAt, plannedAt: t.plannedAt });

describe("which tasks the close names", () => {
  it("Monday's work-night close at 06:10 Tuesday: planned Monday or earlier (7 days), open only, oldest first", async () => {
    await startDay(at(16, 17).toISOString());
    const monday = await createObligation({ title: "Call the vet", plannedAt: "2026-11-16" });
    const sunday = await createObligation({ title: "Oil change", plannedAt: "2026-11-15" });
    await createObligation({ title: "Tuesday thing", plannedAt: "2026-11-17" });
    await createObligation({ title: "Only due", dueAt: "2026-11-16" });
    await createObligation({ title: "Too old", plannedAt: "2026-11-08" });
    const done = await createObligation({ title: "Done one", plannedAt: "2026-11-16" });
    await satisfyObligation(done.id);
    vi.setSystemTime(at(17, 6, 10));
    const plans = (await getUnfinishedPlans())!;
    expect(plans).toMatchObject({ closingDate: "2026-11-16", nextDate: "2026-11-17" });
    expect(plans.rows.map((r) => [r.task.id, r.plannedLabel])).toEqual([[sunday.id, "Sun"], [monday.id, "Mon"]]);
  });
  it("a day-off close at 22:00 closes that same date's plans", async () => {
    await startDay(at(18, 17).toISOString());
    const wed = await createObligation({ title: "Wednesday plan", plannedAt: "2026-11-18" });
    vi.setSystemTime(at(18, 22));
    const plans = (await getUnfinishedPlans())!;
    expect(plans).toMatchObject({ closingDate: "2026-11-18", nextDate: "2026-11-19" });
    expect(plans.rows.map((r) => r.task.id)).toEqual([wed.id]);
  });
  it("a day started after midnight still closes the date its 16:30 start fell on", async () => {
    vi.setSystemTime(at(17, 1));
    await startDay(at(17, 1).toISOString());
    await createObligation({ title: "Monday plan", plannedAt: "2026-11-16" });
    vi.setSystemTime(at(17, 7));
    expect((await getUnfinishedPlans())).toMatchObject({ closingDate: "2026-11-16", nextDate: "2026-11-17" });
  });
});

describe("NEXT DAY, NO DAY, DONE and UNDO", () => {
  it("NEXT DAY plans Tuesday and keeps the due date and repeat; UNDO restores Monday", async () => {
    await startDay(at(16, 17).toISOString());
    const rrule = buildRecurrenceRule({ freq: "WEEKLY", interval: 1, byDay: ["MO"], anchor: "2026-11-16" });
    const task = await createObligation({ title: "Trash", plannedAt: "2026-11-16", dueAt: "2026-11-20", recurrence: { rrule } });
    vi.setSystemTime(at(17, 6, 10));
    const moved = await setCarriedPlannedDay(task.id, "2026-11-17", expected(task));
    expect(moved).toMatchObject({ plannedAt: "2026-11-17", dueAt: "2026-11-20", recurrence: { rrule } });
    const back = await setCarriedPlannedDay(task.id, "2026-11-16", expected(moved));
    expect(back.plannedAt).toBe("2026-11-16");
  });
  it("NO DAY clears the planned day (No date), and UNDO puts it back", async () => {
    await startDay(at(16, 17).toISOString());
    const task = await createObligation({ title: "Gutters", plannedAt: "2026-11-16" });
    vi.setSystemTime(at(17, 6, 10));
    const cleared = await setCarriedPlannedDay(task.id, null, expected(task));
    expect(cleared.plannedAt).toBeUndefined();
    expect((await db.obligations.get(task.id))!.plannedAt).toBeUndefined();
    expect((await getTaskSmartLists(at(17, 6, 10))).noDate.map((t) => t.id)).toEqual([task.id]);
    expect((await setCarriedPlannedDay(task.id, "2026-11-16", expected(cleared))).plannedAt).toBe("2026-11-16");
  });
  it("DONE completes it", async () => {
    await startDay(at(16, 17).toISOString());
    const task = await createObligation({ title: "Pay bill", plannedAt: "2026-11-16" });
    await completeCarriedTask(task.id, expected(task));
    expect((await db.obligations.get(task.id))!.status).toBe("SATISFIED");
  });
  it("a task edited elsewhere since the close read it is refused, and nothing is written", async () => {
    await startDay(at(16, 17).toISOString());
    const task = await createObligation({ title: "Gutters", plannedAt: "2026-11-16" });
    vi.setSystemTime(at(16, 18));
    await modifyObligation(task.id, { title: "Clean gutters" });
    await expect(setCarriedPlannedDay(task.id, "2026-11-17", expected(task))).rejects.toThrow(CARRY_CHANGED);
    await expect(completeCarriedTask(task.id, expected(task))).rejects.toThrow(CARRY_CHANGED);
    expect(await db.obligations.get(task.id)).toMatchObject({ plannedAt: "2026-11-16", status: "OPEN" });
  });
});

describe("plannedAt: null", () => {
  it("is accepted and clears; a bad date is still refused", async () => {
    expect(obligationModifyInputSchema.safeParse({ plannedAt: null }).success).toBe(true);
    expect(obligationModifyInputSchema.safeParse({ plannedAt: "16/11/2026" }).success).toBe(false);
  });
});

describe("PLANS never loses one", () => {
  it("a passed planned day shows under Planned earlier for 7 days, then under No date; nothing appears twice", async () => {
    const recent = await createObligation({ title: "Recent", plannedAt: "2026-11-14" });
    const old = await createObligation({ title: "Old", plannedAt: "2026-11-05" });
    const oldWithFarDue = await createObligation({ title: "Old, due far", plannedAt: "2026-11-05", dueAt: "2026-12-20" });
    const pastPlannedDueSoon = await createObligation({ title: "Due soon", plannedAt: "2026-11-14", dueAt: "2026-11-19" });
    const pastPlannedDuePassed = await createObligation({ title: "Overdue", plannedAt: "2026-11-14", dueAt: "2026-11-15" });
    const lists = await getTaskSmartLists(at(16, 9));
    expect(lists.plannedEarlier.map((t) => t.id)).toEqual([recent.id]);
    expect(lists.noDate.map((t) => t.id).sort()).toEqual([old.id, oldWithFarDue.id].sort());
    expect(lists.next7.map((t) => t.id)).toEqual([pastPlannedDueSoon.id]);
    expect(lists.today.map((t) => t.id)).toEqual([pastPlannedDuePassed.id]);
    const all = [...lists.today, ...lists.next7, ...lists.plannedEarlier, ...lists.noDate].map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
  });
});
