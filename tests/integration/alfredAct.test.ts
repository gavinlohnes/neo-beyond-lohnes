import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { logBodyweight, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getMostRecentBodyweight, getProteinEntries } from "../../src/application/queries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getMealEntries } from "../../src/application/nutritionQueries";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { createHabit, getHabitAnswer, getHabitDone, setHabitAnswer } from "../../src/application/habitCommands";
import { startWorkout } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { interpret } from "../../src/application/helper/freeHelper";
import { buildPlanningContext } from "../../src/application/alfred/personalContext";
import { createObligation } from "../../src/application/intentCommands";
import { getObligation } from "../../src/application/intentQueries";
import { toProposal, type AlfredProposal } from "../../src/application/alfred/alfredActions";
import { REGISTRY, autonomyOf, whyConfirm, type Kind } from "../../src/application/alfred/alfredTools";
import { ACT_UNDO_MS, immediateCards, pauseWindow, resumeWindow, runImmediate, undoAct, undoOpen } from "../../src/application/alfred/alfredAct";
import type { ProposalContext } from "../../src/application/alfred/contextActions";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * ALFRED-ACT-001 (Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo"): the registry says
 * which kinds may run at once; a clear one runs through the same guarded confirm as SAVE; UNDO (only inside its
 * 10-second window) leaves nothing counted; everything else and anything unclear stays a card. Invented data.
 * Sun Nov 15 2026 04:21 local; the lived day opened Sat 16:30. Run under TZ=UTC and TZ=America/Chicago.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const NOW = new Date(2026, 10, 15, 4, 21);
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0)); await startDay();
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); });

const ctxNow = async (): Promise<ProposalContext> => { const c = await buildPlanningContext(false); return { recordVersion: c.recordVersion, personalVersion: c.personalVersion, actionVersion: c.actionVersion, taskVersions: c.taskVersions, routineVersions: c.routineVersions }; };
const cards = (...ps: AlfredProposal[]) => ps.map((proposal, n) => ({ id: `c${n}`, proposal }));
async function actOne(p: AlfredProposal, source: "alfred" | "helper" = "alfred") {
  const list = cards(p);
  const ids = await immediateCards(list, source, { understoodAll: true });
  expect([...ids]).toEqual(["c0"]);
  const r = await runImmediate(list, ids, await ctxNow(), false);
  expect(r.stopped).toBeUndefined();
  return r.done.c0!;
}
const activeDayId = async () => (await db.beyondDays.toCollection().last())!.id;
const today = async () => { const id = await activeDayId(); return (await getDaySummaries()).find((s) => s.beyondDayId === id)!; };

describe("registry autonomy", () => {
  it("every kind states its autonomy; only the low-risk logs are immediate", () => {
    const kinds = Object.keys(REGISTRY) as Kind[];
    for (const k of kinds) expect(["immediate-undo", "confirm"]).toContain(REGISTRY[k].autonomy);
    expect(kinds.filter((k) => autonomyOf(k) === "immediate-undo").sort()).toEqual(["habit_done", "log_meal", "log_protein", "log_set", "log_water", "log_weight"]);
    // Every immediate kind has a clarity rule.
    for (const k of kinds.filter((k) => autonomyOf(k) === "immediate-undo")) expect(typeof REGISTRY[k].clear).toBe("function");
    for (const k of ["log_sleep", "correct_log", "remove_log", "fix_entry", "work_started", "work_ended", "shift_fix", "set_work_context", "schedule_change", "schedule_swap",
      "handoff_note", "add_reminder", "capture_note", "task_done", "task_release", "task_waiting", "task_new_date", "task_plan", "remember", "forget", "memory_retire",
      "memory_restore", "collection_add", "routine_tick", "routine_new", "routine_edit", "project_new", "check_in", "clean_day", "log_urge", "person_date", "home_item", "open_training"] as Kind[]) {
      expect(autonomyOf(k), k).toBe("confirm");
    }
  });

  it("confirm kinds never run at once, even when perfectly clear", async () => {
    const task = await createObligation({ title: "Call the dentist" });
    const list = cards(
      { kind: "task_done", task_id: task.id, title: task.title },
      { kind: "remember", text: "Mom's size is M", topic: "PERSON" },
      { kind: "log_sleep", minutes: 420 },
      { kind: "set_work_context", context: "OFF" },
      { kind: "correct_log", metric: "water", target_id: "x", from: 16, to: 12 },
      { kind: "remove_log", metric: "weight", target_id: "x", from: 200 },
      { kind: "capture_note", text: "buy filters" },
    );
    expect((await immediateCards(list, "alfred", { understoodAll: true })).size).toBe(0);
    expect((await immediateCards(list, "helper", { understoodAll: true })).size).toBe(0);
    expect((await getObligation(task.id))?.status).not.toBe("SATISFIED");
  });
});

describe("each low-risk log runs at once, and UNDO leaves nothing counted", () => {
  it("water", async () => {
    const done = await actOne(toProposal("log_water", { oz: 20 })!);
    expect((await today()).waterOz).toBe(20);
    expect(await undoAct(done.undo!, done.window)).toBe("UNDONE");
    expect((await today()).waterOz ?? 0).toBe(0);
  });

  it("protein", async () => {
    const done = await actOne(toProposal("log_protein", { grams: 30 })!);
    expect((await getProteinEntries(await activeDayId())).length).toBe(1);
    expect(await undoAct(done.undo!, done.window)).toBe("UNDONE");
    expect(await getProteinEntries(await activeDayId())).toEqual([]);
  });

  it("one of his saved meals, from Alfred or the free helper", async () => {
    const meal = await createSavedMeal({ name: "Chicken bowl", calories: 640, proteinG: 45, carbsG: 60, fatG: 18 });
    const saved = await actOne(toProposal("log_meal", { saved_meal_id: meal.id, name: "Chicken bowl", calories: 640, protein_g: 45 })!);
    const free = interpret("ate 2 chicken bowl", await readHelperContext());
    expect(free.unknown).toEqual([]);
    const twice = await actOne(free.cards[0]!, "helper");
    expect((await today()).kcal).toBe(640 * 3);
    expect(await undoAct(saved.undo!, saved.window)).toBe("UNDONE");
    expect(await undoAct(twice.undo!, twice.window)).toBe("UNDONE");
    expect((await today()).kcal ?? 0).toBe(0);
    expect(await getMealEntries(await activeDayId())).toEqual([]);
  });

  it("weight near his last weigh-in; UNDO brings the last one back", async () => {
    await logBodyweight(await activeDayId(), 205);
    const done = await actOne(toProposal("log_weight", { lbs: 203.4 })!);
    expect(await getMostRecentBodyweight()).toBe(203.4);
    expect(await undoAct(done.undo!, done.window)).toBe("UNDONE");
    expect(await getMostRecentBodyweight()).toBe(205);
  });

  it("a habit done; UNDO puts back the answer it had (NOT_DONE stays NOT_DONE)", async () => {
    const stretch = await createHabit({ name: "Stretch", kind: "ANY_DAY" });
    const read = await createHabit({ name: "Read", kind: "ANY_DAY" });
    const dayId = await activeDayId();
    await setHabitAnswer(read.id, "NOT_DONE", dayId);
    const a = await actOne({ kind: "habit_done", habit_id: stretch.id, name: "Stretch" });
    const b = await actOne({ kind: "habit_done", habit_id: read.id, name: "Read" });
    expect([...(await getHabitDone(dayId))].sort()).toEqual([stretch.id, read.id].sort());
    expect(await undoAct(a.undo!, a.window)).toBe("UNDONE");
    expect(await undoAct(b.undo!, b.window)).toBe("UNDONE");
    expect(await getHabitDone(dayId)).toEqual(new Set());
    expect(await getHabitAnswer(stretch.id, dayId)).toBe("UNRECORDED");
    expect(await getHabitAnswer(read.id, dayId)).toBe("NOT_DONE");
  });

  it("a set in the workout in progress (free helper); UNDO is TRAIN's own, for exactly that set", async () => {
    const session = await startWorkout(await activeDayId(), "A", "STANDARD");
    const ctx = await readHelperContext();
    const first = ctx.workout!.exercises[0]!;
    const r = interpret(`${first.name.toLowerCase()} 135 x 8`, ctx);
    const done = await actOne(r.cards[0]!, "helper");
    expect((await getPerformedSets(session.id)).length).toBe(1);
    expect(await undoAct(done.undo!, done.window)).toBe("UNDONE");
    expect(await getPerformedSets(session.id)).toEqual([]);
  });
});

describe("the 10-second window", () => {
  it("after the window UNDO is refused and the entry stays", async () => {
    const done = await actOne(toProposal("log_water", { oz: 16 })!);
    expect(done.window.until).toBe(NOW.getTime() + ACT_UNDO_MS);
    vi.setSystemTime(NOW.getTime() + ACT_UNDO_MS + 1);
    expect(undoOpen(done.window)).toBe(false);
    expect(await undoAct(done.undo!, done.window)).toBe("EXPIRED");
    expect((await today()).waterOz).toBe(16);
  });

  it("held open while he hovers or focuses it, then resumes with the time that was left", () => {
    const w = { until: NOW.getTime() + ACT_UNDO_MS };
    const held = pauseWindow(w, NOW.getTime() + 4000);
    expect(held.pausedLeft).toBe(6000);
    expect(undoOpen(held, NOW.getTime() + 60_000)).toBe(true);
    const resumed = resumeWindow(held, NOW.getTime() + 60_000);
    expect(resumed).toEqual({ until: NOW.getTime() + 66_000 });
    expect(undoOpen(resumed, NOW.getTime() + 66_001)).toBe(false);
  });
});

describe("ambiguous or low-confidence: the card stays", () => {
  it("a time, an unusual amount, Alfred's macro estimate, a first or far weigh-in, a habit already done", async () => {
    const habit = await createHabit({ name: "Walk", kind: "ANY_DAY" });
    await setHabitAnswer(habit.id, "DONE", await activeDayId());
    const reasons = async (p: AlfredProposal, source: "alfred" | "helper" = "alfred") => whyConfirm(p, source);
    expect(await reasons({ kind: "log_water", oz: 16, time: "03:10" })).toBe("a time was given");
    expect(await reasons({ kind: "log_water", oz: 16, at: "2026-11-15T09:10:00.000Z" })).toBe("a time was given");
    expect(await reasons({ kind: "log_water", oz: 120 })).toBe("an unusual amount");
    expect(await reasons({ kind: "log_protein", grams: 400 })).toBe("an unusual amount");
    expect(await reasons({ kind: "log_meal", name: "Pizza", calories: 800, protein_g: 30 })).toBe("the macros are Alfred's estimate");
    expect(await reasons({ kind: "log_meal", name: "Pizza", calories: 800, protein_g: 30, saved_meal_id: "nope" })).toBe("no saved meal matches");
    expect(await reasons({ kind: "log_meal", name: "Pizza", calories: 800, protein_g: 30, remember: true }, "helper")).toBe("it also keeps a saved meal");
    const typed = interpret("ate turkey wrap 520 cal 38g protein", await readHelperContext()).cards[0]!;
    expect(await reasons(typed, "helper")).toBe("a new food (SAVE + REMEMBER MEAL is offered)");
    expect(await reasons({ kind: "log_weight", lbs: 200 })).toBe("no earlier weigh-in to compare");
    await logBodyweight(await activeDayId(), 200);
    expect(await reasons({ kind: "log_weight", lbs: 220 })).toBe("far from his last weigh-in");
    expect(await reasons({ kind: "habit_done", habit_id: habit.id, name: "Walk" })).toBe("already done today");
    expect(await reasons({ kind: "habit_done", habit_id: "", name: "Walk" })).toBe("no single habit matched");
    expect(await reasons({ kind: "log_set", session_id: "gone", exercise_id: "x", exercise_name: "Bench", weight: 135, reps: 8 })).toBe("no workout in progress");
  });

  it("a message the free helper didn't fully understand, or the same log twice in one message", async () => {
    const helper = interpret("20 oz water and fix the thing", await readHelperContext());
    expect(helper.unknown.length).toBeGreaterThan(0);
    expect((await immediateCards(cards(...helper.cards), "helper", { understoodAll: helper.unknown.length === 0 })).size).toBe(0);
    const twice = cards({ kind: "log_water", oz: 16 }, { kind: "log_water", oz: 16 }, { kind: "log_protein", grams: 25 });
    expect([...(await immediateCards(twice, "alfred", { understoodAll: true }))]).toEqual(["c2"]);
  });

  it("the free helper's clear water, weight and habit lines run at once", async () => {
    await createHabit({ name: "Stretch", kind: "ANY_DAY" });
    await logBodyweight(await activeDayId(), 210);
    const r = interpret("drank 20 oz water, weighed 208, did stretch", await readHelperContext());
    expect(r.unknown).toEqual([]);
    expect(r.cards.map((c) => c.kind)).toEqual(["log_water", "log_weight", "habit_done"]);
    expect((await immediateCards(cards(...r.cards), "helper", { understoodAll: true })).size).toBe(3);
  });

  it("records changed since the read: nothing runs, it stays a card", async () => {
    const stale = await ctxNow();
    await logBodyweight(await activeDayId(), 190); // an outside change
    const list = cards({ kind: "log_water", oz: 12 });
    const r = await runImmediate(list, new Set(["c0"]), stale, false);
    expect(r.done).toEqual({});
    expect((r.stopped?.error as Error).message).toBe("CONTEXT_CHANGED");
    expect((await today()).waterOz ?? 0).toBe(0);
  });
});

describe("backup round-trip", () => {
  it("a log saved at once and undone stays undone after export and restore; one kept stays kept", async () => {
    const kept = await actOne(toProposal("log_water", { oz: 24 })!);
    const undone = await actOne(toProposal("log_protein", { grams: 30 })!);
    expect(await undoAct(undone.undo!, undone.window)).toBe("UNDONE");
    expect(kept.undo).toBeDefined();
    const blob = await db.export({ prettyJson: true });
    const file = new File([blob], "native-backup.json", { type: "application/json" });
    await logBodyweight(await activeDayId(), 199); // diverge, so the restore has something to replace
    await applyAnyRestore(file);
    expect((await today()).waterOz).toBe(24);
    expect(await getProteinEntries(await activeDayId())).toEqual([]);
    expect(await db.events.where("type").equals("PROTEIN_LOG_VOIDED").count()).toBe(1);
    expect(await getMostRecentBodyweight()).toBeUndefined();
  });
});
