import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import "dexie-export-import";
import { applyRestore } from "../../src/persistence/backup";
import { applyAnyRestore } from "../../src/persistence/restore";
import { logSleep } from "../../src/application/commands";
import { importSleepSnapshot, previewSleepImport } from "../../src/application/externalSleepCommands";
import { getImportedSleep, getSleepRevisionHistory } from "../../src/application/externalSleepQueries";
import { BeyondDB } from "../../src/persistence/db";
import { syntheticSleep } from "../helpers/syntheticSleep";

beforeEach(async () => { await db.open(); await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); }); });
afterEach(async () => { vi.restoreAllMocks(); await db.delete(); });
async function allTables() { return Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()]))); }
const manualDay = { id: "existing-day", startedAt: "2026-10-17T20:00:00Z", timezoneId: "America/Chicago", workContext: "WORK" as const, status: "ACTIVE" as const, createdAt: "2026-10-17T20:00:00Z", updatedAt: "2026-10-17T20:00:00Z" };
describe("evidence-only sleep import", () => {
  it("previews without writes and leaves every existing table unchanged on import", async () => {
    await db.beyondDays.add(manualDay);
    await logSleep(manualDay.id, 240, "PRIMARY");
    await logSleep(manualDay.id, 30, "SUPPLEMENTAL");
    const before = await allTables();
    const json = JSON.stringify(syntheticSleep());
    const file = { size: json.length, text: async () => json };
    const preview = await previewSleepImport(file);
    expect(await allTables()).toEqual(before);
    await importSleepSnapshot(preview);
    const after = await allTables();
    for (const table of db.tables.filter((t) => !["externalSleepRecords", "externalSleepRevisions", "healthImportReceipts"].includes(t.name))) expect(after[table.name]).toEqual(before[table.name]);
    expect((await getImportedSleep())[0]!.associatedDayId).toBeNull();
  });
  it("serializes concurrent duplicates, retaining one revision and receipt", async () => {
    const results = await Promise.all([importSleepSnapshot(syntheticSleep()), importSleepSnapshot(syntheticSleep())]);
    expect(results.map((r) => r.inserted).sort()).toEqual([0, 1]);
    expect(await db.externalSleepRecords.count()).toBe(1);
    expect(await db.externalSleepRevisions.count()).toBe(1);
    expect(await db.healthImportReceipts.count()).toBe(1);
  });
  it("retains old source revisions and explicit existing-day links, ignores stale files", async () => {
    await db.beyondDays.add(manualDay);
    const first = syntheticSleep(); await importSleepSnapshot(first, { "synthetic-sleep": manualDay.id });
    const newer = syntheticSleep(); newer.records[0]!.lastModifiedTime = "2026-10-18T13:00:00Z"; newer.records[0]!.stages = [];
    expect(await importSleepSnapshot(newer)).toMatchObject({ inserted: 0, revised: 1, skipped: 0 });
    const current = (await getImportedSleep())[0]!;
    expect(current.associatedDayId).toBe(manualDay.id);
    expect(current.evidence.stages).toEqual([]);
    expect((await getSleepRevisionHistory(current.recordKey)).map((r) => r.evidence)).toEqual([newer.records[0], first.records[0]]);
    expect(await importSleepSnapshot(first)).toMatchObject({ inserted: 0, revised: 0, skipped: 1 });
    expect(await db.healthImportReceipts.count()).toBe(2);
  });
  it("rejects missing lived days without creating them", async () => {
    await expect(importSleepSnapshot(syntheticSleep(), { "synthetic-sleep": "missing" })).rejects.toThrow("no longer exists");
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.beyondDays.count()).toBe(0);
  });
  it("orders sub-millisecond source revisions without false conflicts", async () => {
    const first = syntheticSleep(); first.records[0]!.lastModifiedTime = "2026-10-18T12:00:00.123456700Z";
    await importSleepSnapshot(first);
    const next = syntheticSleep(); next.records[0]!.lastModifiedTime = "2026-10-18T12:00:00.123456789Z"; next.records[0]!.stages = [];
    expect((await importSleepSnapshot(next)).revised).toBe(1);
    expect((await importSleepSnapshot(first)).skipped).toBe(1);
    const row = (await getImportedSleep())[0]!;
    expect((await getSleepRevisionHistory(row.recordKey)).map((r) => r.sourceVersion)).toEqual([next.records[0]!.lastModifiedTime, first.records[0]!.lastModifiedTime]);
  });
  it("rolls back earlier records if a later source version conflicts", async () => {
    await importSleepSnapshot(syntheticSleep()); const before = await allTables();
    const conflict = syntheticSleep(); conflict.records[0]!.stages = [];
    conflict.records.unshift({ ...syntheticSleep().records[0]!, id: "new-record" });
    await expect(importSleepSnapshot(conflict)).rejects.toThrow("without a newer source version");
    expect(await allTables()).toEqual(before);
  });
  it("rolls back evidence when receipt persistence fails", async () => {
    const before = await allTables(); vi.spyOn(db.healthImportReceipts, "add").mockRejectedValueOnce(new Error("storage failure"));
    await expect(importSleepSnapshot(syntheticSleep())).rejects.toThrow("storage failure");
    expect(await allTables()).toEqual(before);
  });
  it("does not infer deletions from an empty later snapshot", async () => {
    await importSleepSnapshot(syntheticSleep()); const before = await allTables();
    const empty = syntheticSleep(); empty.records = [];
    expect(await importSleepSnapshot(empty)).toMatchObject({ inserted: 0, revised: 0, skipped: 0 });
    expect(await allTables()).toEqual(before);
  });
  it("round-trips evidence, revision history, receipts and deduplication through native backup", async () => {
    await importSleepSnapshot(syntheticSleep());
    const newer = syntheticSleep(); newer.records[0]!.lastModifiedTime = "2026-10-18T14:00:00Z";
    await importSleepSnapshot(newer);
    const before = await allTables(), blob = await db.export();
    await db.externalSleepRecords.clear(); await db.externalSleepRevisions.clear(); await db.healthImportReceipts.clear();
    await applyRestore(new File([blob], "synthetic.json", { type: "application/json" }));
    expect(await allTables()).toEqual(before);
    expect(await importSleepSnapshot(newer)).toMatchObject({ inserted: 0, revised: 0, skipped: 1 });
  });
  it("clears imported evidence when replacing with a pre-feature native backup", async () => {
    await db.beyondDays.add(manualDay);
    const old = JSON.parse(await (await db.export()).text()); old.data.databaseVersion = 13;
    const names = new Set(["externalSleepRecords", "externalSleepRevisions", "healthImportReceipts"]);
    old.data.tables = old.data.tables.filter((t: { name: string }) => !names.has(t.name));
    old.data.data = old.data.data.filter((t: { tableName: string }) => !names.has(t.tableName));
    await importSleepSnapshot(syntheticSleep());
    await applyRestore(new File([JSON.stringify(old)], "synthetic-old.json"));
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.externalSleepRevisions.count()).toBe(0); expect(await db.healthImportReceipts.count()).toBe(0);
    expect(await db.beyondDays.get(manualDay.id)).toEqual(manualDay);
  });
  it("restores old data atomically after a malformed backup fails after clearing", async () => {
    await importSleepSnapshot(syntheticSleep()); const before = await allTables();
    const bad = JSON.parse(await (await db.export()).text());
    bad.data.data.push({ tableName: "nonexistent", inbound: true, rows: [{ id: "bad" }] });
    bad.data.tables.push({ name: "nonexistent", schema: "id", rowCount: 1 });
    await expect(applyRestore(new File([JSON.stringify(bad)], "invalid.json"))).rejects.toThrow();
    expect(await allTables()).toEqual(before);
  });
  it("clears external evidence when replacing with a legacy backup", async () => {
    await importSleepSnapshot(syntheticSleep());
    const legacy = { format: "BEYOND_BACKUP", formatVersion: 1, exportedAt: "2026-10-19T00:00:00Z", appVersion: "synthetic", dataSchemaVersion: 3,
      payload: { meta: [], beyondDays: [manualDay], events: [], recommendations: [], outcomes: [], workoutSessions: [], performedSets: [] } };
    await applyAnyRestore(new File([JSON.stringify(legacy)], "synthetic-legacy.json"));
    expect(await db.externalSleepRecords.count()).toBe(0); expect(await db.externalSleepRevisions.count()).toBe(0); expect(await db.healthImportReceipts.count()).toBe(0);
    expect(await db.beyondDays.get(manualDay.id)).toEqual(manualDay);
  });
  it("rolls legacy replacement back including external evidence if a later insert fails", async () => {
    await importSleepSnapshot(syntheticSleep()); const before = await allTables();
    const legacy = { format: "BEYOND_BACKUP", formatVersion: 1, exportedAt: "2026-10-19T00:00:00Z", appVersion: "synthetic", dataSchemaVersion: 3,
      payload: { meta: [], beyondDays: [manualDay, manualDay], events: [], recommendations: [], outcomes: [], workoutSessions: [], performedSets: [] } };
    await expect(applyAnyRestore(new File([JSON.stringify(legacy)], "synthetic-bad-legacy.json"))).rejects.toThrow();
    expect(await allTables()).toEqual(before);
  });
});
describe("v13 upgrade", () => {
  it("adds three empty tables and preserves existing history", async () => {
    await db.delete();
    const old = new Dexie("beyond");
    old.version(13).stores({ beyondDays: "id, status, startedAt", events: "id, beyondDayId, type, occurredAt, missionId, obligationId, decisionJournalEntryId", checkIns: "id, beyondDayId, recordedAt", recommendations: "id, beyondDayId, issuedAt", outcomes: "id, beyondDayId, recommendationId, commandExecutionId, recordedAt", workoutSessions: "id, beyondDayId, templateId, status, startedAt", performedSets: "id, beyondDayId, sessionId, exerciseId", schedulePatterns: "id", captureItems: "id, status, capturedAt", missions: "id, status, createdAt", obligations: "id, status, missionId, dueAt, createdAt", savedMeals: "id, archivedAt, createdAt", decisionJournalEntries: "id, status, createdAt", customExercises: "id, archivedAt, createdAt", customWorkoutTemplates: "id, archivedAt, createdAt", nutritionTargets: "id", quitHabits: "id", progressPhotos: "id, takenOn, pose" });
    await old.open(); await old.table("beyondDays").add(manualDay); old.close();
    const upgraded = new BeyondDB(); await upgraded.open();
    try {
      expect(await upgraded.beyondDays.get(manualDay.id)).toEqual(manualDay);
      expect(await upgraded.externalSleepRecords.count()).toBe(0); expect(await upgraded.externalSleepRevisions.count()).toBe(0); expect(await upgraded.healthImportReceipts.count()).toBe(0);
    } finally { upgraded.close(); }
  });
});
