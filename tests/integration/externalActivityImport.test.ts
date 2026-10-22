import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BeyondDB, db } from "../../src/persistence/db";
import "dexie-export-import";
import { applyRestore } from "../../src/persistence/backup";
import { applyAnyRestore } from "../../src/persistence/restore";
import { getMeasuredActivityByDay, importActivitySnapshot, previewActivityImport } from "../../src/application/externalActivityCommands";
import { parseActivitySnapshot } from "../../src/domain/health/activityImport";
import { syntheticActivity } from "../helpers/syntheticActivity";

const NEW_TABLES = ["externalActivityHours", "externalRestingHeartRates", "healthImportReceipts"];
beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); });
afterEach(async () => { await db.delete(); });
async function allTables() { return Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()]))); }
// Two lived days starting 16:30 Chicago (21:30Z); the 03:00Z hour belongs to the first, not to a calendar date.
const day1 = { id: "day-1", startedAt: "2026-10-17T21:30:00Z", timezoneId: "America/Chicago", workContext: "WORK" as const, status: "ENDED" as const, createdAt: "2026-10-17T21:30:00Z", updatedAt: "2026-10-17T21:30:00Z" };
const day2 = { ...day1, id: "day-2", startedAt: "2026-10-18T21:30:00Z", status: "ACTIVE" as const, createdAt: "2026-10-18T21:30:00Z", updatedAt: "2026-10-18T21:30:00Z" };

describe("measured steps and heart rate import", () => {
  it("previews without writes and imports without touching any other table", async () => {
    await db.beyondDays.bulkAdd([day1, day2]);
    const before = await allTables();
    const json = JSON.stringify(syntheticActivity());
    const preview = await previewActivityImport({ size: json.length, text: async () => json });
    expect(await allTables()).toEqual(before);
    expect(await importActivitySnapshot(preview)).toEqual({ inserted: 4, revised: 0, skipped: 0 });
    const after = await allTables();
    for (const table of db.tables.filter((t) => !NEW_TABLES.includes(t.name))) expect(after[table.name]).toEqual(before[table.name]);
    expect(await db.events.count()).toBe(0);
  });
  it("lets a newer export replace an hour and skips older or repeated exports", async () => {
    await importActivitySnapshot(syntheticActivity());
    const newer = syntheticActivity("2026-10-19T02:00:00Z"); newer.hours[0]!.steps = 1500;
    expect(await importActivitySnapshot(newer)).toEqual({ inserted: 0, revised: 3, skipped: 1 });
    expect((await db.externalActivityHours.get("2026-10-17T22:00:00Z"))!.steps).toBe(1500);
    expect(await importActivitySnapshot(syntheticActivity())).toEqual({ inserted: 0, revised: 0, skipped: 4 });
    expect((await db.externalActivityHours.get("2026-10-17T22:00:00Z"))!.steps).toBe(1500);
    expect(await db.healthImportReceipts.count()).toBe(2);
  });
  it("totals by lived day, not calendar date, and keeps missing values missing", async () => {
    await db.beyondDays.bulkAdd([day1, day2]);
    await importActivitySnapshot(syntheticActivity());
    const [latest, earlier] = await getMeasuredActivityByDay(7, Date.parse("2026-10-19T01:00:00Z"));
    expect(earlier!.day.id).toBe("day-1");
    expect(earlier!.measured).toEqual({ hours: 2, steps: 1500, heartRateMinBpm: 55, heartRateMaxBpm: 120, heartRateAvgBpm: 75 });
    expect(earlier!.restingHeartRateBpm).toBe(54);
    expect(latest!.day.id).toBe("day-2");
    expect(latest!.measured.steps).toBeNull();
    expect(latest!.measured.heartRateAvgBpm).toBe(64);
  });
  it("refuses malformed, foreign or unknown-field exports as a whole", async () => {
    const parse = (mutate: (s: ReturnType<typeof syntheticActivity>) => void) => { const s = syntheticActivity(); mutate(s); return () => parseActivitySnapshot(JSON.stringify(s)); };
    expect(parse((s) => { s.hours[0]!.startTime = "2026-10-17T22:30:00Z"; })).toThrow();
    expect(parse((s) => { s.hours[0]!.heartRateMaxBpm = 400; })).toThrow();
    expect(parse((s) => { s.hours[0]!.steps = null; s.hours[0]!.heartRateAvgBpm = null; })).toThrow();
    expect(parse((s) => { s.hours.push({ ...s.hours[0]! }); })).toThrow();
    expect(parse((s) => { s.restingHeartRate[0]!.dataOriginPackage = "phone"; })).toThrow();
    expect(parse((s) => { (s as unknown as Record<string, unknown>).extra = 1; })).toThrow();
    expect(parse((s) => { s.window.startTime = "2026-10-11T23:00:00Z"; })).toThrow();
    await expect(importActivitySnapshot({ format: "BEYOND_HEALTH_CONNECT_SLEEP" })).rejects.toThrow();
    expect(await db.externalActivityHours.count()).toBe(0);
  });
  it("round-trips through a native backup and clears on legacy replacement", async () => {
    await db.beyondDays.add(day1);
    await importActivitySnapshot(syntheticActivity());
    const before = await allTables(), blob = await db.export();
    await db.externalActivityHours.clear(); await db.externalRestingHeartRates.clear();
    await applyRestore(new File([blob], "synthetic.json", { type: "application/json" }));
    expect(await allTables()).toEqual(before);
    const legacy = { format: "BEYOND_BACKUP", formatVersion: 1, exportedAt: "2026-10-19T00:00:00Z", appVersion: "synthetic", dataSchemaVersion: 3,
      payload: { meta: [], beyondDays: [day1], events: [], recommendations: [], outcomes: [], workoutSessions: [], performedSets: [] } };
    await applyAnyRestore(new File([JSON.stringify(legacy)], "synthetic-legacy.json"));
    expect(await db.externalActivityHours.count()).toBe(0); expect(await db.externalRestingHeartRates.count()).toBe(0);
    expect(await db.beyondDays.get(day1.id)).toEqual(day1);
  });
  it("clears measured evidence when replacing with a pre-feature native backup", async () => {
    await db.beyondDays.add(day1);
    const old = JSON.parse(await (await db.export()).text()); old.data.databaseVersion = 14;
    const names = new Set(["externalActivityHours", "externalRestingHeartRates"]);
    old.data.tables = old.data.tables.filter((t: { name: string }) => !names.has(t.name));
    old.data.data = old.data.data.filter((t: { tableName: string }) => !names.has(t.tableName));
    await importActivitySnapshot(syntheticActivity());
    await applyRestore(new File([JSON.stringify(old)], "synthetic-old.json"));
    expect(await db.externalActivityHours.count()).toBe(0); expect(await db.externalRestingHeartRates.count()).toBe(0);
    expect(await db.beyondDays.get(day1.id)).toEqual(day1);
  });
});
describe("v14 upgrade", () => {
  it("adds two empty tables and preserves imported sleep and days", async () => {
    await db.delete();
    const old = new Dexie("beyond");
    old.version(14).stores({ beyondDays: "id, status, startedAt", events: "id, beyondDayId, type, occurredAt, missionId, obligationId, decisionJournalEntryId", checkIns: "id, beyondDayId, recordedAt", recommendations: "id, beyondDayId, issuedAt", outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt", workoutSessions: "id, beyondDayId, templateId, status, startedAt", performedSets: "id, beyondDayId, sessionId, exerciseId", schedulePatterns: "id", captureItems: "id, status, capturedAt", missions: "id, status, createdAt", obligations: "id, status, missionId, dueAt, createdAt", savedMeals: "id, archivedAt, createdAt", decisionJournalEntries: "id, status, createdAt", customExercises: "id, archivedAt, createdAt", customWorkoutTemplates: "id, archivedAt, createdAt", nutritionTargets: "id", quitHabits: "id", progressPhotos: "id, takenOn, pose", externalSleepRecords: "id, revisionId, startTime", externalSleepRevisions: "id, recordKey, receiptId", healthImportReceipts: "id, importedAt" });
    await old.open();
    await old.table("beyondDays").add(day1);
    await old.table("externalSleepRecords").add({ id: "k", revisionId: "r", startTime: "2026-10-18T07:00:00Z", lastModifiedTime: "2026-10-18T12:00:00Z" });
    old.close();
    const upgraded = new BeyondDB(); await upgraded.open();
    try {
      expect(await upgraded.beyondDays.get(day1.id)).toEqual(day1);
      expect(await upgraded.externalSleepRecords.count()).toBe(1);
      expect(await upgraded.externalActivityHours.count()).toBe(0); expect(await upgraded.externalRestingHeartRates.count()).toBe(0);
    } finally { upgraded.close(); }
  });
});
