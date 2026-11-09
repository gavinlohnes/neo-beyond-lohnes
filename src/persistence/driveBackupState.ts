/**
 * DRIVE-BACKUP-001: on-device bookkeeping for encrypted Google Drive backups. Same treatment as
 * autoBackup.ts: operational state in localStorage, not domain history, so no schema change and
 * nothing in the backup file changes. Never holds a token, passphrase, recovery code or key.
 */
export type DriveFailure = "PAUSED" | "FAILED";

export interface DriveBackupState {
  /** Drive is this phone's automatic backup destination (the share sheet stays available). */
  on: boolean;
  folderId: string | null;
  /** ISO time of the last backup Drive confirmed. Missing means none, never success. */
  lastSuccessAt: string | null;
  /** The last attempt's problem, cleared by the next success. */
  failure: DriveFailure | null;
}

const KEY = "beyond:driveBackupState";
const EMPTY: DriveBackupState = { on: false, folderId: null, lastSuccessAt: null, failure: null };

/** Never throws on missing or malformed stored data: falls back to not set up. */
export function getDriveBackupState(): DriveBackupState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<DriveBackupState> | null;
    if (!raw || typeof raw !== "object") return EMPTY;
    const lastSuccessAt = typeof raw.lastSuccessAt === "string" && !Number.isNaN(new Date(raw.lastSuccessAt).getTime()) ? raw.lastSuccessAt : null;
    return {
      on: raw.on === true,
      folderId: typeof raw.folderId === "string" ? raw.folderId : null,
      lastSuccessAt,
      failure: raw.failure === "PAUSED" || raw.failure === "FAILED" ? raw.failure : null,
    };
  } catch {
    return EMPTY;
  }
}

export function updateDriveBackupState(patch: Partial<DriveBackupState>): DriveBackupState {
  const next = { ...getDriveBackupState(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearDriveBackupState(): void {
  localStorage.removeItem(KEY);
}
