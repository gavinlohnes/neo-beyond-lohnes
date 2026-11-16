import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { logBodyweight, startDay, updateSchedulePattern } from "../../src/application/commands";
import { getHydrationEntries, getMostRecentBodyweight, getSleepEntries } from "../../src/application/queries";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { interpret } from "../../src/application/helper/freeHelper";
import { buildPlanningContext } from "../../src/application/alfred/personalContext";
import { confirmContextProposal, type ProposalContext } from "../../src/application/alfred/contextActions";
import { describeConfirmError, type AlfredProposal } from "../../src/application/alfred/alfredActions";
import { MAX_AT_ONCE, OVER_CAP_NOTE, heldNotes, helperSummary, planAct, runImmediate, undoAct, type ActResult } from "../../src/application/alfred/alfredAct";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * ALFRED-MULTI-001: one message, several records. Each is its own registry card in the order he said them; the clear
 * low-risk ones run at once (ALFRED-ACT-001's rule, unchanged), each with its own UNDO; the rest wait for SAVE. At most
 * MAX_AT_ONCE run at once per message; a card that didn't save says why, and nothing writes twice. Invented data.
 * Sun Nov 15 2026 04:21 local; the lived day opened Sat 16:30. Run under TZ=UTC and TZ=America/Chicago.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  vi.setSystemTime(new Date(2026, 10, 1, 12)); await updateSchedulePattern(ROTATION);
  vi.setSystemTime(new Date(2026, 10, 14, 17, 0)); await startDay();
  vi.setSystemTime(new Date(2026, 10, 15, 4, 21));
});
afterEach(() => { vi.useRealTimers(); });

const ctxNow = async (): Promise<ProposalContext> => { const c = await buildPlanningContext(false); return { recordVersion: c.recordVersion, personalVersion: c.personalVersion, actionVersion: c.actionVersion, taskVersions: c.taskVersions, routineVersions: c.routineVersions }; };
const cards = (...ps: AlfredProposal[]) => ps.map((proposal, n) => ({ id: `c${n}`, proposal }));
const dayId = async () => (await db.beyondDays.toCollection().last())!.id;
const water = async () => (await getHydrationEntries(await dayId())).reduce((s, e) => s + e.effectiveAmountOz, 0);

describe("planning one message (pure)", () => {
  it("the free helper keeps every part, in the order he said them", async () => {
    await logBodyweight(await dayId(), 182);
    const r = interpret("drank 16 oz water, weighed 181, slept 7h and remind me to call mum tomorrow", await readHelperContext());
    expect(r.unknown).toEqual([]);
    expect(r.cards.map((c) => c.kind)).toEqual(["log_water", "log_weight", "log_sleep", "add_reminder"]);
  });

  it("an unclear part is kept word for word (asked about), never guessed; nothing of that message runs at once", async () => {
    const r = interpret("drank 16 oz water, coffee, slept 7h", await readHelperContext());
    expect(r.unknown).toEqual(["coffee"]);
    expect(r.cards.map((c) => c.kind)).toEqual(["log_water", "log_sleep"]);
    const plan = await planAct(cards(...r.cards), "helper", { understoodAll: false });
    expect(plan.ids.size).toBe(0);
  });

  it("the one line for the message", () => {
    expect(helperSummary(0, 0, false, false)).toBe("Nothing to save yet.");
    expect(helperSummary(1, 1, false, false)).toBe("Logged. UNDO within 10 seconds if that's wrong.");
    expect(helperSummary(3, 3, false, false)).toBe("Logged all 3. UNDO any of them within 10 seconds.");
    expect(helperSummary(4, 2, false, false)).toBe("Logged 2 at once (UNDO within 10 seconds). SAVE the others you want.");
    expect(helperSummary(4, 1, true, false)).toContain("One didn't save; it says why below.");
    expect(helperSummary(6, 0, false, true)).toBe(OVER_CAP_NOTE);
    expect(OVER_CAP_NOTE).toContain(`more than ${MAX_AT_ONCE}`);
    expect(helperSummary(2, 0, false, false)).toBe("Here's what I can do for free. SAVE the ones you want.");
  });

  it("held notes: the one that stopped says why; the ones after it wait; earlier ones and confirm cards say nothing", () => {
    const list = cards({ kind: "log_water", oz: 8 }, { kind: "log_sleep", minutes: 420, nap: false }, { kind: "log_water", oz: 12 }, { kind: "log_water", oz: 20 });
    const ids = new Set(["c0", "c2", "c3"]);
    const acted: ActResult = { done: { c0: { window: { until: 0 } } }, context: { personalVersion: "", actionVersion: "", taskVersions: {} }, stopped: { id: "c2", error: new Error("WORKOUT_NOT_ACTIVE: there's no workout in progress") } };
    const notes = heldNotes(list, ids, acted, describeConfirmError);
    expect(Object.keys(notes)).toEqual(["c2", "c3"]);
    expect(notes.c2).toBe("Not logged: There's no workout in progress. Nothing changed.");
    expect(notes.c3).toContain("Not logged yet, because the one before it didn't save");
    expect(heldNotes(list, ids, { ...acted, stopped: { id: "c0", error: new Error("CONTEXT_CHANGED") } }, describeConfirmError).c0).toContain("your records changed");
    expect(heldNotes(list, ids, { done: acted.done, context: acted.context }, describeConfirmError)).toEqual({});
  });
});

describe("running one message", () => {
  it("water and weight run at once, each with its own UNDO; sleep and the reminder wait for SAVE", async () => {
    await logBodyweight(await dayId(), 182);
    const r = interpret("drank 16 oz water, weighed 181, slept 7h and remind me to call mum tomorrow", await readHelperContext());
    const list = cards(...r.cards);
    const plan = await planAct(list, "helper", { understoodAll: true });
    expect(plan).toEqual({ ids: new Set(["c0", "c1"]), overCap: false });
    const acted = await runImmediate(list, plan.ids, await ctxNow(), false);
    expect(Object.keys(acted.done)).toEqual(["c0", "c1"]);
    expect(acted.stopped).toBeUndefined();
    expect(await water()).toBe(16);
    expect(await getMostRecentBodyweight()).toBe(181);
    expect(await getSleepEntries(await dayId())).toEqual([]);
    // UNDO one: only that one is taken back.
    expect(await undoAct(acted.done.c1!.undo!, acted.done.c1!.window)).toBe("UNDONE");
    expect(await getMostRecentBodyweight()).toBe(182);
    expect(await water()).toBe(16);
    // The cards that wait still save against the context his own writes advanced.
    await confirmContextProposal(list[2]!.proposal, { ...acted.context, recordVersion: (await ctxNow()).recordVersion! }, false);
    expect((await getSleepEntries(await dayId())).length).toBe(1);
  });

  it(`at most ${MAX_AT_ONCE} run at once from one message; more and none run at once (all stay cards)`, async () => {
    const five = cards(...[4, 6, 8, 10, 12].map((oz) => ({ kind: "log_water", oz }) as AlfredProposal));
    const ok = await planAct(five, "helper", { understoodAll: true });
    expect(ok.ids.size).toBe(5);
    const six = cards(...[4, 6, 8, 10, 12, 14].map((oz) => ({ kind: "log_water", oz }) as AlfredProposal));
    const over = await planAct(six, "helper", { understoodAll: true });
    expect(over).toEqual({ ids: new Set(), overCap: true });
    // Confirm cards don't count toward the cap.
    const mixed = cards(...[4, 6, 8, 10, 12].map((oz) => ({ kind: "log_water", oz }) as AlfredProposal), { kind: "log_sleep", minutes: 420, nap: false }, { kind: "capture_note", text: "x" });
    expect((await planAct(mixed, "alfred", { understoodAll: true })).ids.size).toBe(5);
    const acted = await runImmediate(five, ok.ids, await ctxNow(), false);
    expect(Object.keys(acted.done)).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    expect(await water()).toBe(40);
  });

  it("order is kept, and a refusal mid-message stops there: earlier writes stay, later ones wait, nothing is silent", async () => {
    const list = cards({ kind: "log_water", oz: 8 }, { kind: "log_set", session_id: "gone", exercise_id: "x", exercise_name: "Bench", weight: 135, reps: 8 }, { kind: "log_water", oz: 12 });
    const ids = new Set(["c0", "c1", "c2"]);
    const acted = await runImmediate(list, ids, await ctxNow(), false);
    expect(Object.keys(acted.done)).toEqual(["c0"]);
    expect(acted.stopped?.id).toBe("c1");
    expect(await water()).toBe(8);
    const notes = heldNotes(list, ids, acted, describeConfirmError);
    expect(notes.c1).toMatch(/^Not logged: /);
    expect(notes.c2).toContain("Not logged yet");
    // The water that waited still saves on its own with the context after his write.
    await confirmContextProposal(list[2]!.proposal, acted.context, false);
    expect(await water()).toBe(20);
  });

  it("no double write: the same message replayed against its old records writes nothing more", async () => {
    const list = cards({ kind: "log_water", oz: 16 }, { kind: "log_water", oz: 8 });
    const ctx = await ctxNow();
    const plan = await planAct(list, "helper", { understoodAll: true });
    const first = await runImmediate(list, plan.ids, ctx, false);
    expect(Object.keys(first.done)).toEqual(["c0", "c1"]);
    const again = await runImmediate(list, plan.ids, ctx, false);
    expect(again.done).toEqual({});
    expect((again.stopped?.error as Error).message).toBe("CONTEXT_CHANGED");
    expect(await water()).toBe(24);
    // Word-for-word repeats in one message never run at once (ALFRED-ACT-001 rule 3).
    expect((await planAct(cards({ kind: "log_water", oz: 16 }, { kind: "log_water", oz: 16 }), "helper", { understoodAll: true })).ids.size).toBe(0);
  });
});
