import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { getTodayPlan } from "../../src/application/planTodayQueries";
import { archiveMission, createMission, createObligation, markObligationWaiting, releaseObligation, satisfyObligation } from "../../src/application/intentCommands";

beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });
const today = new Date(2026, 9, 13, 23, 50);
describe("Plan Today: read-only explicit dates and canonical eligibility", () => {
  it("groups explicit planned and due dates without duplicates or inferred plans", async () => {
    const planned = await createObligation({ title: "Planned", plannedAt: "2026-10-13", dueAt: "2026-10-12" });
    const due = await createObligation({ title: "Due", dueAt: "2026-10-13" });
    const overdue = await createObligation({ title: "Overdue", dueAt: "2026-10-12" });
    await createObligation({ title: "Future", plannedAt: "2026-10-14", dueAt: "2026-10-15" });
    await createObligation({ title: "Undated" });
    const before = await db.events.toArray();
    const plan = await getTodayPlan(today);
    expect(plan.planned.map((item) => item.id)).toEqual([planned.id]);
    expect(plan.due.map((item) => item.id)).toEqual([due.id, overdue.id]);
    expect(await db.events.toArray()).toEqual(before);
  });
  it("excludes resolved and archived-Mission tasks, retaining eligible WAITING truth", async () => {
    const mission = await createMission({ title: "Historical direction" });
    await createObligation({ title: "Archived context", plannedAt: "2026-10-13", missionId: mission.id });
    await archiveMission(mission.id);
    const completed = await createObligation({ title: "Done", plannedAt: "2026-10-13" }); await satisfyObligation(completed.id);
    const released = await createObligation({ title: "Released", dueAt: "2026-10-13" }); await releaseObligation(released.id);
    const waiting = await createObligation({ title: "Waiting", plannedAt: "2026-10-13" }); await markObligationWaiting(waiting.id);
    const plan = await getTodayPlan(today);
    expect(plan.planned.map((item) => [item.id, item.status])).toEqual([[waiting.id, "WAITING"]]);
    expect(plan.due).toEqual([]);
  });
  it("uses local calendar dates across overnight work without changing lived-day ownership", async () => {
    const tomorrow = await createObligation({ title: "Tomorrow", plannedAt: "2026-10-14" });
    expect((await getTodayPlan(today)).planned).toEqual([]);
    expect((await getTodayPlan(new Date(2026, 9, 14, 0, 5))).planned.map((item) => item.id)).toEqual([tomorrow.id]);
    expect(await db.beyondDays.count()).toBe(0);
  });
});
