import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { previewAnyRestore } from "../../src/persistence/restore";
import { startDay } from "../../src/application/commands";
import { decideBackupPrompt, getBackupPrompt, isDriveBackupDue, setAutoBackupPreferenceAndReset } from "../../src/application/autoBackupQueries";
import { setUpBackupKey, forgetBackupKey } from "../../src/application/driveBackup/backupKeys";
import { backupsToDelete, type DriveFile } from "../../src/application/driveBackup/driveApi";
import { backUpToDrive, getDriveBackupState, listDriveBackups, openDriveBackup } from "../../src/application/driveBackup/driveBackupService";
import { __setDriveTokenForTests } from "../../src/application/driveBackup/googleAuth";
import { updateDriveBackupState } from "../../src/persistence/driveBackupState";

/** DRIVE-BACKUP-001 (2/2). Google Drive is a mock: bytes in, bytes out. */
const FAST = 1_000;
const at = (local: string) => new Date(local); // local wall-clock time, so 16:30 means the lived-day boundary

function mockDrive() {
  const files = new Map<string, { name: string; createdTime: string; bytes: Uint8Array<ArrayBuffer> }>();
  let n = 0;
  let status = 200;
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (status !== 200) return new Response("no", { status });
    const method = init.method ?? "GET";
    if (url.includes("/upload/drive/v3/files")) {
      const body = new Uint8Array(await (init.body as Blob).arrayBuffer());
      const text = new TextDecoder("latin1").decode(body);
      const name = /"name":"([^"]+)"/.exec(text)![1]!;
      const start = text.indexOf("Content-Type: application/octet-stream\r\n\r\n") + "Content-Type: application/octet-stream\r\n\r\n".length;
      const end = text.lastIndexOf("\r\n--");
      const id = `f${++n}`;
      files.set(id, { name, createdTime: new Date(Date.now() + n).toISOString(), bytes: body.slice(start, end) });
      return Response.json({ id, name });
    }
    if (method === "POST") return Response.json({ id: "folder-1" });
    const one = /\/files\/([^?]+)/.exec(url)?.[1];
    if (one === "folder-1") return Response.json({ id: "folder-1", trashed: false });
    if (one && method === "DELETE") { files.delete(one); return new Response(null, { status: 204 }); }
    if (one && url.includes("alt=media")) return new Response(files.get(one)!.bytes as Uint8Array<ArrayBuffer>);
    if (decodeURIComponent(url).includes("mimeType='application/vnd.google-apps.folder'")) return Response.json({ files: [] });
    return Response.json({ files: [...files].map(([id, f]) => ({ id, name: f.name, createdTime: f.createdTime })).reverse() });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { files, fetchMock, fail: (s: number) => { status = s; } };
}

beforeEach(async () => { await db.open(); localStorage.clear(); __setDriveTokenForTests(null); });
afterEach(async () => { vi.unstubAllGlobals(); await forgetBackupKey(); db.close(); });

describe("due once per lived day", () => {
  const on = { on: true, folderId: "x", failure: null };
  it("is due when never backed up, then only again after the next 16:30", () => {
    expect(isDriveBackupDue({ ...on, lastSuccessAt: null }, at("2026-11-09T09:00"))).toBe(true);
    const last = at("2026-11-09T17:00").toISOString();
    expect(isDriveBackupDue({ ...on, lastSuccessAt: last }, at("2026-11-10T16:29"))).toBe(false);
    expect(isDriveBackupDue({ ...on, lastSuccessAt: last }, at("2026-11-10T16:31"))).toBe(true);
    expect(isDriveBackupDue({ ...on, on: false, lastSuccessAt: null }, at("2026-11-10T16:31"))).toBe(false);
  });

  it("shows the Drive line instead of the share line, keeps snooze, and carries a paused state", () => {
    const base = { preference: { enabled: true, everyDays: 1 }, daysSinceLastBackup: null, lastRestoreCheckAt: Date.now(), now: Date.now() };
    expect(decideBackupPrompt({ ...base, snoozedUntil: null, drive: { ...on, lastSuccessAt: null, failure: "PAUSED" } })).toEqual({ kind: "DRIVE_DUE", failure: "PAUSED" });
    expect(decideBackupPrompt({ ...base, snoozedUntil: Date.now() + 1000, drive: { ...on, lastSuccessAt: null } })).toBeNull();
    expect(decideBackupPrompt({ ...base, snoozedUntil: null, drive: { ...on, lastSuccessAt: new Date().toISOString() } })).toBeNull();
    expect(decideBackupPrompt({ ...base, snoozedUntil: null })).toEqual({ kind: "BACKUP_DUE", daysSinceLastBackup: null });
  });
});

describe("retention", () => {
  it("keeps the newest 7 and the first of each of the last 6 months", () => {
    const files: DriveFile[] = [];
    for (let m = 1; m <= 9; m++) for (const d of [3, 20]) files.push({ id: `${m}-${d}`, name: "beyond-backup-x", createdTime: `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00.000Z` });
    for (let d = 1; d <= 10; d++) files.push({ id: `10-${d}`, name: "beyond-backup-x", createdTime: `2026-10-${String(d + 20).padStart(2, "0")}T12:00:00.000Z` });
    const kept = new Set(files.map((f) => f.id));
    backupsToDelete(files).forEach((f) => kept.delete(f.id));
    expect([...kept].sort()).toEqual(["10-1", "10-10", "10-4", "10-5", "10-6", "10-7", "10-8", "10-9", "5-3", "6-3", "7-3", "8-3", "9-3"].sort());
  });
});

describe("backUpToDrive", () => {
  it("does nothing until set up, and never runs without a token unless tapped", async () => {
    mockDrive();
    expect((await backUpToDrive({ interactive: false })).kind).toBe("NOT_SET_UP");
    await setUpBackupKey("correct horse battery", FAST);
    updateDriveBackupState({ on: true });
    expect((await backUpToDrive({ interactive: false })).kind).toBe("NEEDS_TAP");
    expect(getDriveBackupState().lastSuccessAt).toBeNull();
  });

  it("uploads only ciphertext, records success, and the file restores through the existing preview", async () => {
    const drive = mockDrive();
    await startDay();
    const { recoveryCode } = await setUpBackupKey("correct horse battery", FAST);
    updateDriveBackupState({ on: true });
    __setDriveTokenForTests("token");
    const result = await backUpToDrive({ interactive: false });
    expect(result.kind).toBe("OK");
    expect(getDriveBackupState()).toMatchObject({ folderId: "folder-1", failure: null });
    expect(getDriveBackupState().lastSuccessAt).not.toBeNull();
    setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 1 });
    expect(getBackupPrompt()).toBeNull();
    const [stored] = [...drive.files.values()];
    expect(new TextDecoder().decode(stored!.bytes.slice(0, 10))).toBe("BEYOND-ENC");
    expect(new TextDecoder().decode(stored!.bytes)).not.toContain("beyondDays");

    const [listed] = await listDriveBackups();
    await expect(openDriveBackup(listed!, "wrong passphrase", "passphrase")).rejects.toThrow(/Couldn't unlock/);
    const file = await openDriveBackup(listed!, recoveryCode, "recovery");
    const preview = await previewAnyRestore(file);
    expect(preview.format).toBe("NATIVE");
    expect(preview.tables.find((t) => t.name === "beyondDays")?.rowCount).toBe(1);
  });

  it("an expired sign-in pauses (tap to reconnect); other errors read as failed; neither records success", async () => {
    const drive = mockDrive();
    await setUpBackupKey("correct horse battery", FAST);
    updateDriveBackupState({ on: true });
    __setDriveTokenForTests("token");
    setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 1 });
    drive.fail(401);
    expect((await backUpToDrive({ interactive: false })).kind).toBe("PAUSED");
    expect(getDriveBackupState()).toMatchObject({ failure: "PAUSED", lastSuccessAt: null });
    expect(getBackupPrompt()).toEqual({ kind: "DRIVE_DUE", failure: "PAUSED" });
    __setDriveTokenForTests("token");
    drive.fail(500);
    expect((await backUpToDrive({ interactive: false })).kind).toBe("FAILED");
    expect(getDriveBackupState()).toMatchObject({ failure: "FAILED", lastSuccessAt: null });
  });
});
