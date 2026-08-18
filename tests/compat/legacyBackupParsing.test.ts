import { describe, expect, it } from "vitest";
import {
  isLegacyBackupFormat,
  parseLegacyBackup,
  previewLegacyBackup,
} from "../../src/persistence/compat/legacyBackup";

function minimalValidBackup() {
  return {
    format: "BEYOND_BACKUP",
    formatVersion: 1,
    exportedAt: "2026-08-18T00:00:00.000Z",
    appVersion: "0.2.0",
    dataSchemaVersion: 3,
    payload: {
      meta: [{ key: "schemaVersion", value: 3 }],
      beyondDays: [
        {
          id: "day-1",
          startedAt: "2026-08-18T00:00:00.000Z",
          timezoneId: "America/Chicago",
          workContext: "UNKNOWN",
          status: "ACTIVE",
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        },
      ],
      events: [],
      recommendations: [],
      outcomes: [],
      workoutSessions: [],
      performedSets: [],
    },
  };
}

describe("isLegacyBackupFormat", () => {
  it("recognizes the real format marker", () => {
    expect(isLegacyBackupFormat(minimalValidBackup())).toBe(true);
  });

  it("rejects the checkpoint 03 dexie-export-import format", () => {
    expect(isLegacyBackupFormat({ formatName: "dexie", data: {} })).toBe(false);
  });

  it("rejects non-objects without throwing", () => {
    expect(isLegacyBackupFormat(null)).toBe(false);
    expect(isLegacyBackupFormat("BEYOND_BACKUP")).toBe(false);
    expect(isLegacyBackupFormat(42)).toBe(false);
  });
});

describe("parseLegacyBackup", () => {
  it("accepts a minimal well-formed backup", () => {
    expect(() => parseLegacyBackup(minimalValidBackup())).not.toThrow();
  });

  it("rejects the wrong format literal", () => {
    const backup = minimalValidBackup();
    (backup as { format: string }).format = "SOMETHING_ELSE";
    expect(() => parseLegacyBackup(backup)).toThrow(/INVALID_LEGACY_BACKUP/);
  });

  it("rejects a payload missing a required table", () => {
    const backup = minimalValidBackup();
    // @ts-expect-error deliberately malformed for the test
    delete backup.payload.outcomes;
    expect(() => parseLegacyBackup(backup)).toThrow(/INVALID_LEGACY_BACKUP/);
  });

  it("rejects a beyondDay with an invalid status enum", () => {
    const backup = minimalValidBackup();
    (backup.payload.beyondDays[0] as { status: string }).status = "PAUSED";
    expect(() => parseLegacyBackup(backup)).toThrow(/INVALID_LEGACY_BACKUP/);
  });

  it("rejects garbage JSON shapes without throwing an unrelated error type", () => {
    expect(() => parseLegacyBackup({ not: "a backup" })).toThrow(/INVALID_LEGACY_BACKUP/);
    expect(() => parseLegacyBackup(null)).toThrow(/INVALID_LEGACY_BACKUP/);
    expect(() => parseLegacyBackup("just a string")).toThrow(/INVALID_LEGACY_BACKUP/);
  });
});

describe("previewLegacyBackup", () => {
  it("reports row counts per table without importing anything", () => {
    const backup = parseLegacyBackup(minimalValidBackup());
    const preview = previewLegacyBackup(backup);
    expect(preview.tables).toEqual([
      { name: "beyondDays", rowCount: 1 },
      { name: "events", rowCount: 0 },
      { name: "recommendations", rowCount: 0 },
      { name: "outcomes", rowCount: 0 },
      { name: "workoutSessions", rowCount: 0 },
      { name: "performedSets", rowCount: 0 },
    ]);
    expect(preview.appVersion).toBe("0.2.0");
    expect(preview.dataSchemaVersion).toBe(3);
  });
});
