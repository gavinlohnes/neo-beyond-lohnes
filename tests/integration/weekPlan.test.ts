import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { archiveMission, createMission, createObligation, modifyObligation } from "../../src/application/intentCommands";
import { deriveWeekTasks, getWeekTasks } from "../../src/application/weekAheadQueries";
import { describeProposal, toProposal } from "../../src/application/alfred/alfredActions";
import { buildPlanningContext } from "../../src/application/alfred/personalContext";
import { confirmContextProposal } from "../../src/application/alfred/contextActions";

/** WEEK-PLAN-001. Invented tasks only. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); });
afterEach(() => { vi.useRealTimers(); db.close(); });

it("puts each open commitment on its planned day, else its due day; undated ones on no day", async () => {
  await createObligation({ title: "Call the bank", plannedAt: "2026-11-02" });
  await createObligation({ title: "Pay the car", dueAt: "2026-11-03" });
  await createObligation({ title: "Planned before due", plannedAt: "2026-11-01", dueAt: "2026-11-03" });
  await createObligation({ title: "Someday" });
  await createObligation({ title: "Next month", dueAt: "2026-12-20" });
  const week = await getWeekTasks();
  expect(week.map((d) => d.date)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
  const on = (date: string) => week.find((d) => d.date === date)!;
  expect(on("2026-11-01").planned.map((o) => o.title)).toEqual(["Planned before due"]);
  expect(on("2026-11-02").planned.map((o) => o.title)).toEqual(["Call the bank"]);
  expect(on("2026-11-03").due.map((o) => o.title)).toEqual(["Pay the car", "Planned before due"]);
  expect(week.flatMap((d) => [...d.planned, ...d.due]).some((o) => o.title === "Someday" || o.title === "Next month")).toBe(false);
  expect(deriveWeekTasks(["2026-11-01"], []).at(0)).toEqual({ date: "2026-11-01", planned: [], due: [] });
});

it("Alfred's plan card sets only the planned day, on confirm, and refuses a changed or impossible task", async () => {
  await startDay();
  const task = await createObligation({ title: "Book a tip run", dueAt: "2026-11-08" });
  const card = toProposal("task_plan", { task_id: task.id, title: task.title, planned_date: "2026-11-03" })!;
  expect(describeProposal(card)).toBe("Plan: Book a tip run · Tue, Nov 3");
  expect(toProposal("task_plan", { task_id: task.id, title: task.title, planned_date: "2026-11-31" })).toBeNull();
  const context = await buildPlanningContext(false);
  await confirmContextProposal(card, context, false);
  const after = await db.obligations.get(task.id);
  expect(after).toMatchObject({ plannedAt: "2026-11-03", dueAt: "2026-11-08", status: "OPEN" });
  // A card proposed before an edit elsewhere is refused.
  const stale = await buildPlanningContext(false);
  await modifyObligation(task.id, { title: "Book the tip run" });
  await expect(confirmContextProposal({ kind: "task_plan", task_id: task.id, title: "Book a tip run", planned_date: "2026-11-04" }, stale, false)).rejects.toThrow("CONTEXT_CHANGED");
  expect((await db.obligations.get(task.id))!.plannedAt).toBe("2026-11-03");
});

it("leaves out tasks under an archived Mission, like Plan Today does (review of #365)", async () => {
  const mission = await createMission({ title: "Invented direction" });
  await createObligation({ title: "Under the mission", missionId: mission.id, plannedAt: "2026-11-02" });
  await createObligation({ title: "Standalone", plannedAt: "2026-11-02" });
  await archiveMission(mission.id);
  const day = (await getWeekTasks()).find((d) => d.date === "2026-11-02")!;
  expect(day.planned.map((o) => o.title)).toEqual(["Standalone"]);
});
