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

  const encrypted = await encryptCurrentBackup();
  const file = await unlockBackup(encrypted, recoveryCode, "recovery");
  expect((await previewAnyRestore(file)).format).toBe("NATIVE");

  await forgetBackupKey();
  expect(await hasBackupKey()).toBe(false);
});
