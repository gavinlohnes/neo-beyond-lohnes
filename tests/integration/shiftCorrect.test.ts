import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { completeShiftDown, markWorkEnded, markWorkStarted, retimeWorkMark, setWorkContext, startDay, startShiftDown, updateSchedulePattern, voidWorkMark } from "../../src/application/commands";
import { getSleepDraftEvidence, getWorkMarks, getWorkPeriodEnded, hasUnresolvedPostShift } from "../../src/application/queries";
import { confirmProposal, describeConfirmError, describeProposal, describeProposalNote, toProposal, type AlfredProposal } from "../../src/application/alfred/alfredActions";
import { resolveProposal } from "../../src/application/alfred/alfredTools";
import { confirmContextProposal } from "../../src/application/alfred/contextActions";
import { buildPlanningContext } from "../../src/application/alfred/personalContext";
import { interpret } from "../../src/application/helper/freeHelper";
import { readHelperContext } from "../../src/application/helper/helperContext";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getShiftMarkView } from "../../src/application/shiftMarks";
import { IFTTT_CONFIG_KEY } from "../../src/application/iftttAutomations";
import { describeEvent } from "../../src/ui/screens/history/historyCopy";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";

/**
 * SHIFT-CORRECT-001 (Gavin, 2026-11-15: "Yes, amend WORK TRANSITION to allow explicit shift start/end corrections").
 * His screenshot: WORK ENDED at 04:20, then at 04:21 "Im still working till 0600. Fix my log". Invented data otherwise.
 * The lived day opened Sat Nov 14 2026 16:30 local.
 */
const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const iso = (d: number, h: number, m = 0) => at(d, h, m).toISOString();
const store = new Map<string, string>();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear() });
  store.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  vi.setSystemTime(at(1, 12)); await updateSchedulePattern(ROTATION);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

/** Sat 17:00 start the day as a work day, 18:02 WORK STARTED, Sun 04:20 WORK ENDED, then 04:21. */
async function screenshotNight() {
  vi.setSystemTime(at(14, 17));
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  vi.setSystemTime(at(14, 18, 2)); await markWorkStarted(day.id);
  vi.setSystemTime(at(15, 4, 20)); await markWorkEnded(day.id);
  vi.setSystemTime(at(15, 4, 21));
  return day;
}
async function card(input: Record<string, unknown>): Promise<AlfredProposal | string> {
  const p = toProposal("shift_fix", input);
  if (!p) return "UNUSABLE";
  return resolveProposal(p, new Date());
}
const ok = (c: AlfredProposal | string) => { if (typeof c === "string") throw new Error(`expected a card, got: ${c}`); return c; };

describe("the screenshot: still working after WORK ENDED", () => {
  it("the free helper reads 'Im still working till 0600. Fix my log' as Reopen shift, and the day reads the reopened shift", async () => {
    const day = await screenshotNight();
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
    const r = interpret("Im still working till 0600. Fix my log", await readHelperContext(new Date()));
    expect(r.unknown).toEqual([]);
    expect(r.cards).toHaveLength(1);
    const c = r.cards[0]!;
    expect(describeProposal(c)).toBe("Reopen shift (marked ended 04:20) · working till 06:00");
    expect(describeProposalNote(c)).toMatch(/WORK ENDED again/);
    expect(describeProposalNote(c)).not.toMatch(/automation/);

    await confirmContextProposal(c, await buildPlanningContext(false), false);
    expect(await getWorkPeriodEnded(day.id)).toBeUndefined();
    expect(await hasUnresolvedPostShift(day.id)).toBe(false);
    expect((await getSleepDraftEvidence(day.id, new Date())).anchorKind).not.toBe("WORK_ENDED");
    // The original stays in HISTORY, named by the correction.
    const types = (await db.events.where("beyondDayId").equals(day.id).toArray()).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(["WORK_PERIOD_ENDED", "WORK_PERIOD_VOIDED"]));
    const voided = (await db.events.where("type").equals("WORK_PERIOD_VOIDED").first())!;
    const original = (await db.events.where("type").equals("WORK_PERIOD_ENDED").first())!;
    expect(voided.causationId).toBe(original.id);
    expect(describeEvent(voided)).toBe("Shift reopened (work-ended mark removed).");

    // 06:00: he taps WORK ENDED for real; that is the day's one effective end.
    vi.setSystemTime(at(15, 6));
    expect(await markWorkEnded(day.id)).toBe(true);
    expect(await markWorkEnded(day.id)).toBe(false);
    expect((await getWorkPeriodEnded(day.id))!.occurredAt).toBe(iso(15, 6));
    expect(await hasUnresolvedPostShift(day.id)).toBe(true);
    const summary = (await getDaySummaries()).find((s) => s.beyondDayId === day.id)!;
    expect(summary.work.workEndedAt).toBe(iso(15, 6));
  });

  it("Alfred's tool: an end later than now is refused with the way forward; reopen is the card", async () => {
    await screenshotNight();
    expect(await card({ action: "move_end", time: "06:00" })).toMatch(/hasn't happened yet.*reopen/);
    const c = ok(await card({ action: "reopen", until: "06:00" }));
    expect(describeProposal(c)).toBe("Reopen shift (marked ended 04:20) · working till 06:00");
    expect(toProposal("shift_fix", { action: "move_end" })).toBeNull();
    expect(toProposal("shift_fix", { action: "erase" })).toBeNull();
  });

  it("with the work-ended phone automation on, the card says it already ran and can't be taken back", async () => {
    await screenshotNight();
    store.set(IFTTT_CONFIG_KEY, JSON.stringify({ enabled: true, key: "k", events: ["work_ended"], includeValue: [] }));
    const c = ok(await card({ action: "reopen" }));
    expect(describeProposalNote(c)).toMatch(/already ran when it was marked; this can't take that back/);
    expect((await getShiftMarkView(c.kind === "shift_fix" ? c.day_id! : ""))!.endAutomationOn).toBe(true);
  });
});

describe("moving a recorded time", () => {
  it("'I got off at 03:50' moves the end; queries, the ledger and the sleep anchor read the corrected time", async () => {
    const day = await screenshotNight();
    const r = interpret("I got off at 03:50", await readHelperContext(new Date()));
    const c = r.cards[0]!;
    expect(describeProposal(c)).toBe("Shift end 04:20 → 03:50");
    await confirmProposal(c);
    const ended = (await getWorkPeriodEnded(day.id))!;
    expect(ended).toMatchObject({ occurredAt: iso(15, 3, 50), originalAt: iso(15, 4, 20), retimed: true });
    expect((await getSleepDraftEvidence(day.id, new Date())).anchorAt).toBe(iso(15, 3, 50));
    expect((await getDaySummaries()).find((s) => s.beyondDayId === day.id)!.work.workEndedAt).toBe(iso(15, 3, 50));
    const retimed = (await db.events.where("type").equals("WORK_PERIOD_RETIMED").first())!;
    expect(describeEvent(retimed)).toBe("Shift end corrected to 03:50.");
  });

  it("Alfred moves the start; a card made before the mark changed is refused", async () => {
    const day = await screenshotNight();
    const c = ok(await card({ action: "move_start", time: "17:45" }));
    expect(describeProposal(c)).toBe("Shift start 18:02 → 17:45");
    const ctx = await buildPlanningContext(false);
    await retimeWorkMark(day.id, "STARTED", iso(14, 17, 50));
    await expect(confirmContextProposal(c, ctx, false)).rejects.toThrow("CONTEXT_CHANGED");
    expect((await getWorkMarks(day.id)).started!.occurredAt).toBe(iso(14, 17, 50));
  });

  it("validation: inside the lived day, never later than now, start before end; a no-op writes nothing", async () => {
    const day = await screenshotNight();
    await expect(retimeWorkMark(day.id, "ENDED", iso(15, 6))).rejects.toThrow("WORK_MARK_AHEAD");
    await expect(retimeWorkMark(day.id, "ENDED", iso(14, 15))).rejects.toThrow("LOG_TIME_OUTSIDE_DAY");
    await expect(retimeWorkMark(day.id, "ENDED", iso(14, 18))).rejects.toThrow("WORK_MARK_ORDER");
    await expect(retimeWorkMark(day.id, "STARTED", iso(15, 4, 30))).rejects.toThrow("WORK_MARK_AHEAD");
    await expect(retimeWorkMark(day.id, "STARTED", iso(15, 4, 20))).rejects.toThrow("WORK_MARK_ORDER");
    await expect(voidWorkMark(day.id, "STARTED")).rejects.toThrow("WORK_MARK_ORDER");
    expect(await retimeWorkMark(day.id, "ENDED", iso(15, 4, 20))).toBe(false);
    expect(await db.events.where("type").anyOf("WORK_PERIOD_RETIMED", "WORK_PERIOD_VOIDED").count()).toBe(0);
    expect(describeConfirmError(new Error("WORK_MARK_AHEAD: a shift end can't be later than now."))).toBe("A shift end can't be later than now. Nothing changed.");
    expect(await card({ action: "move_end", time: "17:00" })).toMatch(/after its start/);
    expect(await card({ action: "move_end", time: "04:20" })).toMatch(/already 04:20/);
  });

  it("reopen is for the active work day only, and needs an end; remove start needs no end", async () => {
    const day = await screenshotNight();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await expect(voidWorkMark(day.id, "ENDED")).rejects.toThrow("NOT_AN_ACTIVE_WORK_DAY");
    expect(await card({ action: "reopen" })).toMatch(/isn't set as a work day/);
    await setWorkContext(day.id, "WORK", "MANUAL");
    expect(await card({ action: "remove_start" })).toMatch(/reopen it first/);
    expect(await voidWorkMark(day.id, "ENDED")).toBe(true);
    expect(await voidWorkMark(day.id, "ENDED")).toBe(false);
    expect(await card({ action: "reopen" })).toMatch(/nothing to reopen/);
    const remove = ok(await card({ action: "remove_start" }));
    expect(describeProposal(remove)).toBe("Remove shift start (18:02)");
    await confirmProposal(remove);
    expect(await getWorkMarks(day.id)).toEqual({});
  });

  it("a shift-down after the corrected end still clears post-shift", async () => {
    const day = await screenshotNight();
    const started = await startShiftDown(day.id, 15);
    vi.setSystemTime(at(15, 4, 40)); await completeShiftDown(day.id, started);
    expect(await hasUnresolvedPostShift(day.id)).toBe(false);
    await retimeWorkMark(day.id, "ENDED", iso(15, 4));
    expect(await hasUnresolvedPostShift(day.id)).toBe(false);
  });
});

describe("backup", () => {
  it("corrections survive a real export → restore round trip, and the day reads the same", async () => {
    const day = await screenshotNight();
    await retimeWorkMark(day.id, "STARTED", iso(14, 17, 45));
    await voidWorkMark(day.id, "ENDED");
    const before = await getWorkMarks(day.id);
    const blob = await db.export({ prettyJson: true });
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    await applyAnyRestore(new File([blob], "beyond-backup.json", { type: "application/json" }));
    expect(await getWorkMarks(day.id)).toEqual(before);
    expect(before.started!.occurredAt).toBe(iso(14, 17, 45));
    expect(before.ended).toBeUndefined();
  });
});
