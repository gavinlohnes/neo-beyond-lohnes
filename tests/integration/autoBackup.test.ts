import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { startDay, logWater } from "../../src/application/commands";
import {
  checkBackupFile,
  compareTableCounts,
  decideBackupPrompt,
  getBackupPrompt,
  setAutoBackupPreferenceAndReset,
  snoozeBackupPrompt,
} from "../../src/application/autoBackupQueries";
import { countLiveRows, getAutoBackupPreference, getLastRestoreCheckAt } from "../../src/persistence/autoBackup";

/**
 * BACKUP-AUTO-001: automatic backup is due-on-open + share, with a monthly
 * restore check that never writes (owner decision 2A, 2026-10-04).
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-04T12:00:00Z").getTime();
const ON = { enabled: true, everyDays: 7 };

async function freshBackupFile(): Promise<File> {
  const blob = await db.export({ prettyJson: true });
  return new File([blob], "beyond-backup.json", { type: "application/json" });
}

beforeEach(async () => {
  await db.open();
});

afterEach(() => {
  db.close();
});

describe("decideBackupPrompt", () => {
  const base = { preference: ON, daysSinceLastBackup: 0, snoozedUntil: null, lastRestoreCheckAt: NOW, now: NOW };

  it("shows nothing while the setting is off, however overdue", () => {
    expect(decideBackupPrompt({ ...base, preference: { enabled: false, everyDays: 7 }, daysSinceLastBackup: 90 })).toBeNull();
    expect(decideBackupPrompt({ ...base, preference: { enabled: false, everyDays: 7 }, daysSinceLastBackup: null })).toBeNull();
  });

  it("is due exactly when the days since the last backup reach the interval", () => {
    expect(decideBackupPrompt({ ...base, daysSinceLastBackup: 6 })).toBeNull();
    expect(decideBackupPrompt({ ...base, daysSinceLastBackup: 7 })).toEqual({ kind: "BACKUP_DUE", daysSinceLastBackup: 7 });
    expect(decideBackupPrompt({ ...base, daysSinceLastBackup: null })).toEqual({ kind: "BACKUP_DUE", daysSinceLastBackup: null });
  });

  it("LATER hides it until the snooze ends", () => {
    const due = { ...base, daysSinceLastBackup: 10 };
    expect(decideBackupPrompt({ ...due, snoozedUntil: NOW + 1000 })).toBeNull();
    expect(decideBackupPrompt({ ...due, snoozedUntil: NOW - 1000 })).toEqual({ kind: "BACKUP_DUE", daysSinceLastBackup: 10 });
  });

  it("asks for the restore check once a month, after the backup itself", () => {
    expect(decideBackupPrompt({ ...base, lastRestoreCheckAt: NOW - 29 * DAY })).toBeNull();
    expect(decideBackupPrompt({ ...base, lastRestoreCheckAt: NOW - 30 * DAY })).toEqual({ kind: "RESTORE_CHECK_DUE" });
    expect(decideBackupPrompt({ ...base, lastRestoreCheckAt: null })).toEqual({ kind: "RESTORE_CHECK_DUE" });
    expect(decideBackupPrompt({ ...base, daysSinceLastBackup: 8, lastRestoreCheckAt: null })?.kind).toBe("BACKUP_DUE");
  });
});

describe("compareTableCounts", () => {
  it("names each table whose count differs", () => {
    expect(
      compareTableCounts(
        [{ name: "events", rowCount: 3 }, { name: "beyondDays", rowCount: 1 }],
        [{ name: "events", rowCount: 5 }, { name: "beyondDays", rowCount: 1 }],
      ),
    ).toEqual({ kind: "DIFFERENT", totalRows: 4, differences: [{ name: "events", inBackup: 3, onDevice: 5 }] });
  });
});

describe("automatic backup settings and on-open prompt", () => {
  it("is off by default and shows nothing", () => {
    expect(getAutoBackupPreference()).toEqual({ enabled: false, everyDays: 7 });
    expect(getBackupPrompt()).toBeNull();
  });

  it("turned on with no backup on record, it is due; LATER hides it for a day", () => {
    setAutoBackupPreferenceAndReset(ON);
    const now = new Date(NOW);
    expect(getBackupPrompt(now)?.kind).toBe("BACKUP_DUE");
    snoozeBackupPrompt(now);
    expect(getBackupPrompt(new Date(NOW + DAY - 1000))).toBeNull();
    expect(getBackupPrompt(new Date(NOW + DAY + 1000))?.kind).toBe("BACKUP_DUE");
  });

  it("turning it on starts the monthly restore-check clock", () => {
    setAutoBackupPreferenceAndReset(ON, new Date(NOW));
    expect(getLastRestoreCheckAt()).toBe(NOW);
  });
});

describe("restore check (read-only)", () => {
  it("a fresh backup matches this device", async () => {
    const day = await startDay();
    await logWater(day.id, 12);
    const result = await checkBackupFile(await freshBackupFile());
    expect(result.kind).toBe("MATCH");
    if (result.kind === "MATCH") expect(result.totalRows).toBeGreaterThan(0);
  });

  it("names the table that differs once the device has moved on", async () => {
    const day = await startDay();
    const file = await freshBackupFile();
    await logWater(day.id, 12);
    const result = await checkBackupFile(file);
    expect(result.kind).toBe("DIFFERENT");
    if (result.kind === "DIFFERENT") expect(result.differences.map((d) => d.name)).toContain("events");
  });

  it("never writes: every table's row count is unchanged after a check", async () => {
    const day = await startDay();
    const older = await freshBackupFile();
    await logWater(day.id, 12);
    await logWater(day.id, 8);
    const before = await countLiveRows();
    await checkBackupFile(older);
    expect(await countLiveRows()).toEqual(before);
  });

  it("the backup file is the same one the real restore accepts", async () => {
    const day = await startDay();
    await logWater(day.id, 12);
    const file = await freshBackupFile();
    const before = await countLiveRows();
    await applyAnyRestore(file);
    expect(await countLiveRows()).toEqual(before);
  });

  it("rejects a file that isn't a backup, writing nothing", async () => {
    await startDay();
    const before = await countLiveRows();
    await expect(checkBackupFile(new File(["not json"], "x.json"))).rejects.toThrow(/INVALID_BACKUP_FILE/);
    expect(await countLiveRows()).toEqual(before);
  });
});
