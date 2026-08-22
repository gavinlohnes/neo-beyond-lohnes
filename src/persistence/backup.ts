import { db } from "./db";
// Side-effect import: extends Dexie/Dexie.prototype with export()/import().
import "dexie-export-import";

/**
 * Backup reminder (BODY & Backup Decisions, 2026-08-19, locked): a weekly
 * nudge, implemented as an on-open "days since last backup" check with an
 * in-app banner at 7+ days — not a push notification, since BEYOND has no
 * backend to support one without contradicting local-first doctrine.
 *
 * Last-backup timestamp is operational/UI bookkeeping, not meaningful
 * domain history ("event significance must earn storage") — stored in
 * localStorage rather than as a domain event.
 */
const LAST_BACKUP_AT_KEY = "beyond:lastBackupAt";

function recordBackupExported(): void {
  localStorage.setItem(LAST_BACKUP_AT_KEY, new Date().toISOString());
}

/** Null if a backup has never been exported on this device — treat as "due." */
export function getDaysSinceLastBackup(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_AT_KEY);
  if (!raw) return null;
  const lastBackupAt = new Date(raw).getTime();
  if (Number.isNaN(lastBackupAt)) return null;
  return Math.floor((Date.now() - lastBackupAt) / (1000 * 60 * 60 * 24));
}

function backupFilename(): string {
  return `beyond-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
}

/**
 * Drop 01 acceptance correction (real-device evidence, 2026-08-22):
 * dexie-export-import's own exportDB hardcodes its Blob as
 * `{ type: "text/json" }` internally (confirmed in
 * node_modules/dexie-export-import/dist/dexie-export-import.mjs) — not
 * configurable via ExportOptions. Chrome on Android preserves that
 * declared MIME type as the downloaded file's provider-recorded content
 * type; BEYOND's own restore <input accept="application/json"> then
 * triggers Android's Storage Access Framework picker with an exact-MIME
 * filter, which excludes a file recorded as text/json — so a backup
 * exported via this path could never be selected again from the same
 * device. shareBackup (below) already re-wraps the blob in
 * `new File([blob], name, { type: "application/json" })` before handing
 * it to the OS and was never affected; this makes exportBackup do the
 * same, for the same reason, rather than loosening the restore picker's
 * filter alone (see MoreScreen.tsx's accept list for the picker-side
 * hardening, which is a separate, complementary fix).
 */
export async function exportBackup(): Promise<void> {
  const blob = await db.export({ prettyJson: true });
  const file = new File([blob], backupFilename(), { type: "application/json" });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  recordBackupExported();
}

/**
 * Quarterly archival (BODY & Backup Decisions, 2026-08-19, locked): via
 * the existing backup export handed to the device's native share sheet,
 * so Gavin picks the destination (e.g. Drive) himself — full in-app
 * Google/Drive OAuth integration was explicitly considered and REJECTED.
 * Archived data stays on-device; this never deletes anything, it only
 * hands a copy of the same export to the OS share flow. Falls back to a
 * plain download when the Web Share API (or file sharing specifically)
 * isn't available — most desktop browsers.
 */
export async function shareBackup(): Promise<{ shared: boolean }> {
  const blob = await db.export({ prettyJson: true });
  const file = new File([blob], backupFilename(), { type: "application/json" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: "BEYOND backup", text: "BEYOND data archive" });
    recordBackupExported();
    return { shared: true };
  }

  await exportBackup();
  return { shared: false };
}

export interface RestorePreview {
  databaseName: string;
  databaseVersion: number;
  tables: { name: string; rowCount: number }[];
}

/**
 * Replace-only restore, matching the real app's confirmed behavior:
 * validate and preview BEFORE any data is replaced. Nothing is written
 * until the caller explicitly confirms with applyRestore.
 */
export async function previewRestore(file: File): Promise<RestorePreview> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("INVALID_BACKUP_FILE: not valid JSON.");
  }
  const data = parsed as {
    formatName?: string;
    data?: { databaseName: string; databaseVersion: number; tables: { name: string; rowCount: number }[] };
  };
  if (data.formatName !== "dexie" || !data.data) {
    throw new Error("INVALID_BACKUP_FILE: not a recognized BEYOND/Dexie backup.");
  }
  return {
    databaseName: data.data.databaseName,
    databaseVersion: data.data.databaseVersion,
    tables: data.data.tables.map((t) => ({ name: t.name, rowCount: t.rowCount })),
  };
}

export async function applyRestore(file: File): Promise<void> {
  await db.import(file, { clearTablesBeforeImport: true });
}
