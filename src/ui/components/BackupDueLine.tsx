import { useEffect, useRef, useState } from "react";
import {
  backUpNow,
  checkBackupFile,
  getBackupPrompt,
  snoozeBackupPrompt,
  type BackupPrompt,
} from "../../application/autoBackupQueries";
import { backUpToDrive, type DriveBackupResult } from "../../application/driveBackup/driveBackupService";
import { describeError } from "../errorMessage";
import { Signal } from "./Signal";
import { describeRestoreCheck } from "./restoreCheckCopy";

/**
 * BACKUP-AUTO-001 (owner brief 2026-10-04, decision 2A): the one line TODAY
 * shows when automatic backup is on and something is due. Read once when
 * TODAY opens ("due on open"); renders nothing otherwise, so with the
 * setting off TODAY is unchanged.
 */
export function BackupDueLine() {
  const [prompt, setPrompt] = useState<BackupPrompt>(() => getBackupPrompt());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DRIVE-BACKUP-001: if this session already holds a Google token, a due Drive backup just runs, quietly.
  useEffect(() => {
    if (prompt?.kind !== "DRIVE_DUE" || prompt.failure) return;
    let live = true;
    void backUpToDrive({ interactive: false }).then((result) => { if (live && result.kind !== "NEEDS_TAP") settleDrive(result); });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prompt && !message) return null;

  function settleDrive(result: DriveBackupResult) {
    setPrompt(getBackupPrompt());
    setMessage(result.kind === "OK" ? "Backed up to Drive." : "message" in result ? result.message : null);
  }

  async function handleDrive() {
    if (busy) return;
    setBusy(true);
    try {
      settleDrive(await backUpToDrive({ interactive: true }));
    } finally {
      setBusy(false);
    }
  }

  async function handleBackUp() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await backUpNow();
      setMessage(result.shared ? "Backup sent to the share menu." : "Backup file downloaded.");
      setPrompt(getBackupPrompt());
    } catch (e) {
      // Closing the share menu without picking a destination lands here; the line stays.
      setMessage(describeError(e, "Backup not saved."));
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (busy || !file) return;
    setBusy(true);
    try {
      setMessage(describeRestoreCheck(await checkBackupFile(file), file));
      setPrompt(getBackupPrompt());
    } catch (e) {
      setMessage(describeError(e, "Could not read that file."));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleLater() {
    snoozeBackupPrompt();
    setPrompt(null);
    setMessage(null);
  }

  return (
    <section className="backup-due" aria-label="Backup">
      {prompt?.kind === "BACKUP_DUE" && (
        <div className="backup-due__row">
          {/* SUIT-001: backup overdue is one of the four glitch signals. */}
          <Signal as="p" className="meta backup-due__text" data-signal="backup-line">
            Backup due{describeOverdue(prompt.daysSinceLastBackup)}
          </Signal>
          <button className="btn-secondary backup-due__action" disabled={busy} onClick={() => void handleBackUp()}>
            BACK UP NOW
          </button>
          <button className="backup-due__later" disabled={busy} onClick={handleLater}>
            LATER
          </button>
        </div>
      )}
      {prompt?.kind === "DRIVE_DUE" && (
        <div className="backup-due__row">
          <p className="meta backup-due__text">{DRIVE_LINE[prompt.failure ?? "DUE"].text}</p>
          <button className="btn-secondary backup-due__action" disabled={busy} onClick={() => void handleDrive()}>
            {busy ? "BACKING UP…" : DRIVE_LINE[prompt.failure ?? "DUE"].action}
          </button>
          <button className="backup-due__later" disabled={busy} onClick={handleLater}>
            LATER
          </button>
        </div>
      )}
      {prompt?.kind === "RESTORE_CHECK_DUE" && (
        <div className="backup-due__row">
          <p className="meta backup-due__text">Check your latest backup</p>
          <button className="btn-secondary backup-due__action" disabled={busy} onClick={() => fileInputRef.current?.click()}>
            CHECK NOW
          </button>
          <button className="backup-due__later" disabled={busy} onClick={handleLater}>
            LATER
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            aria-label="Choose your latest backup file to check"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      )}
      {message && (
        <p className="meta" role="status" style={{ margin: 0 }}>
          {message}
        </p>
      )}
    </section>
  );
}

/** One quiet line per Drive state: no popups, badges or red. */
const DRIVE_LINE = {
  DUE: { text: "Drive backup due", action: "BACK UP" },
  PAUSED: { text: "Drive backup paused — tap to reconnect", action: "RECONNECT" },
  FAILED: { text: "Drive backup didn't finish", action: "TRY AGAIN" },
} as const;

function describeOverdue(days: number | null): string {
  if (days === null) return "";
  return ` · ${days === 1 ? "1 day" : `${days} days`} old`;
}
