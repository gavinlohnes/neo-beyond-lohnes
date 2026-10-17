import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, logProtein, endDay } from "../../src/application/commands";
import { saveWeeklyReview } from "../../src/application/weeklyReviewCommands";
import { getWeeklyReviewState, getWeeklyReviewRecords, getWeeklyReviewReadiness } from "../../src/application/weeklyReviewQueries";
import { latestReviewWeek } from "../../src/engine/weeklyReview";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import "dexie-export-import";
const monday = new Date(2026, 9, 19, 20);
function clock(at = monday) { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(at); }
const input = () => { const week = latestReviewWeek(new Date()); return { weekStart: week.start, weekEnd: week.end, note: "A quiet week", focus: { kind: "PROTEIN_DAYS" as const, target: 3, text: "Record protein on 3 days" }, expectedPreviousId: null }; };
afterEach(() => vi.useRealTimers());
it("saves once, revises append-only, rejects stale competing writes and leaves Engine recommendations unchanged", async () => {
  clock(); await startDay(); const recommendations = await db.recommendations.toArray();
  const id = await saveWeeklyReview(input()); expect(await saveWeeklyReview(input())).toBe(id);
  const next = await saveWeeklyReview({ ...input(), note: "Corrected note", expectedPreviousId: id });
  expect(next).not.toBe(id);
  await expect(saveWeeklyReview({ ...input(), note: "Stale overwrite", expectedPreviousId: id })).rejects.toThrow("changed elsewhere");
  const records = await getWeeklyReviewRecords(); expect(records).toHaveLength(2);
  expect(records[0]).toMatchObject({ id: next, note: "Corrected note", supersedes: id });
  expect(records[1]!.note).toBe("A quiet week");
  expect(await db.recommendations.toArray()).toEqual(recommendations);
});
it("serializes concurrent first saves to one owner", async () => {
  clock(); await startDay();
  const outcomes = await Promise.allSettled([saveWeeklyReview(input()), saveWeeklyReview({ ...input(), note: "Different first note" })]);
  expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(await getWeeklyReviewRecords()).toHaveLength(1);
});
it("rejects invalid/expired periods and invalid focus without any review write", async () => {
  clock(); await startDay();
  await expect(saveWeeklyReview({ ...input(), weekStart: new Date(2026, 9, 5, 16, 30).toISOString(), weekEnd: new Date(2026, 9, 12, 16, 30).toISOString() })).rejects.toThrow("week changed");
  await expect(saveWeeklyReview({ ...input(), focus: { kind: "WEIGHT_DAYS", target: 8, text: "Eight days" } })).rejects.toThrow();
  expect(await getWeeklyReviewRecords()).toEqual([]);
});
it("carries a chosen focus into the following closed week as a count, not a verdict", async () => {
  clock(); await startDay(); await saveWeeklyReview(input());
  for (const date of [20, 21, 23]) { await endDay((await db.beyondDays.where("status").equals("ACTIVE").first())!.id); vi.setSystemTime(new Date(2026, 9, date, 20)); const day = await startDay(); await logProtein(day.id, 30); }
  await endDay((await db.beyondDays.where("status").equals("ACTIVE").first())!.id);
  vi.setSystemTime(new Date(2026, 9, 26, 20)); await startDay();
  const state = await getWeeklyReviewState();
  expect(state.previousFocus?.kind).toBe("PROTEIN_DAYS"); expect(state.previousFocusCount).toBe(3); expect(state.saved).toBeUndefined();
  expect((await getWeeklyReviewReadiness()).ready).toBe(true);
});
it("round-trips notes, revisions and focus through the ordinary native backup", async () => {
  clock(); await startDay(); const id = await saveWeeklyReview(input());
  await saveWeeklyReview({ ...input(), note: "Revised before backup", expectedPreviousId: id });
  const blob = await db.export({ prettyJson: true });
  const file = new File([blob], "weekly-review-backup.json", { type: "application/json" });
  await previewAnyRestore(file);
  await db.events.where("type").equals("WEEKLY_REVIEW_SAVED").delete();
  await applyAnyRestore(file);
  const records = await getWeeklyReviewRecords();
  expect(records).toHaveLength(2); expect(records[0]!.note).toBe("Revised before backup");
  expect(records[0]!.focus?.text).toBe("Record protein on 3 days");
});
it("rolls back a storage failure and permits a single successful retry", async () => {
  clock(); await startDay(); const before = await db.events.toArray();
  const fail = (_key: unknown, event: { type?: string }) => { if (event.type === "WEEKLY_REVIEW_SAVED") throw new Error("Synthetic review storage failure"); };
  db.events.hook("creating", fail);
  try { await expect(saveWeeklyReview(input())).rejects.toThrow("Synthetic review storage failure"); }
  finally { db.events.hook("creating").unsubscribe(fail); }
  expect(await db.events.toArray()).toEqual(before);
  await saveWeeklyReview(input()); expect(await getWeeklyReviewRecords()).toHaveLength(1);
});
it("does not treat a malformed saved review as an unsaved/empty week", async () => {
  clock(); const day = await startDay();
  await db.events.add({ id: "malformed-review", correlationId: "malformed-review", type: "WEEKLY_REVIEW_SAVED", beyondDayId: day.id, occurredAt: new Date().toISOString(), recordedAt: new Date().toISOString(), payload: null, source: "USER" });
  await expect(getWeeklyReviewState()).rejects.toThrow("could not be read");
  await expect(getWeeklyReviewReadiness()).rejects.toThrow("could not be read");
});
it("requires an active owning day without silently starting one", async () => {
  clock(); await expect(saveWeeklyReview(input())).rejects.toThrow("Start your day");
  expect(await db.beyondDays.count()).toBe(0); expect(await db.events.count()).toBe(0);
});
