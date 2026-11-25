import { afterEach, expect, it } from "vitest";
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { readDriveKey } from "../../src/persistence/driveKeyStore";
import { encryptCurrentBackup, forgetBackupKey, hasBackupKey, setUpBackupKey, unlockBackup } from "../../src/application/driveBackup/backupKeys";
import { previewAnyRestore } from "../../src/persistence/restore";
import { startDay, logWater } from "../../src/application/commands";

afterEach(async () => { await forgetBackupKey(); });

it("DRIVE-BACKUP-001: keeps a non-extractable key on the phone, outside the backup, and backs up without a secret", async () => {
  expect(await hasBackupKey()).toBe(false);
  await expect(encryptCurrentBackup()).rejects.toThrow("BACKUP_KEY_NOT_SET_UP");
  const day = await startDay(); await logWater(day.id, 12);
  const { recoveryCode } = await setUpBackupKey("correct horse battery", 1_000);
  expect(await hasBackupKey()).toBe(true);

  const stored = await readDriveKey();
  expect(stored!.dataKey.extractable).toBe(false);
  expect(JSON.stringify(stored)).not.toContain("correct horse battery");
  expect(JSON.stringify(stored)).not.toContain(recoveryCode);

  // The key lives in its own database: never a table of the backup, never in an export.
  expect(db.tables.map((t) => t.name)).not.toContain("keys");
  const exported = await (await db.export({ prettyJson: false })).text();
  expect(exported).not.toContain("beyond-drive-key");
  expect(exported).not.toContain(stored!.wraps.passphrase.key);

  localStorage.setItem("beyond.vision", "NIGHT"); localStorage.setItem("beyond.alfredKey", "sk-secret");
  const encrypted = await encryptCurrentBackup();
  const file = await unlockBackup(encrypted, recoveryCode, "recovery");
  const preview = await previewAnyRestore(file);
  expect(preview.format).toBe("NATIVE");
  // GRAYSON C8.1: the encrypted Drive backup carries the travelling preferences too, never the Alfred key.
  expect(preview.format === "NATIVE" && preview.settingsCount).toBeGreaterThanOrEqual(1);
  const text = await file.text();
  expect(text).toContain('"beyond.vision":"NIGHT"');
  expect(text).not.toContain("sk-secret");
  localStorage.removeItem("beyond.vision"); localStorage.removeItem("beyond.alfredKey");

  await forgetBackupKey();
  expect(await hasBackupKey()).toBe(false);
});
