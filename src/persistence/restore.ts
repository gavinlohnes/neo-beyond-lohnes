import { db } from "./db";
import { applyRestore as applyNativeRestore, previewRestore as previewNativeRestore } from "./backup";
import {
  importLegacyBackup,
  isLegacyBackupFormat,
  parseLegacyBackup,
  previewLegacyBackup,
} from "./compat/legacyBackup";

/**
 * Format-detecting bridge between MoreScreen's restore UI and the two
 * backup readers checkpoint 03 supports: its own native
 * dexie-export-import format (backup.ts), and the real historical app's
 * BEYOND_BACKUP format (persistence/compat/legacyBackup.ts). MoreScreen
 * should call only previewAnyRestore/applyAnyRestore — it does not need
 * to know which format a given file turns out to be.
 *
 * Both underlying paths remain replace-only and validate-before-write;
 * this module adds format detection on top, it does not change that
 * contract.
 */

export type RestorePreview =
  | {
      format: "NATIVE";
      databaseName: string;
      databaseVersion: number;
      tables: { name: string; rowCount: number }[];
    }
  | {
      format: "LEGACY";
      appVersion: string;
      dataSchemaVersion: number;
      exportedAt: string;
      tables: { name: string; rowCount: number }[];
    };

async function readJson(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_BACKUP_FILE: not valid JSON.");
  }
}

/**
 * Validate a chosen file and build a preview, WITHOUT writing anything.
 * Detects the real historical BEYOND_BACKUP format first (cheap format
 * sniff); falls back to checkpoint 03's own native format, whose own
 * validation/error messages are reused unchanged.
 */
export async function previewAnyRestore(file: File): Promise<RestorePreview> {
  const parsed = await readJson(file);

  if (isLegacyBackupFormat(parsed)) {
    const backup = parseLegacyBackup(parsed);
    const preview = previewLegacyBackup(backup);
    return {
      format: "LEGACY",
      appVersion: preview.appVersion,
      dataSchemaVersion: preview.dataSchemaVersion,
      exportedAt: preview.exportedAt,
      tables: preview.tables,
    };
  }

  const nativePreview = await previewNativeRestore(file);
  return { format: "NATIVE", ...nativePreview };
}

/** Replace-only apply, dispatched to whichever format previewAnyRestore detected. */
export async function applyAnyRestore(file: File): Promise<void> {
  const parsed = await readJson(file);

  if (isLegacyBackupFormat(parsed)) {
    const backup = parseLegacyBackup(parsed);
    await importLegacyBackup(db, backup);
    return;
  }

  await applyNativeRestore(file);
}
