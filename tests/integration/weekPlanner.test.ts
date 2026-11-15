import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { db } from "../../src/persistence/db";
import { getWeekPlanner, plannerDates, plannerEventsOn } from "../../src/application/weekPlannerQueries";
import { moveWeekTask } from "../../src/application/weekPlannerCommands";
import { createObligation, modifyObligation, createMission, archiveMission, satisfyObligation } from "../../src/application/intentCommands";
import { getObligation } from "../../src/application/intentQueries";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { applyAnyRestore } from "../../src/persistence/restore";
import type { GoogleCalendarEvent } from "../../src/application/googleCalendar";

const now = new Date(2026, 10, 14, 12);
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await db.open(); });
afterEach(() => { db.close(); vi.useRealTimers(); });
it("projects seven dates and eligible commitments once per day, with independent due/planned meaning and no writes", async () => {
  const mission = await createMission({ title: "Archived" });
  await createObligation({ title: "Hidden", plannedAt: "2026-11-14", missionId: mission.id }); await archiveMission(mission.id);
  const task = await createObligation({ title: "Book appointment", plannedAt: "2026-11-14", dueAt: "2026-11-16" });
  await createObligation({ title: "Earlier deadline", dueAt: "2026-11-13" });
  await createObligation({ title: "Unplaced" });
  const count = await db.events.count(); const result = await getWeekPlanner(now);
  expect(result.days.map((d) => d.date)).toEqual(plannerDates(now));
  expect(result.days[0]?.tasks.map((t) => t.id)).toEqual([task.id]);
  expect(result.days[2]?.tasks.map((t) => t.id)).toEqual([task.id]);
  expect(result.overdue.map((t) => t.title)).toEqual(["Earlier deadline"]);
  expect(result.unplanned.map((t) => t.title)).toEqual(["Unplaced"]);
  expect(result.days.every((d) => d.basis === "UNKNOWN")).toBe(true);
  expect(await db.events.count()).toBe(count);
});
it("your weekday programme is an assignment even without a known work forecast", async () => {
  await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "6": "B" } }, null);
  const result = await getWeekPlanner(now);
  expect(result.days[0]?.workout).toEqual({ label: "Workout B", basis: "ASSIGNED" });
  expect(result.days[1]?.workout.basis).toBe("UNASSIGNED");
});
it("moves only planned attention, keeps deadline/recurrence, no-ops same dates and survives native restore", async () => {
  const task = await createObligation({ title: "Dentist", dueAt: "2026-11-15", plannedAt: "2026-11-14", recurrence: { rrule: "FREQ=WEEKLY;BYDAY=SU" } });
  const moved = await moveWeekTask(task.id, "2026-11-17", task, now);
  expect(moved).toMatchObject({ plannedAt: "2026-11-17", dueAt: "2026-11-15", status: "OPEN" });
  expect(moved.recurrence).toEqual(task.recurrence);
  const count = await db.events.count(); await moveWeekTask(task.id, "2026-11-17", moved, now); expect(await db.events.count()).toBe(count);
  const backup = await db.export({ prettyJson: true });
  await moveWeekTask(task.id, "2026-11-18", moved, now);
  await applyAnyRestore(new File([backup], "week.json", { type: "application/json" }));
  expect(await getObligation(task.id)).toEqual(moved);
});
it("same-clock concurrent moves reject a stale planned date instead of silently overwriting", async () => {
  const task = await createObligation({ title: "One plan", plannedAt: "2026-11-14" });
  const attempts = await Promise.allSettled([moveWeekTask(task.id, "2026-11-15", task, now), moveWeekTask(task.id, "2026-11-16", task, now)]);
  expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await getObligation(task.id))?.plannedAt).toBe("2026-11-15");
});
it("rejects closed, archived and stale tasks, or dates outside the refreshed window, without writes", async () => {
  const parent = await createMission({ title: "Work" });
  const task = await createObligation({ title: "A task", missionId: parent.id });
  await modifyObligation(task.id, { plannedAt: "2026-11-16" });
  await expect(moveWeekTask(task.id, "2026-11-17", task, now)).rejects.toThrow("task changed");
  const latest = (await getObligation(task.id))!; await archiveMission(parent.id);
  const count = await db.events.count();
  await expect(moveWeekTask(task.id, "2026-11-17", latest, now)).rejects.toThrow("no longer open");
  const closed = await createObligation({ title: "Done" }); await satisfyObligation(closed.id);
  await expect(moveWeekTask(closed.id, "2026-11-17", closed, now)).rejects.toThrow("no longer open");
  await expect(moveWeekTask(task.id, "2026-11-21", latest, now)).rejects.toThrow("outside");
  expect(await db.events.count()).toBe(count + 2);
});
it("a failed event write rolls back the date move", async () => {
  const task = await createObligation({ title: "Keep me", plannedAt: "2026-11-14" });
  const fail = () => { throw new Error("event unavailable"); }; db.events.hook("creating", fail);
  try { await expect(moveWeekTask(task.id, "2026-11-15", task, now)).rejects.toThrow("event unavailable"); }
  finally { db.events.hook("creating").unsubscribe(fail); }
  expect((await getObligation(task.id))?.plannedAt).toBe("2026-11-14");
});
it("calendar uses local overlap with exclusive ends for all-day and overnight events", () => {
  const event = (id: string, start: string, end: string, allDay = false): GoogleCalendarEvent => ({ id, title: id, start, end, allDay, calendar: "primary" });
  const events = [event("trip", "2026-11-14", "2026-11-16", true), event("late", new Date(2026, 10, 13, 23).toISOString(), new Date(2026, 10, 14, 1).toISOString()), event("ends", new Date(2026, 10, 13, 22).toISOString(), new Date(2026, 10, 14).toISOString())];
  expect(plannerEventsOn(events, "2026-11-14").map((e) => e.id)).toEqual(["trip", "late"]);
  expect(plannerEventsOn(events, "2026-11-16")).toEqual([]);
  expect(plannerDates(new Date(2026, 2, 7, 12))).toEqual(["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]);
});

it("a move checks the current date after transaction acquisition rather than before it", async () => {
  const task = await createObligation({ title: "Midnight queue", plannedAt: "2026-11-15" });
  const transaction = db.transaction;
  const acquired = vi.spyOn(db, "transaction").mockImplementationOnce((...args) => {
    // Deterministically simulate crossing midnight while acquiring the transaction.
    vi.setSystemTime(new Date(2026, 10, 15, 0, 1));
    return Reflect.apply(transaction, db, args);
  });
  try { await expect(moveWeekTask(task.id, "2026-11-14", task)).rejects.toThrow("outside the current"); }
  finally { acquired.mockRestore(); }
  expect((await getObligation(task.id))?.plannedAt).toBe("2026-11-15");
});

it("reuses saved rotation forecasts and confirmed changes without calling either recorded work", async () => {
  const { id: _id, createdAt: _created, updatedAt: _updated, ...pattern } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(pattern);
  const baseline = await getWeekPlanner(now);
  expect(baseline.days.every((d) => d.basis === "PREDICTED")).toBe(true);
  const target = baseline.days[1]!;
  const kind = target.work === "WORK" ? "OFF" : "WORK";
  await confirmScheduleException({ date: target.date, kind, note: "Changed shift" });
  const changed = await getWeekPlanner(now);
  expect(changed.days[1]).toMatchObject({ work: kind, basis: "CONFIRMED" });
  expect(changed.days[0]?.basis).toBe("PREDICTED");
});


it("rejects a target that becomes yesterday while reading eligibility without writing", async () => {
  const task = await createObligation({ title: "Midnight read", plannedAt: "2026-11-15" });
  const count = await db.events.count();
  const crossMidnight = (value: unknown) => { vi.setSystemTime(new Date(2026, 10, 15, 0, 1)); return value; };
  db.obligations.hook("reading", crossMidnight);
  try { await expect(moveWeekTask(task.id, "2026-11-14", task)).rejects.toThrow("outside the current"); }
  finally { db.obligations.hook("reading").unsubscribe(crossMidnight); }
  expect((await getObligation(task.id))?.plannedAt).toBe("2026-11-15");
  expect(await db.events.count()).toBe(count);
});
