import { db } from "../../persistence/db";
import { clearDriveKey, readDriveKey, saveDriveKey } from "../../persistence/driveKeyStore";
import { createKeySet, decryptBackup, encryptBackup, generateRecoveryCode, KDF_ITERATIONS } from "./backupCrypto";

/**
 * DRIVE-BACKUP-001: the device side of encrypted backups. Setup makes a data key wrapped under the
 * passphrase and a new recovery code, keeps only the non-extractable key on this phone and returns the
 * recovery code to show ONCE. Encrypting a backup needs no secret; restoring needs the passphrase or code.
 */
export async function setUpBackupKey(passphrase: string, iterations = KDF_ITERATIONS): Promise<{ recoveryCode: string }> {
  const recoveryCode = generateRecoveryCode();
  const { dataKey, wraps } = await createKeySet(passphrase, recoveryCode, iterations);
  await saveDriveKey({ dataKey, wraps, iterations, createdAt: new Date().toISOString() });
  return { recoveryCode };
}

export async function hasBackupKey(): Promise<boolean> { return Boolean(await readDriveKey()); }
export const forgetBackupKey = clearDriveKey;

/** The current native backup (db.export, unchanged), encrypted with this phone's key. */
export async function encryptCurrentBackup(): Promise<Uint8Array<ArrayBuffer>> {
  const key = await readDriveKey();
  if (!key) throw new Error("BACKUP_KEY_NOT_SET_UP");
  const plain = new Uint8Array(await (await db.export({ prettyJson: false })).arrayBuffer());
  return encryptBackup(plain, key.dataKey, key.wraps, key.iterations);
}

/** An encrypted backup unlocked into the ordinary backup File that today's restore path accepts. */
export async function unlockBackup(encrypted: Uint8Array<ArrayBuffer>, secret: string, kind: "passphrase" | "recovery", name = "beyond-drive-backup.json"): Promise<File> {
  return new File([await decryptBackup(encrypted, secret, kind)], name, { type: "application/json" });
}
