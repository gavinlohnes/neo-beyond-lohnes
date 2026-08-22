import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { getDaysSinceLastBackup, shareBackup } from "../../src/persistence/backup";

/**
 * Backup reminder (BODY & Backup Decisions, 2026-08-19, locked): weekly
 * nudge via an on-open "days since last backup" check. No push
 * notification — BEYOND has no backend.
 *
 * NOTE: exportBackup() and shareBackup()'s no-share-API fallback both
 * touch `document` (createElement/click) to trigger a browser download,
 * which isn't available in Vitest's plain Node environment (no jsdom in
 * this project, matching the pattern established in earlier
 * checkpoints). Those specific DOM-triggering paths aren't unit-tested
 * here — this file covers the backup-nudge timestamp logic and
 * shareBackup()'s Web Share API success path, which don't touch the DOM.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.unstubAllGlobals();
});

describe("getDaysSinceLastBackup", () => {
  it("returns null when no backup has ever been recorded", () => {
    expect(getDaysSinceLastBackup()).toBeNull();
  });

  it("returns 0 immediately after a successful share-based backup", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      canShare: () => true,
      share: vi.fn().mockResolvedValue(undefined),
    });
    await shareBackup();
    expect(getDaysSinceLastBackup()).toBe(0);
  });

  it("computes whole days elapsed from a stored timestamp", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem("beyond:lastBackupAt", eightDaysAgo);
    expect(getDaysSinceLastBackup()).toBe(8);
  });

  it("treats an unparseable stored value as never backed up", () => {
    localStorage.setItem("beyond:lastBackupAt", "not-a-date");
    expect(getDaysSinceLastBackup()).toBeNull();
  });
});

describe("shareBackup — Web Share API path", () => {
  it("shares the backup as a file and reports shared:true when the API is available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share: shareMock });

    const result = await shareBackup();

    expect(result.shared).toBe(true);
    expect(shareMock).toHaveBeenCalledTimes(1);
    const call = shareMock.mock.calls[0]![0] as { files: File[] };
    expect(call.files).toHaveLength(1);
    expect(call.files[0]!.name).toMatch(/^beyond-backup-.*\.json$/);
    // Locks in the type shareBackup already got right (Drop 01 acceptance
    // correction: exportBackup's plain-download path didn't match this
    // until 2026-08-22 — see backup.ts's exportBackup doc comment).
    expect(call.files[0]!.type).toBe("application/json");
  });

  it("does not touch the share API when canShare returns false", async () => {
    const shareMock = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, canShare: () => false, share: shareMock });

    // Falls back to exportBackup(), which needs `document` (not available
    // in this Node test environment) — expected to throw here rather than
    // silently calling share(). Proves the gate is respected either way.
    await expect(shareBackup()).rejects.toThrow();
    expect(shareMock).not.toHaveBeenCalled();
  });
});
