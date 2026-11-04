import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { getTaskSmartLists } from "../../src/application/planTodayQueries";
import { archiveMission, createMission, createObligation, markObligationWaiting, releaseObligation, satisfyObligation } from "../../src/application/intentCommands";

beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });
const now = new Date(2026, 10, 4, 23, 55);

it("uses distinct due/planned dates, a bounded future window and no inferred dates or writes", async () => {
  const planned = await createObligation({ title: "Synthetic planned today", plannedAt: "2026-11-04", dueAt: "2026-11-09" });
  const earlier = await createObligation({ title: "Synthetic earlier deadline", dueAt: "2026-11-02", plannedAt: "2026-11-06" });
  const tomorrow = await createObligation({ title: "Synthetic tomorrow", plannedAt: "2026-11-05" });
  const edge = await createObligation({ title: "Synthetic seventh day", dueAt: "2026-11-11" });
  const noDate = await createObligation({ title: "Synthetic undated" });
  await createObligation({ title: "Synthetic outside window", dueAt: "2026-11-12" });
  await createObligation({ title: "Synthetic past plan, no deadline", plannedAt: "2026-11-01" });
  const events = await db.events.toArray(), obligations = await db.obligations.toArray();
  const lists = await getTaskSmartLists(now);
  expect(lists.date).toBe("2026-11-04");
  expect(lists.through).toBe("2026-11-11");
  expect(lists.today.map((o) => o.id).sort()).toEqual([planned.id, earlier.id].sort());
  expect(lists.next7.map((o) => o.id).sort()).toEqual([tomorrow.id, edge.id].sort());
  expect(lists.noDate.map((o) => o.id)).toEqual([noDate.id]);
  expect(lists.today.find((o) => o.id === earlier.id)).toMatchObject({ dueAt: "2026-11-02", plannedAt: "2026-11-06" });
  expect(await db.events.toArray()).toEqual(events);
  expect(await db.obligations.toArray()).toEqual(obligations);
  expect(await db.beyondDays.count()).toBe(0);
});

it("inherits canonical eligibility in every view, retaining WAITING and excluding resolved or archived parents", async () => {
  for (const dates of [{ dueAt: "2026-11-04" }, { plannedAt: "2026-11-05" }, {}]) {
    const mission = await createMission({ title: "Synthetic archived direction" });
    await createObligation({ title: "Synthetic historical task", missionId: mission.id, ...dates });
    await archiveMission(mission.id);
    const done = await createObligation({ title: "Synthetic done", ...dates }); await satisfyObligation(done.id);
    const released = await createObligation({ title: "Synthetic released", ...dates }); await releaseObligation(released.id);
    const waiting = await createObligation({ title: "Synthetic waiting", ...dates }); await markObligationWaiting(waiting.id);
  }
  const lists = await getTaskSmartLists(now);
  for (const items of [lists.today, lists.next7, lists.noDate]) {
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Synthetic waiting", status: "WAITING" });
  }
});

it.each([
  [new Date(2026, 11, 29, 23, 55), "2026-12-29", "2027-01-05"],
  [new Date(2026, 2, 6, 23, 55), "2026-03-06", "2026-03-13"],
])("uses local calendar arithmetic across month/year and clock changes", async (at, date, through) => {
  expect(await getTaskSmartLists(at)).toMatchObject({ date, through });
});

it("moves tomorrow's existing due task into Today at calendar midnight without creating a lived day", async () => {
  const task = await createObligation({ title: "Synthetic midnight boundary", dueAt: "2026-11-05" });
  expect((await getTaskSmartLists(now)).next7.map((o) => o.id)).toEqual([task.id]);
  expect((await getTaskSmartLists(new Date(2026, 10, 5, 0, 5))).today.map((o) => o.id)).toEqual([task.id]);
  expect(await db.beyondDays.count()).toBe(0);
});
