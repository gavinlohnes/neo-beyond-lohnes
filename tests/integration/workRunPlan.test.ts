import { DEFAULT_SCHEDULE_PATTERN, formatLocalDate, scheduledWorkContextForLivedDay } from "../../src/engine/scheduledContext";
import { deriveShiftSleepPlan } from "../../src/application/shiftSleepPlan";
import { expect, it } from "vitest";
import { compatibleSleepPreview, composeWorkRunDraft, getWorkRunDraft, runBlock } from "../../src/application/workRunPlan";
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
  expect(composeWorkRunDraft(week, meals, sleep, [], now, true).text).toContain("23:07");
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


it("reconciles an exception after it becomes recorded, and manual overrides, before including sleep advice", () => {
  const pattern = { ...DEFAULT_SCHEDULE_PATTERN, updatedAt: "2026-11-15T12:00:00.000Z" };
  const sleep = Array.from({ length: 14 }, (_, n) => deriveShiftSleepPlan({ now: new Date(2026, 10, 15 + n, 12), pattern, rhythm: null, rows: [] })).find((plan) => plan !== null)!;
  expect(sleep).toBeTruthy();
  expect(compatibleSleepPreview(sleep, pattern, new Map(), new Map())).toBe(true);
  const start = new Date(`${sleep.shift.date}T16:30:00`);
  const previous = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 16, 30);
  const kind = scheduledWorkContextForLivedDay(previous, pattern) === "WORK" ? "OFF" : "WORK";
  for (const by of ["EXCEPTION", "OPERATOR"] as const) {
    expect(compatibleSleepPreview(sleep, pattern, new Map([[formatLocalDate(previous), { kind, by }]]), new Map())).toBe(false);
  }
  expect(compatibleSleepPreview(sleep, pattern, new Map(), new Map([[formatLocalDate(previous), kind]]))).toBe(false);
  // A caller lacking a reconciled source may never opt into the standing sleep cards implicitly.
  expect(composeWorkRunDraft(week, meals, sleep, [], now).text).toContain("No matching sleep preview included");
});
