import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureItem, resolveCaptureItem, startDay, updateSchedulePattern } from "../../src/application/commands";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { getWorkRunDraft, runBlock } from "../../src/application/workRunPlan";
import { getWeekPlanner, type PlannerDay } from "../../src/application/weekPlannerQueries";
import { describeRedraftReason, detectWorkRunChange, getWorkRunRedraftOffer, parseWorkRunNote, type SavedRunNote } from "../../src/application/workRunRedraft";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import type { Recommendation } from "../../src/domain/common/types";
import { db } from "../../src/persistence/db";

const { id: _id, createdAt: _c, updatedAt: _u, ...ROTATION } = DEFAULT_SCHEDULE_PATTERN;
const day = (n: number, work: "WORK" | "OFF", basis: PlannerDay["basis"] = "PREDICTED", hour: number | null = work === "WORK" ? 18 : null): PlannerDay =>
  ({ date: `2026-11-${15 + n}`, work, basis, shiftStartHour: hour, tasks: [], events: [], workout: { basis: "UNASSIGNED", label: "" } } as unknown as PlannerDay);
const days = [day(0, "WORK"), day(1, "WORK"), day(2, "OFF"), day(3, "OFF"), day(4, "WORK"), day(5, "WORK"), day(6, "OFF")];
const noteText = ["Work-run plan · 2026-11-15 to 2026-11-18", "Draft snapshot…", "", "2026-11-15 — Work (saved schedule forecast) · starts 18:00", "Training: x",
  "", "2026-11-16 — Work (saved schedule forecast) · starts 18:00", "", "2026-11-17 — Day off (saved schedule forecast)", "", "2026-11-18 — Day off (confirmed change)"].join("\n");
const note = parseWorkRunNote({ id: "note", text: noteText, capturedAt: "2026-11-15T18:00:00.000Z" })!;
const rec = (streak: boolean, issuedAt: string) => ({ id: `rec-${issuedAt}`, issuedAt, trace: { inputs: [{ key: "shortSleepStreak", value: streak }] } } as unknown as Recommendation);

it("reads the saved note's own day lines; non-plan notes and fully edited notes are not compared", () => {
  expect(note.days).toEqual([
    { date: "2026-11-15", work: "WORK", startHour: 18 }, { date: "2026-11-16", work: "WORK", startHour: 18 },
    { date: "2026-11-17", work: "OFF", startHour: null }, { date: "2026-11-18", work: "OFF", startHour: null }]);
  expect(parseWorkRunNote({ id: "x", text: "Groceries\n2026-11-15 — Work (x)", capturedAt: "" })).toBeNull();
  expect(parseWorkRunNote({ id: "x", text: "Work-run plan · my own words only", capturedAt: "" })).toBeNull();
});

it("no offer when nothing changed, only basis changed, or the saved dates are past or unknown now", () => {
  expect(detectWorkRunChange(note, days, null)).toBeNull();
  const recorded = days.map((d) => ({ ...d, basis: "RECORDED" as const }));
  expect(detectWorkRunChange(note, recorded, null)).toBeNull();
  const unknown = structuredClone(days); unknown[2] = day(2, "WORK", "UNKNOWN"); unknown[3] = day(3, "WORK", "WHAT_IF");
  expect(detectWorkRunChange(note, unknown, null)).toBeNull();
  // A later week: every saved date is in the past.
  const later = days.map((d, n) => ({ ...d, date: `2026-11-${19 + n}`, work: "WORK" as const }));
  expect(detectWorkRunChange(note, later, null)).toBeNull();
  // Yesterday's change is history, not a reason to redraft: start Week planner on the 17th.
  const fromThe17th = structuredClone(days).slice(2); const past = { ...note, days: [{ date: "2026-11-16", work: "OFF" as const, startHour: null }, ...note.days.slice(2)] };
  expect(detectWorkRunChange(past, fromThe17th, null)).toBeNull();
  expect(detectWorkRunChange(null, days, rec(true, "2026-11-16T00:00:00.000Z"))).toBeNull();
});

it("a confirmed extra shift, a dropped shift or a moved start on a covered date offers a fresh draft", () => {
  const extra = structuredClone(days); extra[2] = day(2, "WORK", "CONFIRMED");
  const offer = detectWorkRunChange(note, extra, null)!;
  expect(offer.reasons).toHaveLength(1);
  expect(describeRedraftReason(offer.reasons[0]!)).toBe("2026-11-17: your note says Day off; now Work from 18:00 (confirmed change).");
  const moved = structuredClone(days); moved[1] = day(1, "WORK", "PREDICTED", 6); moved[0] = day(0, "OFF", "RECORDED");
  const both = detectWorkRunChange(note, moved, null)!;
  expect(both.reasons.map(describeRedraftReason)).toEqual([
    "2026-11-15: your note says Work from 18:00; now Day off (recorded).",
    "2026-11-16: your note says Work from 18:00; now Work from 06:00 (saved schedule)."]);
  expect(both.fingerprint).not.toBe(offer.fingerprint);
});

it("two short main sleeps count only when that guidance was issued after the note was saved", () => {
  expect(detectWorkRunChange(note, days, rec(false, "2026-11-16T00:00:00.000Z"))).toBeNull();
  expect(detectWorkRunChange(note, days, rec(true, "2026-11-15T17:00:00.000Z"))).toBeNull();
  const offer = detectWorkRunChange(note, days, rec(true, "2026-11-16T00:00:00.000Z"))!;
  expect(offer.reasons).toEqual([{ kind: "SHORT_SLEEP", recommendationId: "rec-2026-11-16T00:00:00.000Z", issuedAt: "2026-11-16T00:00:00.000Z" }]);
  expect(describeRedraftReason(offer.reasons[0]!)).toContain("Two short main sleeps");
  const past: SavedRunNote = { ...note, days: [{ date: "2026-11-14", work: "WORK", startHour: 18 }] };
  expect(detectWorkRunChange(past, days, rec(true, "2026-11-16T00:00:00.000Z"))).toBeNull();
});

describe("against the real local store", () => {
  const now = new Date(2026, 10, 1, 12);
  beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await db.open(); await updateSchedulePattern(ROTATION); });
  afterEach(() => { db.close(); vi.useRealTimers(); });

  it("a saved draft makes no offer; a later confirmed extra shift on one of its days off does; reading writes nothing", async () => {
    expect(await getWorkRunRedraftOffer(now)).toBeNull();
    const draft = await getWorkRunDraft(now);
    await captureItem(draft.text!);
    const before = await Promise.all(db.tables.map((t) => t.count()));
    expect(await getWorkRunRedraftOffer(now)).toBeNull();
    expect(await Promise.all(db.tables.map((t) => t.count()))).toEqual(before);
    const block = runBlock((await getWeekPlanner(now)).days);
    const off = block.find((d) => d.work === "OFF" && d.date > block[0]!.date)!;
    expect(off).toBeTruthy();
    await confirmScheduleException({ date: off.date, kind: "WORK" }, now);
    const offer = await getWorkRunRedraftOffer(now);
    expect(offer?.reasons).toEqual([expect.objectContaining({ kind: "WORK_CHANGED", date: off.date, now: expect.objectContaining({ work: "WORK", basis: "CONFIRMED" }) })]);
    // Saving the fresh draft is the only way the offer ends (besides NOT NOW): nothing rewrites the old note.
    const old = (await db.captureItems.toArray()).map((i) => i.text);
    vi.setSystemTime(new Date(2026, 10, 1, 12, 5));
    await captureItem((await getWorkRunDraft(new Date(2026, 10, 1, 12, 5))).text!);
    expect(await getWorkRunRedraftOffer(new Date(2026, 10, 1, 12, 5))).toBeNull();
    const texts = (await db.captureItems.toArray()).map((i) => i.text);
    expect(texts).toHaveLength(old.length + 1);
    expect(texts).toEqual(expect.arrayContaining(old));
  });

  it("a note set aside in Capture, and guidance with the short-sleep fact, follow the rules", async () => {
    const saved = await captureItem((await getWorkRunDraft(now)).text!);
    const active = await startDay();
    const trace = { engineVersion: "t", evaluatedAt: "", inputs: [{ key: "shortSleepStreak", value: true }], derived: [], matchedRules: [], selectedRecommendation: "NO_ACTION_REQUIRED", selectionReason: "" };
    await db.recommendations.add({ id: "r1", beyondDayId: active.id, issuedAt: new Date(2026, 10, 1, 13).toISOString(), kind: "NO_ACTION_REQUIRED", priority: 0, title: "", rationale: "", suggestedCommand: null, trace, statusAtIssue: "NO_ACTION_REQUIRED" } as unknown as Recommendation);
    expect((await getWorkRunRedraftOffer(now))?.reasons.map((r) => r.kind)).toEqual(["SHORT_SLEEP"]);
    await resolveCaptureItem(saved.id);
    expect(await getWorkRunRedraftOffer(now)).toBeNull();
  });
});
