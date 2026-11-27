import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { resolveTemplateExercises } from "../../src/application/customTemplateQueries";
import { getWorkoutPlan } from "../../src/application/workoutChanges";
import {
  acceptBlockSuggestion, changeBlock, comingMonday, endBlock, getBlockReview, getBlockState, getBlockView, lightWeekSessionIds,
  nextBlock, resetBlockSettings, saveBlockSettings, setNormalThisWeek, startBlock, undoBlockChange, undoBlockSuggestion,
} from "../../src/application/trainingBlock";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { blockStartWeight } from "../../src/application/trainingBlock";
import { blockWeekOf, DEFAULT_BLOCK_SETTINGS, isLightWeek, lightSets, validateBlock } from "../../src/domain/workout/trainingBlock";
import { buildBlockReview, type BlockReviewInput } from "../../src/engine/blockReview";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/** GRAYSON-BLOCK-CYCLE-001 (Gavin, 2026-11-25). "Now" starts Wednesday 2 Dec 2026, 20:00. */
const at = (y: number, m: number, d: number, h = 20) => new Date(y, m, d, h, 0);
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at(2026, 11, 2)); });
afterEach(() => { vi.useRealTimers(); });

describe("the block (domain)", () => {
  it("starts on the coming Monday; weeks count from it; the light week is the last unless turned normal", () => {
    expect(comingMonday(at(2026, 11, 2))).toBe("2026-12-07");
    expect(comingMonday(at(2026, 11, 7))).toBe("2026-12-07");
    const block = { startDate: "2026-12-07", weeks: 5, focus: [], lightLastWeek: true };
    expect(blockWeekOf(block, at(2026, 11, 6))).toBeNull();
    expect(blockWeekOf(block, at(2026, 11, 7))).toBe(1);
    expect(blockWeekOf(block, at(2027, 0, 10))).toBe(5);
    expect(blockWeekOf(block, at(2027, 0, 11))).toBeNull();
    expect(isLightWeek(block, at(2027, 0, 4))).toBe(true);
    expect(isLightWeek({ ...block, normalWeeks: [5] }, at(2027, 0, 4))).toBe(false);
    expect(isLightWeek({ ...block, lightLastWeek: false }, at(2027, 0, 4))).toBe(false);
    expect([1, 2, 3, 4, 5, 6].map((n) => lightSets(n))).toEqual([1, 2, 2, 3, 4, 4]);
    expect(validateBlock({ ...block, startDate: "2026-12-08" })).toMatch(/Monday/);
    expect(validateBlock({ ...block, weeks: 7 })).toMatch(/4 to 6/);
    expect(validateBlock({ ...block, focus: ["Chest", "Back", "Legs", "Core"] })).toMatch(/up to 3/);
  });
});

describe("the review rules (engine)", () => {
  const base: BlockReviewInput = {
    settings: DEFAULT_BLOCK_SETTINGS, focus: [], sessions: { done: 12, planned: 15, skippedByWeekday: { "4": 2, "6": 1 }, weeksRun: 5 },
    mainLifts: [{ routineName: "Workout A", name: "Machine Chest Press", start: 150, end: 160 }], stalls: [], weight: null, focusSets: [],
  };
  it("gives the lines from fixed data, weight only with both weeks", () => {
    const r = buildBlockReview(base);
    expect(r.lines.map((l) => l.text)).toEqual(["Sessions: 12 of 15 planned (80%).", "Main lifts (estimated 1RM): Machine Chest Press 150 → 160 lb.", "Stalls: none."]);
    expect(buildBlockReview({ ...base, weight: { start: 210, end: 206.5 } }).lines.at(-1)!.text).toBe("Trend weight: 210 lb → 206.5 lb.");
  });
  it("each rule fires, ranked stalls, sessions, keep, focus; at most three", () => {
    const stall = { routineId: "A", routineName: "Workout A", exerciseId: "pec-deck", name: "Pec Deck", swapTo: { exerciseId: "lib-cable-crossover", name: "Cable Crossover" } };
    const dropStall = { ...stall, exerciseId: "leg-press", name: "Leg Press", swapTo: null };
    const r = buildBlockReview({ ...base, sessions: { done: 9, planned: 15, skippedByWeekday: { "4": 4, "6": 2 }, weeksRun: 5 }, stalls: [stall, dropStall], focus: ["Chest"],
      focusSets: [{ area: "Chest", setsPerWeek: 6, firstExercise: { routineId: "A", exerciseId: "machine-chest-press", name: "Machine Chest Press" } }] });
    expect(r.suggestions.map((s) => s.kind)).toEqual(["SWAP", "DROP", "FEWER_DAYS"]);
    expect(r.suggestions[2]!.text).toBe("One fewer planned day a week: make Thursday a rest day.");
    expect(r.suggestions[2]!.why).toMatch(/9 of 15 .*60%.*under 75%/);
    const keep = buildBlockReview({ ...base, focus: ["Chest"], focusSets: [{ area: "Chest", setsPerWeek: 5, firstExercise: { routineId: "A", exerciseId: "machine-chest-press", name: "Machine Chest Press" } }] });
    // Never "keep as they are" beside a change: KEEP only when nothing else is suggested.
    expect(keep.suggestions.map((s) => s.kind)).toEqual(["ADD_SET"]);
    expect(keep.suggestions[0]!.why).toBe("Chest: 5 direct sets a week, under its starting range of 8.");
    expect(buildBlockReview(base).suggestions.map((s) => s.kind)).toEqual(["KEEP"]);
    // A falling lift: no KEEP. Sessions on plan: no FEWER_DAYS.
    expect(buildBlockReview({ ...base, mainLifts: [{ routineName: "A", name: "X", start: 160, end: 150 }] }).suggestions).toEqual([]);
  });
});

describe("start, change, end, UNDO, settings", () => {
  it("one event per change, latest wins, UNDO puts the previous back", async () => {
    const started = await startBlock();
    expect((await getBlockState()).block).toEqual({ startDate: "2026-12-07", weeks: 5, focus: [], lightLastWeek: true });
    expect((await getBlockView()).line).toBe("Block starts Monday, Dec 7");
    vi.setSystemTime(at(2026, 11, 16));
    expect((await getBlockView()).line).toBe("Block · week 2 of 5");
    const changed = await changeBlock({ weeks: 6, focus: ["Chest"] });
    await undoBlockChange(changed);
    expect((await getBlockState()).block?.weeks).toBe(5);
    await expect(undoBlockChange(started)).rejects.toThrow("BLOCK_UNDO_STALE");
    await endBlock();
    expect((await getBlockView()).reviewReady).toBe(true);
    const next = await nextBlock();
    expect((await getBlockState()).block).toMatchObject({ startDate: "2026-12-21", weeks: 5 });
    await undoBlockChange(next);
    await saveBlockSettings({ ...DEFAULT_BLOCK_SETTINGS, sessionsShare: 0.6, focusRanges: { ...DEFAULT_BLOCK_SETTINGS.focusRanges, Back: [6, 10] } });
    expect((await getBlockState()).settings.sessionsShare).toBe(0.6);
    await expect(saveBlockSettings({ ...DEFAULT_BLOCK_SETTINGS, weightDropPercent: 80 })).rejects.toThrow("BLOCK_SETTINGS_INVALID");
    await resetBlockSettings();
    expect((await getBlockState()).settings).toEqual(DEFAULT_BLOCK_SETTINGS);
    for (const e of await db.events.where("type").equals("TRAINING_BLOCK_SET").toArray()) expect(e).toMatchObject({ source: "USER" });
  });
});

describe("the light week", () => {
  it("cuts sets by a third (floor 1) and leaves the routine; NORMAL THIS WEEK restores full sets; never a stall or a miss", async () => {
    await startBlock({ weeks: 4 });
    vi.setSystemTime(at(2026, 11, 29));
    expect((await getBlockView()).lightToday).toBe(true);
    const day = await startDay();
    const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    const plan = await getWorkoutPlan(s);
    expect(plan.today.map((e) => e.sets)).toEqual([2, 2, 2, 2].map((_, i) => lightSets(WORKOUT_TEMPLATES.A!.exercises[i]!.sets)));
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
    expect(plan.routine).toEqual(WORKOUT_TEMPLATES.A!.exercises);
    await logSet(day.id, s.id, "machine-chest-press", 1, 100, 6);
    await completeWorkout(day.id, s.id, "STANDARD", "PARTIAL");
    expect((await lightWeekSessionIds()).has(s.id)).toBe(true);
    // The light session's short sets aren't a REDUCE or a miss: it's left out, so there's no history yet.
    expect((await getProgressionSuggestion("A", "STANDARD", "machine-chest-press")).recommendation).toBe("NO_HISTORY");

    await setNormalThisWeek();
    expect((await getBlockView()).lightToday).toBe(false);
    const s2 = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    expect((await getWorkoutPlan(s2)).today.map((e) => e.sets)).toEqual(WORKOUT_TEMPLATES.A!.exercises.map((e) => e.sets));
  });
});

describe("the review and ACCEPT", () => {
  it("assembles sessions, lifts and weight from his records; ACCEPT saves with UNDO; SKIP and no answer change nothing", async () => {
    await startBlock({ weeks: 4, focus: ["Chest"] });
    for (const [d, w] of [[8, 100], [15, 105], [22, 110], [29, 115]] as const) {
      vi.setSystemTime(at(2026, 11, d));
      const day = await startDay();
      const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
      await logSet(day.id, s.id, "machine-chest-press", 1, w, 10);
      await completeWorkout(day.id, s.id, "STANDARD", "PARTIAL");
    }
    vi.setSystemTime(at(2027, 0, 3));
    const review = (await getBlockReview())!;
    expect(review.lines[0]!.text).toBe("Sessions: 4 done.");
    expect(review.lines[1]!.text).toBe(`Main lifts (estimated 1RM): Machine Chest Press ${Math.round(100 * (1 + 10 / 30))} → ${Math.round(115 * (1 + 10 / 30))} lb.`);
    expect(review.lines.some((l) => l.kind === "WEIGHT")).toBe(false);
    const add = review.suggestions.find((s) => s.kind === "ADD_SET")!;
    expect(add.text).toBe("Add one set to Machine Chest Press.");
    const before = await db.events.count();
    const undo = await acceptBlockSuggestion(add);
    expect((await resolveTemplateExercises("A", "STANDARD"))[0]!.sets).toBe(4);
    await undoBlockSuggestion(undo);
    expect(await resolveTemplateExercises("A", "STANDARD")).toEqual(WORKOUT_TEMPLATES.A!.exercises);
    // KEEP saves nothing.
    const keep = review.suggestions.find((s) => s.kind === "KEEP");
    if (keep) { const n = await db.events.count(); await acceptBlockSuggestion(keep); expect(await db.events.count()).toBe(n); }
    expect(await db.events.count()).toBeGreaterThan(before);
  });

  it("round-trips through the native backup; an older backup imports with no block", async () => {
    const older = new File([await db.export()], "synthetic-before-blocks.json", { type: "application/json" });
    const version = db.verno;
    await startBlock({ weeks: 6, focus: ["Chest", "Triceps"], lightLastWeek: false });
    expect(db.verno).toBe(version);
    const backup = new File([await db.export()], "synthetic-block.json", { type: "application/json" });
    await previewAnyRestore(older); await applyAnyRestore(older);
    expect((await getBlockState()).block).toBeNull();
    await previewAnyRestore(backup); await applyAnyRestore(backup);
    expect((await getBlockState()).block).toMatchObject({ weeks: 6, focus: ["Chest", "Triceps"], lightLastWeek: false });
  });
});

describe("review of #746", () => {
  async function lightWorkout() {
    vi.setSystemTime(at(2026, 11, 29));
    const day = await startDay();
    const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    return { day, s, sets: (await getWorkoutPlan(s)).today.map((e) => e.sets) };
  }
  const full = WORKOUT_TEMPLATES.A!.exercises.map((e) => e.sets);

  it("light week off, the block ended early, or START undone: full sets, and the session counts", async () => {
    await startBlock({ weeks: 4 });
    await changeBlock({ lightLastWeek: false });
    let w = await lightWorkout();
    expect(w.sets).toEqual(full);
    expect((await lightWeekSessionIds()).has(w.s.id)).toBe(false);
    await completeWorkout(w.day.id, w.s.id, "STANDARD", "PARTIAL");
    await db.events.clear(); await db.workoutSessions.clear(); vi.setSystemTime(at(2026, 11, 2));

    await startBlock({ weeks: 4 });
    vi.setSystemTime(at(2026, 11, 16));
    await endBlock();
    w = await lightWorkout();
    expect(w.sets).toEqual(full);
    await completeWorkout(w.day.id, w.s.id, "STANDARD", "PARTIAL");
    await db.events.clear(); await db.workoutSessions.clear(); vi.setSystemTime(at(2026, 11, 2));

    const started = await startBlock({ weeks: 4 });
    await undoBlockChange(started);
    w = await lightWorkout();
    expect(w.sets).toEqual(full);
    expect((await lightWeekSessionIds()).size).toBe(0);
  });

  it("a finished block's light week still counts as light after NEXT BLOCK; UNDO of NEXT keeps it", async () => {
    await startBlock({ weeks: 4 });
    const w = await lightWorkout();
    await completeWorkout(w.day.id, w.s.id, "STANDARD", "PARTIAL");
    vi.setSystemTime(at(2027, 0, 3));
    const next = await nextBlock();
    expect((await lightWeekSessionIds()).has(w.s.id)).toBe(true);
    await undoBlockChange(next);
    expect((await lightWeekSessionIds()).has(w.s.id)).toBe(true);
  });

  it("START A BLOCK after a finished block keeps that block's light week out of progression, and carries its lighter starts", async () => {
    await startBlock({ weeks: 4 });
    const w = await lightWorkout();
    await completeWorkout(w.day.id, w.s.id, "STANDARD", "PARTIAL");
    vi.setSystemTime(at(2027, 0, 3));
    await acceptBlockSuggestion({ id: "DROP:leg-press", kind: "DROP", exerciseId: "leg-press", percent: 10, text: "", why: "" });
    expect((await lightWeekSessionIds()).has(w.s.id)).toBe(true);
    await startBlock({ weeks: 5 });
    expect((await lightWeekSessionIds()).has(w.s.id)).toBe(true);
    vi.setSystemTime(at(2027, 0, 5));
    expect(await blockStartWeight("leg-press", 100, 10)).toBe(90);
  });

  it("an accepted lighter start applies to the next block only, once", async () => {
    await startBlock({ weeks: 4 });
    vi.setSystemTime(at(2027, 0, 3));
    await acceptBlockSuggestion({ id: "DROP:leg-press", kind: "DROP", exerciseId: "leg-press", percent: 10, text: "", why: "" });
    expect(await blockStartWeight("leg-press", 100, 10)).toBeNull();
    await nextBlock();
    vi.setSystemTime(at(2027, 0, 5));
    expect(await blockStartWeight("leg-press", 100, 10)).toBe(90);
    const day = await startDay();
    const s = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    await logSet(day.id, s.id, "leg-press", 1, 90, 10);
    expect(await blockStartWeight("leg-press", 100, 10)).toBeNull();
    await completeWorkout(day.id, s.id, "STANDARD", "PARTIAL");
    vi.setSystemTime(at(2027, 1, 1));
    await nextBlock();
    vi.setSystemTime(at(2027, 1, 3));
    expect(await blockStartWeight("leg-press", 100, 10)).toBeNull();
  });

  it("fewer days needs two weeks run and the same day skipped twice", () => {
    const base: BlockReviewInput = { settings: DEFAULT_BLOCK_SETTINGS, focus: [], mainLifts: [], stalls: [], weight: null, focusSets: [],
      sessions: { done: 0, planned: 2, skippedByWeekday: { "4": 1, "6": 1 }, weeksRun: 1 } };
    expect(buildBlockReview(base).suggestions).toEqual([]);
    expect(buildBlockReview({ ...base, sessions: { done: 1, planned: 6, skippedByWeekday: { "4": 2 }, weeksRun: 2 } }).suggestions.map((x) => x.kind)).toEqual(["FEWER_DAYS"]);
  });
});
