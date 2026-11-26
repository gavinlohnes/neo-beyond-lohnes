import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { endDay, startDay, updateSchedulePattern } from "../../src/application/commands";
import { balanceNutritionDayTargets, updateNutritionTargets } from "../../src/application/nutritionTargetCommands";
import { getDayCalorieTarget, getNutritionTargets, getPlannedDayCalorieTarget, getTwoWeekDayTargetProjection } from "../../src/application/nutritionTargetQueries";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { buildSequenceProgramme } from "../../src/application/trainingProgrammeQueries";
import { createCustomTemplate } from "../../src/application/customTemplateCommands";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { deriveLifeState, lifeStateInput } from "../../src/application/lifeState";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { describeCalorieProgress } from "../../src/ui/screens/body/nutritionCopy";

/**
 * GRAYSON-DAY-TARGETS-001 (#736 takeover): the day's kind and lift through the application layer, off parity, the
 * floor, the weekly proposal moving the base only, and BALANCE with UNDO. Run under TZ=UTC and TZ=America/Chicago.
 */
const ADJUST = { WORK: 100, RECOVERY: 200, OFF: -100, LIFT: 150 };
const at = (d: number) => new Date(2026, 10, d, 16, 30);
const KIND = { WORK_RUN: "WORK", RECOVERY: "RECOVERY", FLIP: "OFF", FREE: "OFF" } as const;

beforeEach(async () => {
  await db.open();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 1, 12));
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(() => { vi.useRealTimers(); db.close(); });

describe("targets by kind of day", () => {
  it("off: every day reads exactly the plain target, and the food line is unchanged", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 1950 });
    for (const d of [16, 18, 20, 22]) expect(await getPlannedDayCalorieTarget(at(d))).toMatchObject({ kcal: 1950, parts: [] });
    await updateNutritionTargets({ dayTargets: { on: false, adjustKcal: ADJUST } });
    for (const d of [16, 18, 20, 22]) expect((await getPlannedDayCalorieTarget(at(d))).kcal).toBe(1950);
    expect(describeCalorieProgress(1200, 1950, true)).toBe("1200 / 1950 kcal · 750 remaining");
  });

  it("each kind maps from the lived day's life state, the way the eating window names it (FLIP is a day off)", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2000, dayTargets: { on: true, adjustKcal: { ...ADJUST, LIFT: 0 } } });
    const seen = new Set<string>();
    for (let d = 2; d <= 28; d++) {
      const state = deriveLifeState(lifeStateInput(at(d), (await db.schedulePatterns.get("current"))!, null, null))?.state;
      if (!state) continue;
      seen.add(state);
      const target = await getPlannedDayCalorieTarget(at(d));
      expect(target.kind, `Nov ${d} (${state})`).toBe(KIND[state]);
      expect(target.kcal).toBe(2000 + ADJUST[KIND[state]]);
    }
    expect([...seen].sort()).toEqual(["FLIP", "FREE", "RECOVERY", "WORK_RUN"]);
  });

  it("lift adds on top of the kind: a programme's planned workout or one logged; no programme, a sequence or a run alone isn't one", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2000, dayTargets: { on: true, adjustKcal: ADJUST } });
    // Regression for the takeover fix: with no programme, no day is a lift day.
    expect((await getPlannedDayCalorieTarget(at(18))).lift).toBe(false);
    // Nov 18 2026 is a Wednesday (a work day on the default schedule).
    await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "3": "A" } }, null);
    expect(await getPlannedDayCalorieTarget(at(18))).toMatchObject({ kind: "WORK", lift: true, kcal: 2000 + 100 + 150 });
    expect((await getPlannedDayCalorieTarget(at(19))).lift).toBe(false);
    // Logged: a finished strength session that day counts; a run (its own record) doesn't.
    vi.setSystemTime(new Date(2026, 10, 19, 17));
    const day = await startDay(at(19).toISOString());
    await db.runningSessions.add({ id: "run-1", beyondDayId: day.id, status: "COMPLETED", startedAt: new Date().toISOString() } as never);
    expect((await getDayCalorieTarget(day.id)).lift).toBe(false);
    await db.workoutSessions.add({ id: "w-1", schemaVersion: 1, beyondDayId: day.id, templateId: "B", sessionType: "STANDARD", status: "COMPLETED", startedAt: new Date().toISOString() });
    expect((await getDayCalorieTarget(day.id)).lift).toBe(true);
    await endDay(day.id);
  });

  it("#736 review N1: a sequence programme (A → B → C) marks no day as a lift day", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2000, dayTargets: { on: true, adjustKcal: ADJUST } });
    const templates = await Promise.all((["Foundation A", "Foundation B", "Foundation C"] as const).map((name, i) =>
      createCustomTemplate({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
    for (const d of [16, 18, 20, 22]) expect((await getPlannedDayCalorieTarget(at(d))).lift).toBe(false);
  });

  it("the floor holds and says so", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 1600, calorieFloorKcal: 1500, dayTargets: { on: true, adjustKcal: { WORK: 0, RECOVERY: 0, OFF: -300, LIFT: 0 } } });
    const off = await getPlannedDayCalorieTarget(at(22));
    expect(off).toMatchObject({ kind: "OFF", kcal: 1500, floorHeld: true });
  });

  it("saving the weekly proposal moves the base only; the adjustments ride on top", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2000, dayTargets: { on: true, adjustKcal: ADJUST } });
    await updateNutritionTargets({ calorieTargetKcal: 2150 });
    expect((await getNutritionTargets()).dayTargets).toEqual({ on: true, adjustKcal: ADJUST });
    expect((await getPlannedDayCalorieTarget(at(18))).kcal).toBe(2150 + 100);
  });

  it("adjustments stay within ±1000 in steps of 50", async () => {
    await expect(updateNutritionTargets({ dayTargets: { on: true, adjustKcal: { ...ADJUST, WORK: 1050 } } })).rejects.toThrow();
    await expect(updateNutritionTargets({ dayTargets: { on: true, adjustKcal: { ...ADJUST, OFF: -1050 } } })).rejects.toThrow();
  });

  it("BALANCE brings the two-week average to the target (within half a step), and UNDO restores", async () => {
    await updateNutritionTargets({ calorieTargetKcal: 2000, dayTargets: { on: true, adjustKcal: { WORK: 100, RECOVERY: 0, OFF: 0, LIFT: 150 } } });
    vi.setSystemTime(new Date(2026, 10, 16, 18));
    const before = await getTwoWeekDayTargetProjection();
    expect(before.average!).toBeGreaterThan(2000 + 25);
    const { saved, undo } = await balanceNutritionDayTargets();
    expect(saved.dayTargets!.adjustKcal.OFF).toBeLessThan(0);
    expect(Math.abs((await getTwoWeekDayTargetProjection()).average! - 2000)).toBeLessThanOrEqual(25);
    expect(await undo()).toBe(true);
    expect((await getNutritionTargets()).dayTargets!.adjustKcal.OFF).toBe(0);
  });
});

describe("#736 review N2: no display reads the plain target directly", () => {
  it("under src/ui and the meal plan, only the settings form and the weekly proposal name calorieTargetKcal", () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
    // Settings and the proposal edit the plain target. Delta's TARGETS line (operatorContext.ts) and the weekly numbers
    // (weeklyDebriefQueries.ts) keep its original words when targets by kind of day are off, and are tested for it.
    const allowed = new Set(["src/ui/screens/more/NutritionTargetsSettings.tsx", "src/ui/screens/weekly/CalorieProposal.tsx"]);
    const offenders = [...files("src/ui").filter((f) => /\.(ts|tsx)$/.test(f)), "src/application/mealPlanQueries.ts"]
      .filter((f) => !allowed.has(f) && /\bcalorieTargetKcal\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
