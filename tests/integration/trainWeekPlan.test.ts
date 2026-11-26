import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { updateSchedulePattern } from "../../src/application/commands";
import { createCustomTemplateSet } from "../../src/application/customTemplateCommands";
import { getTrainingProgramme, saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { draftWeekPlan, getTodayPlannedTemplate, getWeekPlanView, moveWeekPlanDay, setWeekPlanDay, startWeekPlan, undoWeekPlanChange } from "../../src/application/weekPlan";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import type { WeekPlanTrainingProgramme } from "../../src/domain/workout/trainingProgramme";

/**
 * GRAYSON-WEEK-PLAN-001 (Gavin, 2026-11-25): the week on Week A and Week B. "Now" is Wednesday 2 Dec 2026, 20:00, in
 * Week A of a saved two-week rota (Week A works Mon and Tue, Week B Wed and Thu, 18:00–06:00).
 */
const NOW = new Date(2026, 11, 2, 20, 0);
const day = (d: number, m = 11) => new Date(2026, m, d, 20, 0);
const plannedOn = async (date: Date) => (await getProgrammeView(date)).planned.templateId;
async function saveRota() {
  await updateSchedulePattern({ anchorMonday: "2026-11-30", weeks: [{ workdays: [1, 2] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 });
}
const plan = (weeks: Record<string, string>[]): WeekPlanTrainingProgramme => ({ mode: "WEEK_PLAN", weeks });
const rest = () => Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, "REST"]));

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("converting his current setup", () => {
  it("WEEKDAYS gives the same plan day by day; today stays what TRAIN plans now", async () => {
    await saveRota();
    const before = (await getTodayPlannedTemplate(NOW)).templateId;
    await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "1": "A", "3": "B", "5": "C" } }, null);
    const draft = await draftWeekPlan(NOW);
    for (const week of draft.plan.weeks) expect(week).toEqual({ ...rest(), "1": "A", "3": "B", "5": "C" });
    expect(draft.plan.overrides).toEqual({ "2026-12-02": before });

    const revision = await getTrainingProgramme();
    await startWeekPlan(draft.plan, revision.id);
    // Today: unchanged (it would be B on a Wednesday by the week).
    expect((await getTodayPlannedTemplate(NOW)).templateId).toBe(before);
    expect(await plannedOn(day(9))).toBe("B");
    expect(await plannedOn(day(4))).toBe("C");
    expect(await plannedOn(day(6))).toBeNull();
  });

  it("a SEQUENCE keeps its next member: today stays the next, then the rest in turn, three a week on days off first", async () => {
    await saveRota();
    const t = await createCustomTemplateSet(["A", "B", "C"].map((k) => ({ name: `Synthetic ${k}`, exercises: WORKOUT_TEMPLATES[k]!.exercises })));
    await saveTrainingProgramme(buildSequenceProgramme([t[0]!.id, t[1]!.id, t[2]!.id], t), null);
    expect((await getTodayPlannedTemplate(NOW)).templateId).toBe(t[0]!.id);
    const draft = await draftWeekPlan(NOW);
    expect(draft.plan.overrides).toEqual({ "2026-12-02": t[0]!.id });
    for (const week of draft.plan.weeks) expect(Object.values(week).filter((v) => v !== "REST")).toHaveLength(3);
    // Week A's days off are Wed to Sun: the first three after today carry on B, C, A.
    expect(draft.plan.weeks[0]).toMatchObject({ "4": t[1]!.id, "5": t[2]!.id });
    await startWeekPlan(draft.plan, (await getTrainingProgramme()).id);
    expect((await getTodayPlannedTemplate(NOW)).templateId).toBe(t[0]!.id);
    expect(await plannedOn(day(3))).toBe(t[1]!.id);
  });

  it("nothing set: every day Rest, and today keeps the A → B → C turn", async () => {
    await saveRota();
    const draft = await draftWeekPlan(NOW);
    expect(draft.plan.weeks.every((w) => Object.values(w).every((v) => v === "REST"))).toBe(true);
    expect(draft.plan.overrides).toEqual({ "2026-12-02": "A" });
  });
});

describe("the week", () => {
  async function started(weeks: Record<string, string>[]) {
    await saveRota();
    const first = await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "4": "A" } }, null);
    return startWeekPlan(plan(weeks), first.id);
  }

  it("Week A and Week B resolve from the saved anchor, across the cycle", async () => {
    await started([{ ...rest(), "4": "A" }, { ...rest(), "4": "B" }]);
    expect(await plannedOn(day(3))).toBe("A");
    expect(await plannedOn(day(10))).toBe("B");
    expect(await plannedOn(day(17))).toBe("A");
    const view = await getWeekPlanView(NOW);
    expect(view.weeks.map((w) => [w.title, w.letter])).toEqual([["THIS WEEK", "A"], ["NEXT WEEK", "B"]]);
    expect(view.weeks[0]!.days.find((d) => d.today)).toMatchObject({ date: "2026-12-02", weekday: "Wednesday", work: "OFF" });
    expect(view.weeks[0]!.days[0]).toMatchObject({ weekday: "Monday", work: "WORK", past: true });
  });

  it("JUST THIS DAY ends after its day; EVERY WEEK A changes only Week A; UNDO puts each back", async () => {
    await started([{ ...rest(), "4": "A" }, { ...rest(), "4": "B" }]);
    const one = await setWeekPlanDay("2026-12-03", "C", "DAY", NOW);
    expect(await plannedOn(day(3))).toBe("C");
    expect(await plannedOn(day(17))).toBe("A");
    await undoWeekPlanChange(one);
    expect(await plannedOn(day(3))).toBe("A");

    await setWeekPlanDay("2026-12-04", "B", "EVERY_WEEK", NOW);
    expect(await plannedOn(day(4))).toBe("B");
    expect(await plannedOn(day(18))).toBe("B");
    expect(await plannedOn(day(11))).toBeNull();
    expect(await plannedOn(day(5))).toBeNull();
  });

  it("an empty workout plans a session with no routine", async () => {
    await started([{ ...rest(), "4": "EMPTY" }, rest()]);
    expect(await plannedOn(day(3))).toBe("");
    expect((await getTodayPlannedTemplate(day(3))).templateId).toBe("");
  });

  it("MOVE TO puts the workout on another day and leaves Rest; a Rest day can't be moved", async () => {
    await started([{ ...rest(), "4": "A" }, rest()]);
    await moveWeekPlanDay("2026-12-03", "2026-12-05", NOW);
    expect(await plannedOn(day(5))).toBe("A");
    expect(await plannedOn(day(3))).toBeNull();
    await expect(moveWeekPlanDay("2026-12-06", "2026-12-05", NOW)).rejects.toThrow("already Rest");
  });

  it("refuses a routine that doesn't exist, and UNDO of USE THIS WEEK restores the old setup", async () => {
    await saveRota();
    const first = await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "4": "A" } }, null);
    await expect(startWeekPlan(plan([{ ...rest(), "4": "missing" }]), first.id)).rejects.toThrow("no longer available");
    const used = await startWeekPlan(plan([{ ...rest(), "4": "B" }, rest()]), first.id);
    await undoWeekPlanChange(used);
    expect((await getTrainingProgramme()).programme).toEqual({ mode: "WEEKDAYS", slots: { "4": "A" } });
  });

  it("without a saved schedule it's one plain Monday-to-Sunday week, saying so", async () => {
    const draft = await draftWeekPlan(NOW);
    expect(draft.plan.weeks).toHaveLength(1);
    const view = await getWeekPlanView(NOW);
    expect(view.scheduleSaved).toBe(false);
    expect(view.weeks.map((w) => w.letter)).toEqual([null, null]);
    expect(view.weeks[0]!.days[0]!.work).toBeNull();
  });

  it("round-trips through the native backup; an older backup imports with its old setup", async () => {
    await saveRota();
    const first = await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "4": "A" } }, null);
    const older = new File([await db.export()], "synthetic-before-week-plan.json", { type: "application/json" });
    const version = db.verno;
    await startWeekPlan({ mode: "WEEK_PLAN", weeks: [{ ...rest(), "4": "C" }, rest()], overrides: { "2026-12-05": "B" } }, first.id);
    expect(db.verno).toBe(version);
    const backup = new File([await db.export()], "synthetic-week-plan.json", { type: "application/json" });
    await previewAnyRestore(backup); await applyAnyRestore(backup);
    expect(await plannedOn(day(3))).toBe("C");
    expect(await plannedOn(day(5))).toBe("B");
    await previewAnyRestore(older); await applyAnyRestore(older);
    expect((await getTrainingProgramme()).programme).toEqual({ mode: "WEEKDAYS", slots: { "4": "A" } });
  });
});
