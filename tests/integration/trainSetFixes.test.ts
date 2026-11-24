import "dexie-export-import";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDay, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, skipSet, startWorkout, undoLastSet } from "../../src/application/trainCommands";
import { addSetToSession, correctSet, removeSet, undoSetFix } from "../../src/application/trainFixCommands";
import { getPerformedSets, getProgressionSuggestion, suggestTemplateForNextWorkout } from "../../src/application/trainQueries";
import { getWorkoutRecap, getWorkoutSessionRecord } from "../../src/application/trainHistoryQueries";
import { getAllRecords, getBestRecords } from "../../src/application/personalRecordQueries";
import { getWorkoutRecordMismatches } from "../../src/application/workoutIntegrityQueries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getWeeklyDashboard } from "../../src/application/weeklyDashboardQueries";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-TRAIN-EDIT-001: fix any logged set. Both zones (TZ=UTC and America/Chicago); every time here is local.
 */
const CHEST = "machine-chest-press";
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const go = (d: Date) => vi.setSystemTime(d);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  go(at(16, 17));
  localStorage.clear();
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
});
afterEach(() => vi.useRealTimers());

/** A finished A workout on the lived day starting at `day` 16:30, with chest press sets at the given weight×reps. */
async function pastWorkout(day: number, sets: [number, number][], hour = 18) {
  go(at(day, 16, 30));
  const d = await startDay(at(day, 16, 30).toISOString());
  await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  go(at(day, hour));
  const s = await startWorkout(d.id, "A", "STANDARD");
  for (const [i, [w, r]] of sets.entries()) { go(at(day, hour, i + 1)); await logSet(d.id, s.id, CHEST, i + 1, w, r); }
  go(at(day, hour, 30));
  await completeWorkout(d.id, s.id, "STANDARD", "COMPLETED");
  go(at(day + 1, 16, 29));
  await endDay(d.id);
  return { day: d, session: s };
}
const setsOf = async (sessionId: string) => (await getPerformedSets(sessionId)).filter((s) => s.exerciseId === CHEST).sort((a, b) => a.setNumber - b.setNumber);
const best = async () => (await getBestRecords()).find((r) => r.exerciseId === CHEST);

describe("GRAYSON-TRAIN-EDIT-001 set fixes", () => {
  it("a fixed past set shows in the record, recap, progression, PRs, stall-free findings and the weekly page", async () => {
    await pastWorkout(9, [[135, 10], [135, 10], [135, 10]]);
    const { session } = await pastWorkout(16, [[1450, 10], [145, 10], [145, 12]]);
    const nextBefore = await suggestTemplateForNextWorkout();
    // The typo is the PR before the fix.
    expect((await best())!.record).toMatchObject({ weight: 1450 });
    const [first, second] = await setsOf(session.id);

    const fixedFirst = await correctSet(first!.id, { weight: 145, reps: 12, setKind: "WORKING" });
    await correctSet(second!.id, { weight: 145, reps: 12, setKind: "WORKING" });
    const sets = await setsOf(session.id);
    expect(sets.map((s) => [s.weight, s.reps])).toEqual([[145, 12], [145, 12], [145, 12]]);
    expect(sets[0]!.correctsSetId).toBe(first!.id);
    expect(sets[0]!.recordedAt).toBe(first!.recordedAt);

    // Session record carries the fix history and the newest fix.
    const record = (await getWorkoutSessionRecord(session.id))!;
    const row = record.exercises[0]!.sets[0]!;
    expect(row).toMatchObject({ weight: 145, reps: 12, newestFixEventId: fixedFirst.fixEventId });
    expect(row.fixes![0]).toMatchObject({ kind: "CORRECTED", before: { weight: 1450, reps: 10 }, after: { weight: 145, reps: 12 } });

    // Recap, progression, PRs: all read the corrected sets. The typo PR is gone; the real best (145, hidden behind
    // the typo) shows, and all three sets at the top of the range now earn INCREASE.
    expect((await getWorkoutRecap(session.id))!.currentVolume).toBe(3 * 145 * 12);
    expect(await getProgressionSuggestion("A", "STANDARD", CHEST)).toMatchObject({ recommendation: "INCREASE" });
    expect((await best())!.record).toMatchObject({ weight: 145 });
    expect((await getAllRecords()).some((r) => r.record.weight === 1450)).toBe(false);
    const weekly = await getWeeklyDashboard(0, at(17, 12));
    expect(weekly.records.some((r) => r.record.weight === 1450)).toBe(false);
    expect(weekly.findings.findings.filter((f) => f.kind === "STALL")).toEqual([]);

    // A set fix never changes which workout comes next, nor the session's status.
    expect(await suggestTemplateForNextWorkout()).toBe(nextBefore);
    expect((await db.workoutSessions.get(session.id))!.status).toBe("COMPLETED");
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("lands on the workout's own lived day, across midnight, and counts in that day's ledger", async () => {
    const { day, session } = await pastWorkout(16, [[100, 10], [100, 10]], 23);
    go(at(20, 9));
    const today = await startDay(at(19, 16, 30).toISOString());
    const [first, second] = await setsOf(session.id);
    await correctSet(first!.id, { weight: 105, reps: 10, setKind: "WORKING" });
    const removal = await removeSet(second!.id);
    const events = (await db.events.toArray()).filter((e) => e.type.startsWith("SET_") && e.type !== "SET_LOGGED");
    expect(events.every((e) => e.beyondDayId === day.id)).toBe(true);
    let summary = (await getDaySummaries()).find((s) => s.beyondDayId === day.id)!;
    expect(summary.burden).toMatchObject({ trainingSets: 1, corrections: 2 });
    await undoSetFix(removal.fixEventId);
    summary = (await getDaySummaries()).find((s) => s.beyondDayId === day.id)!;
    expect(summary.burden).toMatchObject({ trainingSets: 2, corrections: 3 });
    expect((await getDaySummaries()).find((s) => s.beyondDayId === today.id)!.burden.corrections).toBe(0);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("adds a forgotten set inside the session window, removes a set, and undoes each", async () => {
    const { session } = await pastWorkout(16, [[100, 10], [100, 10]]);
    go(at(18, 12));
    const added = await addSetToSession(session.id, CHEST, { weight: 100, reps: 8, setKind: "WORKING" });
    let sets = await setsOf(session.id);
    expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    const row = sets[2]!;
    const stored = (await db.workoutSessions.get(session.id))!;
    expect(row.recordedAt >= stored.startedAt && row.recordedAt <= stored.endedAt!).toBe(true);
    expect(row.recordedAt > sets[1]!.recordedAt).toBe(true);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
    await undoSetFix(added.fixEventId);
    expect((await setsOf(session.id)).map((s) => s.setNumber)).toEqual([1, 2]);

    const removal = await removeSet(sets[0]!.id);
    sets = await setsOf(session.id);
    expect(sets.map((s) => s.setNumber)).toEqual([2]);
    const record = (await getWorkoutSessionRecord(session.id))!;
    expect(record.exercises[0]!.removed![0]).toMatchObject({ setNumber: 1, removalEventId: removal.fixEventId });
    await undoSetFix(removal.fixEventId);
    expect((await setsOf(session.id)).map((s) => s.setNumber)).toEqual([1, 2]);
    await expect(addSetToSession(session.id, CHEST, { weight: 100, reps: 0 })).rejects.toThrow("Enter at least 1 rep");
  });

  it("fixes a non-last set in the ACTIVE session, then the next set and the last-set undo still work", async () => {
    const d = await startDay(at(16, 16, 30).toISOString());
    await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const s = await startWorkout(d.id, "A", "STANDARD");
    go(at(16, 18, 1)); await logSet(d.id, s.id, CHEST, 1, 100, 10);
    go(at(16, 18, 3)); await logSet(d.id, s.id, CHEST, 2, 100, 10);
    const [first] = await setsOf(s.id);
    await correctSet(first!.id, { weight: 110, reps: 10, setKind: "WORKING" });
    go(at(16, 18, 5)); await logSet(d.id, s.id, CHEST, 3, 110, 9);
    expect((await setsOf(s.id)).map((x) => [x.setNumber, x.weight])).toEqual([[1, 110], [2, 100], [3, 110]]);
    expect(await undoLastSet(d.id, s.id)).toBe(true);
    expect((await setsOf(s.id)).map((x) => x.setNumber)).toEqual([1, 2]);
    expect(await undoLastSet(d.id, s.id)).toBe(true);
    // The corrected set 1 keeps its original place, so the last-set undo took set 2, not it.
    expect((await setsOf(s.id)).map((x) => [x.setNumber, x.weight])).toEqual([[1, 110]]);
    await expect(addSetToSession(s.id, CHEST, { weight: 100, reps: 8 })).rejects.toThrow("Add sets to a finished workout.");
  });

  it("fills in a skipped set", async () => {
    const d = await startDay(at(16, 16, 30).toISOString());
    await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const s = await startWorkout(d.id, "A", "STANDARD");
    await logSet(d.id, s.id, CHEST, 1, 100, 10);
    await skipSet(d.id, s.id, CHEST, 2);
    await completeWorkout(d.id, s.id, "STANDARD", "PARTIAL");
    const skipped = (await setsOf(s.id)).find((x) => x.skipped)!;
    await correctSet(skipped.id, { weight: 100, reps: 9, setKind: "WORKING" });
    expect((await setsOf(s.id)).map((x) => [x.setNumber, x.skipped, x.reps])).toEqual([[1, false, 10], [2, false, 9]]);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });

  it("refuses no-op, stale, removed and invalid fixes with plain messages", async () => {
    const { session } = await pastWorkout(16, [[100, 10], [100, 10]]);
    const [first, second] = await setsOf(session.id);
    await expect(correctSet(first!.id, { weight: 100, reps: 10, setKind: "WORKING" })).rejects.toThrow("Nothing changed.");
    const fix = await correctSet(first!.id, { weight: 105, reps: 10, setKind: "WORKING" });
    await expect(correctSet(first!.id, { weight: 110, reps: 10 })).rejects.toThrow("That set was already changed.");
    await removeSet(second!.id);
    await expect(correctSet(second!.id, { weight: 110, reps: 10 })).rejects.toThrow("That set was removed.");
    await expect(correctSet(fix.performedSetId, { weight: -5, reps: 10 })).rejects.toThrow("Weight must be 0 or more.");
    await expect(correctSet(fix.performedSetId, { weight: 5, reps: 10, repsInReserve: 11 })).rejects.toThrow("from 0 to 10");
    // A second fix on the same set makes the first one stale for undo.
    const again = await correctSet(fix.performedSetId, { weight: 107.5, reps: 10, setKind: "WORKING" });
    await expect(undoSetFix(fix.fixEventId)).rejects.toThrow("Undo the newest fix first.");
    await undoSetFix(again.fixEventId);
    expect((await setsOf(session.id)).map((s) => s.weight)).toEqual([105]);
    await expect(undoSetFix(again.fixEventId)).rejects.toThrow("already undone");
    // Working-set numbers stay unique: marking a warm-up as working where one exists is refused.
    const d2 = await pastWorkout(18, [[100, 10]]);
    const warm = await addSetToSession(d2.session.id, CHEST, { weight: 50, reps: 10, setKind: "WARMUP" });
    const warmRow = (await getPerformedSets(d2.session.id)).find((s) => s.id === warm.performedSetId)!;
    expect(warmRow.setNumber).toBe(2);
    await correctSet(warm.performedSetId, { weight: 50, reps: 10, setKind: "WORKING" });
  });

  it("keeps every fix and the edited marks through a native backup round trip", async () => {
    const { session } = await pastWorkout(16, [[100, 10], [100, 10]]);
    const [first, second] = await setsOf(session.id);
    await correctSet(first!.id, { weight: 105, reps: 11, setKind: "WORKING" });
    await removeSet(second!.id);
    await addSetToSession(session.id, CHEST, { weight: 95, reps: 12, setKind: "WORKING" });
    const before = await getWorkoutSessionRecord(session.id);
    const blob = await exportNativeBackup(false);
    await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
    await applyRestore(new File([blob], "beyond.json"));
    expect(await getWorkoutSessionRecord(session.id)).toEqual(before);
    expect(await getWorkoutRecordMismatches()).toEqual([]);
  });
});
