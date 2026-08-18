import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { previewAnyRestore, applyAnyRestore } from "../../src/persistence/restore";
import { startDay, logWater } from "../../src/application/commands";

/**
 * Tests the format-detecting bridge (persistence/restore.ts) that
 * MoreScreen's restore UI actually calls — i.e. the wiring, not the
 * importer/exporter logic underneath it, which already has its own
 * dedicated test suites (tests/compat/*.test.ts for the legacy importer,
 * dexie-export-import itself for the native path). What's new and
 * unverified until this file is: does a File chosen in the restore input
 * get routed to the right reader, and does confirming replace actually
 * replace the live database either way.
 */

const PROTECTED_DIR = fileURLToPath(new URL("../../test-fixtures/protected", import.meta.url));
const FIXTURE_A = "beyond-backup-2026-08-17T23-15-09-360Z.json";

function legacyBackupFile(): File {
  const backup = {
    format: "BEYOND_BACKUP",
    formatVersion: 1,
    exportedAt: "2026-08-18T00:00:00.000Z",
    appVersion: "0.2.0",
    dataSchemaVersion: 3,
    payload: {
      meta: [{ key: "schemaVersion", value: 3 }],
      beyondDays: [
        {
          id: "legacy-day-1",
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
  return new File([JSON.stringify(backup)], "legacy-backup.json", { type: "application/json" });
}

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
});

describe("previewAnyRestore — format detection", () => {
  it("detects the real historical BEYOND_BACKUP format", async () => {
    const preview = await previewAnyRestore(legacyBackupFile());
    expect(preview.format).toBe("LEGACY");
    if (preview.format === "LEGACY") {
      expect(preview.appVersion).toBe("0.2.0");
      expect(preview.dataSchemaVersion).toBe(3);
      expect(preview.tables).toEqual(
        expect.arrayContaining([{ name: "beyondDays", rowCount: 1 }]),
      );
    }
  });

  it("detects checkpoint 03's own native dexie-export-import format", async () => {
    await startDay();
    const blob = await db.export({ prettyJson: true });
    const nativeFile = new File([blob], "native-backup.json", { type: "application/json" });

    const preview = await previewAnyRestore(nativeFile);
    expect(preview.format).toBe("NATIVE");
    if (preview.format === "NATIVE") {
      expect(preview.databaseName).toBe("beyond");
      expect(preview.tables.some((t) => t.name === "beyondDays" && t.rowCount === 1)).toBe(true);
    }
  });

  it("rejects invalid JSON with the same error either format would give", async () => {
    const badFile = new File(["not json"], "bad.json", { type: "application/json" });
    await expect(previewAnyRestore(badFile)).rejects.toThrow(/INVALID_BACKUP_FILE/);
  });

  it("rejects a well-formed JSON file that matches neither format", async () => {
    const unrelatedFile = new File([JSON.stringify({ hello: "world" })], "unrelated.json", {
      type: "application/json",
    });
    await expect(previewAnyRestore(unrelatedFile)).rejects.toThrow(/INVALID_BACKUP_FILE/);
  });
});

describe("applyAnyRestore — actually replaces the live database", () => {
  it("replaces current data with a legacy-format restore", async () => {
    // Seed the live db with data that must NOT survive a replace-only restore.
    const day = await startDay();
    await logWater(day.id, 10);
    expect(await db.beyondDays.count()).toBe(1);

    await applyAnyRestore(legacyBackupFile());

    expect(await db.beyondDays.count()).toBe(1);
    const restoredDay = await db.beyondDays.toCollection().first();
    expect(restoredDay!.id).toBe("legacy-day-1");
    expect(await db.events.count()).toBe(0);
  });

  it("replaces current data with a native-format restore", async () => {
    const originalDay = await startDay();
    await logWater(originalDay.id, 10);
    const blob = await db.export({ prettyJson: true });
    const nativeFile = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await startDay();
    expect(await db.beyondDays.count()).toBe(2);

    await applyAnyRestore(nativeFile);

    expect(await db.beyondDays.count()).toBe(1);
    const restoredDay = await db.beyondDays.toCollection().first();
    expect(restoredDay!.id).toBe(originalDay.id);
  });

  it("restores the real Fixture A (schema 2) end to end, matching its documented counts", async () => {
    const raw = readFileSync(join(PROTECTED_DIR, FIXTURE_A), "utf8");
    const fixtureFile = new File([raw], FIXTURE_A, { type: "application/json" });

    const preview = await previewAnyRestore(fixtureFile);
    expect(preview.format).toBe("LEGACY");
    if (preview.format === "LEGACY") {
      expect(preview.appVersion).toBe("0.1.0");
      expect(preview.dataSchemaVersion).toBe(2);
    }

    await applyAnyRestore(fixtureFile);

    expect(await db.beyondDays.count()).toBe(1);
    expect(await db.events.count()).toBe(69);
    expect(await db.recommendations.count()).toBe(15);
    expect(await db.outcomes.count()).toBe(5);
  });
});
