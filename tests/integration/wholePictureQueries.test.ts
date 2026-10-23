import { afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, endDay, setWorkContext, logSleep, correctSleep, logBodyweight, correctBodyweight, voidBodyweightLog, submitCheckIn } from "../../src/application/commands";
import { createMission, createObligation, satisfyObligation, releaseObligation } from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { getWholePicture } from "../../src/application/wholePictureQueries";
import { attachPictureCheckIns, pictureLowEnergy, pictureMean, pictureScope, pictureValues, describePicture } from "../../src/application/wholePictureProjection";
import type { ReviewRow } from "../../src/engine/reviewOverview";
import type { StateCheckIn } from "../../src/domain/common/types";

afterEach(() => vi.useRealTimers());
const at = (day: number, hour = 20) => new Date(2026, 9, day, hour);
const answers = { energy: 2, stress: 4, mood: 3, soreness: 0, alcoholUrge: 0 } as const;
function clock(day: number) { vi.setSystemTime(at(day)); }
function base(dayIds: string[]): ReviewRow { return { start: at(17).toISOString(), dayIds, context: "WORK", weights: [], sessions: 0, ambiguousSleep: false }; }
it("counts one latest submitted check-in across restarted segments, with deterministic ties", () => {
  const c = (id: string, beyondDayId: string, energy: 2 | 4, seq: number): StateCheckIn => ({ id, beyondDayId, recordedAt: at(17).toISOString(), ...answers, energy, seq });
  const checks = [c("z", "a", 2, 1), c("b", "b", 4, 2), c("a", "b", 2, 2), c("outside", "active", 4, 99)];
  const rows = attachPictureCheckIns([base(["a", "b"]), { ...base([]), start: at(18).toISOString() }], checks);
  expect(rows[0]!.checkIn?.id).toBe("a"); expect(rows[0]!.checkInCount).toBe(3);
  expect(pictureLowEnergy(rows)).toEqual({ count: 1, days: 1 });
  expect(pictureValues(rows, "sessions")).toEqual([0]);
  expect(rows[1]!.energy).toBeUndefined();
  expect(pictureMean([0, 0, 0])).toBe(0); expect(pictureMean([6, 7])).toBeUndefined();
  expect(pictureScope([{ ...rows[0]!, context: "UNKNOWN" }], "WORK")).toEqual([]);
});
it("resolves corrections and voids, excludes current/unfinished windows, and reads without any write", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); clock(17); const day = await startDay(); await setWorkContext(day.id, "WORK", "MANUAL");
  const sleep = await logSleep(day.id, 900, "PRIMARY"); await correctSleep(day.id, sleep, 360);
  const weight = await logBodyweight(day.id, 250); await correctBodyweight(day.id, weight, 180);
  const voided = await logBodyweight(day.id, 300); await voidBodyweightLog(day.id, voided);
  await submitCheckIn(day.id, answers); await submitCheckIn(day.id, { ...answers, energy: 4 }); await endDay(day.id);
  clock(20); const active = await startDay(); await logSleep(active.id, 1000, "PRIMARY"); await submitCheckIn(active.id, answers);
  const before = await db.events.toArray(), counts = await Promise.all(db.tables.map((table) => table.count()));
  const result = await getWholePicture(); const row = result.rows.find((item) => item.dayIds.includes(day.id))!;
  expect(row.sleepHours).toBe(6); expect(row.weight).toBe(180); expect(row.energy).toBe(4); expect(row.checkInCount).toBe(2);
  expect(result.rows.flatMap((item) => item.dayIds)).not.toContain(active.id);
  expect(result.rows).toHaveLength(56); expect(pictureValues(result.rows, "sleepHours")).toEqual([6]);
  expect(await db.events.toArray()).toEqual(before); expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(counts);
});
it("keeps resolved and released commitments distinct and retains actual reviewed expectations/outcomes", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); clock(17); const day = await startDay();
  const mission = await createMission({ title: "Health" }); const done = await createObligation({ title: "Book appointment", missionId: mission.id });
  const released = await createObligation({ title: "Old plan" }); await satisfyObligation(done.id, "Booked, not attended yet"); await releaseObligation(released.id, "Deliberately let go");
  const journal = await createDecisionJournalEntry({ title: "Try earlier wind-down", decision: "Stop errands", expectation: "More space" });
  await reviewDecisionJournalEntry(journal.id, { outcome: "Easier once", lesson: "Try again before deciding" }); await endDay(day.id);
  clock(20); const result = await getWholePicture();
  expect(result.stories.find((item) => item.id === done.id)).toMatchObject({ status: "SATISFIED", note: "Booked, not attended yet", mission: "Health" });
  expect(result.stories.find((item) => item.id === released.id)?.status).toBe("RELEASED");
  expect(result.stories.find((item) => item.id === journal.id)?.entry).toMatchObject({ expectation: "More space", outcome: "Easier once", lesson: "Try again before deciding" });
});
it("joins imported measures by measurement time, preserves partial coverage and exact provenance", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); clock(17); const day = await startDay(); await endDay(day.id); clock(20);
  const time = at(17, 21).toISOString();
  await db.externalActivityHours.add({ id: time, startTime: time, endTime: at(17, 22).toISOString(), zoneOffsetSeconds: null, steps: 0, heartRateMinBpm: null, heartRateAvgBpm: null, heartRateMaxBpm: null, exportedAt: at(20).toISOString(), receiptId: "receipt" });
  for (const [id, bpm] of [["first", 60], ["second", 57]] as const) await db.externalRestingHeartRates.add({ key: id, id, dataOriginPackage: "com.garmin.android.apps.connectmobile", time, zoneOffsetSeconds: null, bpm, lastModifiedTime: time, importedAt: at(20).toISOString(), receiptId: "receipt" });
  const result = await getWholePicture(), row = result.rows.find((item) => item.dayIds.includes(day.id))!;
  expect(row.steps).toBe(0); expect(row.measuredHours).toBe(1); expect(row.resting).toBe(57);
  expect(result.measurements[row.start]!.resting).toHaveLength(2); expect(result.measurements[row.start]!.hours[0]!.exportedAt).toBe(at(20).toISOString());
  expect(result.rows.at(-1)!.steps).toBeUndefined();
});
it("does not make a pattern, count or mean from an empty record", async () => {
  const result = await getWholePicture(at(20));
  expect(pictureValues(result.rows, "sessions")).toEqual([]); expect(pictureValues(result.rows, "energy")).toEqual([]);
  expect(describePicture(result.rows.slice(-28), result.rows.slice(0, 28))).toMatchObject({ title: "Your record starts with what you choose to record." });
  expect(result.stories).toEqual([]); expect(result.canSave).toBe(false);
});
