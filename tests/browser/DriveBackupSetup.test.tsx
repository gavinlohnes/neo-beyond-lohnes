import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { DriveBackupSettings } from "../../src/ui/screens/more/DriveBackupSettings";
import { BackupDueLine } from "../../src/ui/components/BackupDueLine";
import { AutoBackupSettings } from "../../src/ui/screens/more/AutoBackupSettings";
import { startDay } from "../../src/application/commands";
import { forgetBackupKey } from "../../src/application/driveBackup/backupKeys";
import { __setDriveTokenForTests } from "../../src/application/driveBackup/googleAuth";

/**
 * DRIVE-BACKUP-001 (2/2): setup shows the recovery code once with the "lose both" warning; the TODAY
 * line is one quiet line; status never claims a backup that wasn't recorded. Google is stubbed.
 */
type W = Window & { google?: unknown };

function stubGoogle({ signInCloses = false } = {}) {
  const revoke = vi.fn((_t: string, done: () => void) => done());
  (window as W).google = { accounts: { oauth2: {
    initTokenClient: ({ callback, error_callback }: { callback: (r: { access_token: string; expires_in: number }) => void; error_callback: (e: unknown) => void }) =>
      ({ requestAccessToken: () => (signInCloses ? error_callback({ type: "popup_closed" }) : callback({ access_token: "token", expires_in: 3600 })) }),
    revoke,
  } } };
  return revoke;
}

function stubDrive(status = 200) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    if (status !== 200) return new Response("no", { status });
    if (url.includes("/upload/")) return Response.json({ id: "file-1", name: "beyond-backup-x" });
    if (init.method === "POST") return Response.json({ id: "folder-1" });
    return Response.json({ files: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => { localStorage.clear(); __setDriveTokenForTests(null); });
afterEach(async () => { cleanup(); vi.unstubAllGlobals(); delete (window as W).google; await forgetBackupKey(); });

describe("DRIVE-BACKUP-001 — setup and status", () => {
  it("not set up reads 'Not set up', never a success", async () => {
    const screen = await render(<DriveBackupSettings />);
    await expect.element(screen.getByText("Not set up.")).toBeVisible();
    await expect.element(screen.getByText(/Last backup/)).not.toBeInTheDocument();
  });

  it("setup: passphrase twice, then the recovery code ONCE with the lose-both warning", async () => {
    stubGoogle();
    stubDrive();
    await startDay();
    const screen = await render(<DriveBackupSettings />);
    await screen.getByRole("button", { name: "SET UP" }).click();
    await expect.element(screen.getByText(/If you lose both, nobody — including you — can open these backups/)).toBeVisible();
    await screen.getByLabelText("Passphrase (8+ characters)").fill("correct horse battery");
    await screen.getByLabelText("Passphrase again").fill("correct horse batterx");
    await screen.getByRole("button", { name: "CONNECT GOOGLE DRIVE" }).click();
    await expect.element(screen.getByText("The two passphrases don't match.")).toBeVisible();
    await screen.getByLabelText("Passphrase again").fill("correct horse battery");
    await screen.getByRole("button", { name: "CONNECT GOOGLE DRIVE" }).click();

    const code = screen.getByRole("group", { name: "Recovery code" });
    await expect.element(code, { timeout: 15_000 }).toBeVisible();
    expect(code.element().textContent).toMatch(/([0-9A-Z]{4}-){7}[0-9A-Z]{4}/);
    await expect.element(screen.getByText(/If you lose both, nobody — including you — can open them/)).toBeVisible();
    await expect.element(screen.getByText("Connected. First backup saved to Drive.")).toBeVisible();
    await expect.element(screen.getByText(/Connected, once a day\. Last backup/)).toBeVisible();

    await screen.getByRole("button", { name: "I'VE WRITTEN IT DOWN" }).click();
    expect(document.body.textContent).not.toMatch(/([0-9A-Z]{4}-){7}[0-9A-Z]{4}/);
    // Nothing secret is kept in page storage.
    expect(JSON.stringify(localStorage)).not.toMatch(/correct horse|token/);
  });

  it("DISCONNECT with no token in memory signs in first so Google access is really revoked", async () => {
    const setUp = { on: true, folderId: "folder-1", lastSuccessAt: null, failure: null };
    localStorage.setItem("beyond:driveBackupState", JSON.stringify(setUp));
    const revoke = stubGoogle();
    const screen = await render(<DriveBackupSettings />);
    await screen.getByRole("button", { name: "DISCONNECT" }).click();
    await screen.getByRole("button", { name: "DISCONNECT" }).click();
    await expect.element(screen.getByText(/Google access removed/)).toBeVisible();
    expect(revoke).toHaveBeenCalledWith("token", expect.any(Function));
    await expect.element(screen.getByText("Not set up.")).toBeVisible();
  });

  it("DISCONNECT when Google's sign-in is closed still forgets this phone and says how to finish at Google", async () => {
    localStorage.setItem("beyond:driveBackupState", JSON.stringify({ on: true, folderId: "folder-1", lastSuccessAt: null, failure: null }));
    const revokeClosed = stubGoogle({ signInCloses: true });
    const screen = await render(<DriveBackupSettings />);
    await screen.getByRole("button", { name: "DISCONNECT" }).click();
    await screen.getByRole("button", { name: "DISCONNECT" }).click();
    await expect.element(screen.getByText(/open myaccount\.google\.com\/permissions/)).toBeVisible();
    expect(revokeClosed).not.toHaveBeenCalled();
    await expect.element(screen.getByText("Not set up.")).toBeVisible();
    expect(localStorage.getItem("beyond:driveBackupState")).toBeNull();
  });

  it("with Drive connected, AUTOMATIC BACKUP says backups go to Drive, not the share menu", async () => {
    localStorage.setItem("beyond:autoBackupPreference", JSON.stringify({ enabled: true, everyDays: 1 }));
    localStorage.setItem("beyond:driveBackupState", JSON.stringify({ on: true, folderId: "folder-1", lastSuccessAt: null, failure: null }));
    const screen = await render(<AutoBackupSettings />);
    await expect.element(screen.getByText("On, once a day to Google Drive.")).toBeVisible();
    await expect.element(screen.getByText(/it goes to Google Drive, locked/)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/share menu: Drive, Files/);
    expect(document.querySelector('select[aria-label="Back up every"]')).toBeNull();
  });

  it("TODAY: a paused Drive backup is one quiet line with RECONNECT, and no success is shown", async () => {
    localStorage.setItem("beyond:autoBackupPreference", JSON.stringify({ enabled: true, everyDays: 1 }));
    localStorage.setItem("beyond:lastRestoreCheckAt", new Date().toISOString());
    localStorage.setItem("beyond:driveBackupState", JSON.stringify({ on: true, folderId: "folder-1", lastSuccessAt: null, failure: "PAUSED" }));
    stubGoogle();
    const screen = await render(<BackupDueLine />);
    await expect.element(screen.getByText("Drive backup paused — tap to reconnect")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "RECONNECT" })).toBeVisible();
    expect(document.querySelectorAll(".backup-due__row")).toHaveLength(1);
    expect(document.querySelector('[data-signal]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Backed up/);
  });
});
