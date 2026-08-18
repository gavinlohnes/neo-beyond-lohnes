import { db } from "./db";
// Side-effect import: extends Dexie/Dexie.prototype with export()/import().
import "dexie-export-import";

export async function exportBackup(): Promise<void> {
  const blob = await db.export({ prettyJson: true });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beyond-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
