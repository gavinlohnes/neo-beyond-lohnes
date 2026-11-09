import { recordBackupExported } from "../../persistence/backup";
import { DEFAULT_AUTO_BACKUP_DAYS, getAutoBackupPreference } from "../../persistence/autoBackup";
import { clearDriveBackupState, getDriveBackupState, updateDriveBackupState, type DriveBackupState, type DriveFailure } from "../../persistence/driveBackupState";
import { isDriveBackupDue, setAutoBackupPreferenceAndReset } from "../autoBackupQueries";
import { encryptCurrentBackup, forgetBackupKey, hasBackupKey, setUpBackupKey, unlockBackup } from "./backupKeys";
import { backupFileName, backupsToDelete, deleteBackup, downloadBackup, ensureFolder, listBackups, uploadBackup, type DriveFile } from "./driveApi";
import { currentDriveToken, dropDriveToken, requestDriveToken, revokeDriveAccess } from "./googleAuth";

/**
 * DRIVE-BACKUP-001: Google Drive as a BACKUP-AUTO-001 destination. Due at most once per lived day (the
 * first open after 16:30 following the last confirmed Drive backup). A backup runs on its own only while
 * this session already holds a Google token; otherwise TODAY's one line asks for a tap. Status never
 * reads as success without a recorded success.
 */
export type { DriveBackupState, DriveFailure, DriveFile };
export { getDriveBackupState, isDriveBackupDue };

export type DriveBackupResult =
  | { kind: "OK"; at: string }
  | { kind: "NEEDS_TAP" }
  | { kind: "NOT_SET_UP" }
  | { kind: DriveFailure; message: string };

const failureOf = (e: unknown): DriveFailure => (String((e as Error)?.message).startsWith("DRIVE_PAUSED") ? "PAUSED" : "FAILED");
const messageOf = (e: unknown, fallback: string) => {
  const text = e instanceof Error ? e.message : "";
  const human = /^[A-Z_]+:\s*(.+)$/.exec(text)?.[1];
  return human ?? fallback;
};

/**
 * Encrypt the current backup and upload it. `interactive` (from a tap) may ask Google for sign-in;
 * otherwise it only uses a token this session already has. Old files are pruned afterwards, best effort.
 */
export async function backUpToDrive({ interactive, now = new Date() }: { interactive: boolean; now?: Date }): Promise<DriveBackupResult> {
  const state = getDriveBackupState();
  if (!state.on) return { kind: "NOT_SET_UP" };
  if (!(await hasBackupKey())) {
    clearDriveBackupState();
    return { kind: "NOT_SET_UP" };
  }
  const existing = currentDriveToken(now.getTime());
  if (!existing && !interactive) return { kind: "NEEDS_TAP" };
  try {
    const token = existing ?? (await requestDriveToken());
    const encrypted = await encryptCurrentBackup();
    const folderId = await ensureFolder(token, state.folderId);
    await uploadBackup(token, folderId, backupFileName(now), encrypted);
    const at = new Date().toISOString();
    updateDriveBackupState({ folderId, lastSuccessAt: at, failure: null });
    recordBackupExported();
    void pruneOldBackups(token, folderId);
    return { kind: "OK", at };
  } catch (e) {
    const failure = failureOf(e);
    if (failure === "PAUSED") dropDriveToken();
    updateDriveBackupState({ failure });
    return { kind: failure, message: messageOf(e, "Drive backup didn't finish.") };
  }
}

async function pruneOldBackups(token: string, folderId: string): Promise<void> {
  try {
    for (const file of backupsToDelete(await listBackups(token, folderId))) await deleteBackup(token, file.id);
  } catch {
    // Retention is housekeeping; a failed prune never fails or hides a successful backup.
  }
}

/**
 * Setup, from a tap: Google sign-in first (browsers only allow it straight after a tap), then the key,
 * then the first backup. Returns the recovery code to show ONCE.
 */
export async function connectDriveBackup(passphrase: string): Promise<{ recoveryCode: string; firstBackup: DriveBackupResult }> {
  if (passphrase.normalize("NFC").length < 8) throw new Error("PASSPHRASE_TOO_SHORT: Use at least 8 characters.");
  const token = await requestDriveToken();
  const folderId = await ensureFolder(token, getDriveBackupState().folderId);
  const { recoveryCode } = await setUpBackupKey(passphrase);
  updateDriveBackupState({ on: true, folderId, failure: null });
  setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 1 });
  return { recoveryCode, firstBackup: await backUpToDrive({ interactive: true }) };
}

/** DISCONNECT: revoke Google access and forget this phone's key. Local data and files already in Drive stay. */
export async function disconnectDriveBackup(): Promise<void> {
  await revokeDriveAccess();
  await forgetBackupKey();
  clearDriveBackupState();
  const preference = getAutoBackupPreference();
  setAutoBackupPreferenceAndReset({ ...preference, everyDays: DEFAULT_AUTO_BACKUP_DAYS });
}

/** Restore, from a tap: the BEYOND folder's backups, newest first. Works on a new phone too. */
export async function listDriveBackups(): Promise<DriveFile[]> {
  const token = await requestDriveToken();
  const folderId = await ensureFolder(token, getDriveBackupState().folderId);
  return listBackups(token, folderId);
}

/**
 * Download and unlock one backup into the ordinary backup File today's preview-and-confirm restore
 * accepts. Wrong secret and damaged file read the same: "couldn't unlock".
 */
export async function openDriveBackup(file: DriveFile, secret: string, kind: "passphrase" | "recovery"): Promise<File> {
  const token = await requestDriveToken();
  const encrypted = await downloadBackup(token, file.id);
  try {
    return await unlockBackup(encrypted, secret, kind, file.name.replace(/\.beyond$/, ".json"));
  } catch {
    throw new Error(`COULDNT_UNLOCK: Couldn't unlock this backup. Check the ${kind === "passphrase" ? "passphrase" : "recovery code"}.`);
  }
}
