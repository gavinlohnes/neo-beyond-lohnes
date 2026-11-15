import { expect, it } from "vitest";
import { composeWorkRunDraft, getWorkRunDraft, runBlock } from "../../src/application/workRunPlan";
import type { WeekPlanner, PlannerDay } from "../../src/application/weekPlannerQueries";
import type { getMealPlanInputs } from "../../src/application/mealPlanQueries";
import type { ShiftSleepPlan } from "../../src/application/shiftSleepPlan";
import { db } from "../../src/persistence/db";
const now = new Date(2026, 10, 15, 12);
const day = (n: number, work: "WORK" | "OFF", basis: PlannerDay["basis"] = "PREDICTED"): PlannerDay => ({ date: `2026-11-${15 + n}`, work, basis, shiftStartHour: work === "WORK" ? 18 : null, tasks: [], events: [], workout: { basis: "ASSIGNED", label: "Workout A" } } as unknown as PlannerDay);
const week: WeekPlanner = { date: "2026-11-15", days: [day(0, "WORK"), day(1, "WORK"), day(2, "OFF"), day(3, "OFF"), day(4, "WORK"), day(5, "WORK"), day(6, "OFF")], overdue: [], unplanned: [], calendar: { connected: false, lastSyncAt: null } };
const meals = { meals: [1, 2, 3].map((i) => ({ id: `meal-${i}`, name: `Saved meal ${i}`, calories: 500, proteinG: 30 })), targets: {}, window: [], scheduleSaved: true } as unknown as Awaited<ReturnType<typeof getMealPlanInputs>>;
it("drafts one work block and days off, not the next run; preserves task meanings and shared work context for meals", () => {
  const input = structuredClone(week);
  input.days[0]!.tasks = [{ id: "task", title: "Call dentist", plannedAt: "2026-11-15", dueAt: "2026-11-17" }] as PlannerDay["tasks"];
  const before = JSON.stringify(input);
  const result = composeWorkRunDraft(input, meals, null, [], now);
  expect(runBlock(input.days).map((d) => d.date)).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"]);
  expect(result.text).toContain("planned 2026-11-15 · due 2026-11-17");
  expect(result.text).toContain("Meal draft · Pre-shift:");
  expect(result.text).toContain("Training: your programme — Workout A");
  expect(result.text).toContain("cached");
  expect(JSON.stringify(input)).toBe(before);
});
it("unknown gaps never become days off or get skipped to invent a complete run", () => {
  const input = structuredClone(week); input.days[0] = day(0, "OFF", "UNKNOWN");
  expect(composeWorkRunDraft(input, meals, null, [], now).text).toBeNull();
  input.days[0] = day(0, "WORK"); input.days[1] = day(1, "OFF", "UNKNOWN");
  const result = composeWorkRunDraft(input, meals, null, [], now);
  expect(runBlock(input.days)).toHaveLength(1);
  expect(result.text).toContain("Meal draft omitted");
  expect(result.text).not.toContain("2026-11-16 — Day off");
});
it("does not reuse standing-schedule sleep cards when confirmed changes need reconciliation", () => {
  const sleep = { shift: { date: week.days[0]!.date }, cards: [{ title: "Sleep preview", detail: "23:07", basis: "Existing recorded rhythm", source: null }] } as unknown as ShiftSleepPlan;
  expect(composeWorkRunDraft(week, meals, sleep, [], now).text).toContain("23:07");
  const input = structuredClone(week); input.days[0]!.basis = "CONFIRMED";
  const result = composeWorkRunDraft(input, meals, sleep, [], now);
  expect(result.text).not.toContain("23:07");
  expect(result.text).toContain("No matching sleep preview included");
});
it("reading an actual empty local store creates no day, plan or record", async () => {
  const before = await Promise.all(db.tables.map((table) => table.count()));
  await getWorkRunDraft(now);
  expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(before);
});
