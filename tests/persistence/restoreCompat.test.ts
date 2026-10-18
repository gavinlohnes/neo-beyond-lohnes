import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Side-effect import: extends Dexie.prototype with export()/import().
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { logBodyweight, startDay } from "../../src/application/commands";
import { getNutritionTargets } from "../../src/application/nutritionTargetQueries";
import { getSchedulePattern } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { DEFAULT_NUTRITION_TARGETS } from "../../src/engine/nutritionTargets";

/**
 * RESTORE-COMPAT (REVIEW-001 Phase 1a prerequisite): a native backup restores
 * whenever it comes from this schema or an OLDER one, and a backup from a
 * NEWER app is refused at preview, before anything is cleared or written.
 * Before this, any backup older than the live schema failed with "Database
 * version differs".
 */

beforeEach(async () => {
  await db.open();
});
afterEach(() => {
  db.close();
});

type ExportJson = {
  formatName: string;
  data: {
    databaseVersion: number;
    tables: { name: string; schema: string; rowCount: number }[];
    data: { tableName: string; inbound: boolean; rows: unknown[] }[];
  };
};

async function currentExport(): Promise<ExportJson> {
  return JSON.parse(await (await db.export()).text()) as ExportJson;
}

function asFile(json: ExportJson): File {
  return new File([JSON.stringify(json)], "backup.json", { type: "application/json" });
}

/** The same export as an older schema would have written it: the version, without the tables that schema predates. */
function asOlderSchema(json: ExportJson, version: number, missingTables: string[]): ExportJson {
  return {
    ...json,
    data: {
      ...json.data,
      databaseVersion: version,
      tables: json.data.tables.filter((t) => !missingTables.includes(t.name)),
      data: json.data.data.filter((t) => !missingTables.includes(t.tableName)),
    },
  };
}

describe("restoring a backup from an older schema", () => {
  it("restores its rows (previously refused with 'Database version differs')", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 201.4);
    const older = asOlderSchema(await currentExport(), 11, ["quitHabits", "progressPhotos"]);

    await db.events.clear();
    await db.beyondDays.clear();
    const preview = await previewAnyRestore(asFile(older));
    expect(preview).toMatchObject({ format: "NATIVE", databaseVersion: 11 });

    await applyAnyRestore(asFile(older));
    expect(await db.beyondDays.count()).toBe(1);
    const weights = await db.events.where("type").equals("BODYWEIGHT_LOGGED").toArray();
    expect(weights.map((e) => (e.payload as { weightLbs: number }).weightLbs)).toEqual([201.4]);
  });

  it("stays replace-only: a table the older backup predates is cleared, not kept", async () => {
    await db.quitHabits.put({ id: "current", name: "Synthetic habit", startedOn: "2026-10-01" } as never);
    const older = asOlderSchema(await currentExport(), 11, ["quitHabits", "progressPhotos"]);
    await applyAnyRestore(asFile(older));
    expect(await db.quitHabits.count()).toBe(0);
  });

  it("a settings row an older backup lacks reads as its default", async () => {
    await db.nutritionTargets.put({ ...DEFAULT_NUTRITION_TARGETS, calorieTarget: 2100 } as never);
    const older = asOlderSchema(await currentExport(), 10, ["nutritionTargets", "quitHabits", "progressPhotos"]);
    await applyAnyRestore(asFile(older));
    expect(await db.nutritionTargets.count()).toBe(0);
    expect(await getNutritionTargets()).toEqual(DEFAULT_NUTRITION_TARGETS);
  });
});

describe("a backup from before schema v4 (#236 review finding 2)", () => {
  it("restores with no schedulePatterns table, and the schedule reads as its default", async () => {
    await db.schedulePatterns.put({ ...DEFAULT_SCHEDULE_PATTERN, anchorMonday: "2026-01-05" });
    const day = await startDay();
    await logBodyweight(day.id, 210);
    const v3Tables = ["beyondDays", "events", "checkIns", "recommendations", "outcomes", "workoutSessions", "performedSets"];
    const json = await currentExport();
    const missing = json.data.tables.map((t) => t.name).filter((name) => !v3Tables.includes(name));
    const older = asOlderSchema(json, 3, missing);

    await applyAnyRestore(asFile(older));
    expect(await db.schedulePatterns.count()).toBe(0);
    expect(await getSchedulePattern()).toEqual(DEFAULT_SCHEDULE_PATTERN);
    expect(await db.events.where("type").equals("BODYWEIGHT_LOGGED").count()).toBe(1);
  });
});

describe("a backup with no readable version (#236 review finding 3)", () => {
  it("is refused as an invalid backup at preview and on apply, changing nothing", async () => {
    await startDay();
    const json = await currentExport();
    const unversioned = { ...json, data: { ...json.data, databaseVersion: "12" as unknown as number } };
    await expect(previewAnyRestore(asFile(unversioned))).rejects.toThrow(/^INVALID_BACKUP_FILE:/);
    await expect(applyAnyRestore(asFile(unversioned))).rejects.toThrow(/^INVALID_BACKUP_FILE:/);
    expect(await db.beyondDays.count()).toBe(1);
  });
});

describe("a backup from this schema", () => {
  it("restores as before", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 199);
    const same = await currentExport();
    await db.events.clear();
    await applyAnyRestore(asFile(same));
    expect(await db.events.where("type").equals("BODYWEIGHT_LOGGED").count()).toBe(1);
  });
});

describe("a backup from a newer app", () => {
  it("is refused at preview and on apply, and nothing on the device changes", async () => {
    const day = await startDay();
    await logBodyweight(day.id, 205);
    const newer = { ...(await currentExport()) };
    newer.data = { ...newer.data, databaseVersion: db.verno + 1 };
    const eventsBefore = await db.events.count();

    await expect(previewAnyRestore(asFile(newer))).rejects.toThrow(/^BACKUP_FROM_NEWER_APP: .*Nothing was changed\.$/);
    await expect(applyAnyRestore(asFile(newer))).rejects.toThrow(/^BACKUP_FROM_NEWER_APP:/);
    expect(await db.events.count()).toBe(eventsBefore);
    expect(await db.beyondDays.count()).toBe(1);
  });
});
