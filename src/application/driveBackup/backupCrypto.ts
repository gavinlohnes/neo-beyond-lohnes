/**
 * DRIVE-BACKUP-001: encryption for Drive backups. WebCrypto only.
 *
 * - A random 256-bit data key encrypts the unchanged native backup with AES-GCM and a fresh 96-bit IV.
 * - The data key is wrapped twice — under a PBKDF2-SHA256 key from the passphrase and one from the
 *   recovery code — so either unlocks a backup.
 * - The header (format, KDF parameters, salts, IVs, wrapped keys) is authenticated as AES-GCM
 *   additional data, so any change to it or to the ciphertext makes decryption fail.
 * - Nothing here stores or transmits a secret.
 */
export const BACKUP_MAGIC = "BEYOND-ENC";
export const KDF_ITERATIONS = 600_000;
type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder(), dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;
const random = (n: number): Bytes => globalThis.crypto.getRandomValues(new Uint8Array(n));
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string): Bytes => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

import type { Wrap, Wraps } from "../../domain/driveBackup";
export type { Wrap, Wraps };
export interface BackupHeader { format: typeof BACKUP_MAGIC; version: 1; kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number }; iv: string; wraps: Wraps }

/** 160 random bits as 8 groups of 4 (Crockford base32: no I, L, O or U). Shown once at setup. */
export function generateRecoveryCode(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = 0, value = 0, out = "";
  for (const byte of random(20)) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  return out.match(/.{4}/g)!.join("-");
}
/** Passphrases are NFC-normalised so the same words typed on another keyboard still unlock. */
const normalizePassphrase = (text: string) => text.normalize("NFC");
const normalizeCode = (code: string) => code.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");

async function wrapKeyFrom(secret: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function wrap(raw: Bytes, secret: string, iterations: number): Promise<Wrap> {
  const salt = random(16), iv = random(12);
  const key = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, await wrapKeyFrom(secret, salt, iterations), raw));
  return { salt: b64(salt), iv: b64(iv), key: b64(key) };
}
const importDataKey = (raw: Bytes) => subtle().importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);

/**
 * Setup: a new data key wrapped under both secrets. Returns the data key as a NON-extractable CryptoKey
 * for the device key store, and the wraps (public, also written into every backup header).
 */
export async function createKeySet(passphrase: string, recoveryCode: string, iterations = KDF_ITERATIONS): Promise<{ dataKey: CryptoKey; wraps: Wraps; iterations: number }> {
  passphrase = normalizePassphrase(passphrase);
  if (passphrase.length < 8) throw new Error("PASSPHRASE_TOO_SHORT");
  const raw = random(32);
  try {
    const wraps = { passphrase: await wrap(raw, passphrase, iterations), recovery: await wrap(raw, normalizeCode(recoveryCode), iterations) };
    return { dataKey: await importDataKey(raw), wraps, iterations };
  } finally { raw.fill(0); }
}

function packHeader(header: BackupHeader): Bytes { return enc.encode(JSON.stringify(header)); }

/** [magic][4-byte header length][header JSON][AES-GCM ciphertext], header bound as additional data. */
export async function encryptBackup(plain: Bytes, dataKey: CryptoKey, wraps: Wraps, iterations = KDF_ITERATIONS): Promise<Bytes> {
  const iv = random(12);
  const header = packHeader({ format: BACKUP_MAGIC, version: 1, kdf: { name: "PBKDF2", hash: "SHA-256", iterations }, iv: b64(iv), wraps });
  const cipher = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: header }, dataKey, plain));
  const magic = enc.encode(BACKUP_MAGIC), out = new Uint8Array(magic.length + 4 + header.length + cipher.length);
  out.set(magic, 0); new DataView(out.buffer).setUint32(magic.length, header.length); out.set(header, magic.length + 4); out.set(cipher, magic.length + 4 + header.length);
  return out;
}

/** Iterations a backup header may ask for; anything outside is treated as damage (the header is not yet authenticated). */
export const MIN_ITERATIONS = 1_000, MAX_ITERATIONS = 5_000_000;
const isWrap = (w: unknown): w is Wrap => !!w && typeof w === "object" && ["salt", "iv", "key"].every((k) => typeof (w as Record<string, unknown>)[k] === "string");

export function readHeader(file: Bytes): { header: BackupHeader; headerBytes: Bytes; cipher: Bytes } {
  const magic = enc.encode(BACKUP_MAGIC);
  if (file.length < magic.length + 4 || dec.decode(file.slice(0, magic.length)) !== BACKUP_MAGIC) throw new Error("NOT_AN_ENCRYPTED_BACKUP");
  const length = new DataView(file.buffer, file.byteOffset).getUint32(magic.length);
  const start = magic.length + 4;
  if (length === 0 || start + length > file.length) throw new Error("BACKUP_DAMAGED");
  const headerBytes = file.slice(start, start + length);
  let header: BackupHeader;
  try { header = JSON.parse(dec.decode(headerBytes)) as BackupHeader; } catch { throw new Error("BACKUP_DAMAGED"); }
  if (!header || typeof header !== "object") throw new Error("BACKUP_DAMAGED");
  if (header.format !== BACKUP_MAGIC || header.version !== 1) throw new Error("UNSUPPORTED_BACKUP_VERSION");
  const { kdf, iv, wraps } = header;
  if (!kdf || kdf.name !== "PBKDF2" || kdf.hash !== "SHA-256" || !Number.isInteger(kdf.iterations)
    || kdf.iterations < MIN_ITERATIONS || kdf.iterations > MAX_ITERATIONS
    || typeof iv !== "string" || !wraps || !isWrap(wraps.passphrase) || !isWrap(wraps.recovery)) throw new Error("BACKUP_DAMAGED");
  return { header, headerBytes, cipher: file.slice(start + length) };
}

/** Unlock with the passphrase or the recovery code. Throws WRONG_SECRET or BACKUP_DAMAGED; never returns partial data. */
export async function decryptBackup(file: Bytes, secret: string, kind: "passphrase" | "recovery"): Promise<Bytes> {
  const { header, headerBytes, cipher } = readHeader(file);
  const w = header.wraps[kind];
  let raw: Bytes;
  try {
    const wrapKey = await wrapKeyFrom(kind === "recovery" ? normalizeCode(secret) : normalizePassphrase(secret), unb64(w.salt), header.kdf.iterations);
    raw = new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(w.iv) }, wrapKey, unb64(w.key)));
  } catch { throw new Error("WRONG_SECRET"); }
  try {
    const key = await importDataKey(raw);
    return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(header.iv), additionalData: headerBytes }, key, cipher));
  } catch { throw new Error("BACKUP_DAMAGED"); }
  finally { raw.fill(0); }
}

/**
 * DRIVE-BACKUP-001 restore check: open a backup with this phone's own data key (no passphrase needed). Read
 * only. Throws BACKUP_DAMAGED when the file wasn't made with this key or was changed.
 */
export async function decryptWithDataKey(file: Bytes, dataKey: CryptoKey): Promise<Bytes> {
  const { header, headerBytes, cipher } = readHeader(file);
  try {
    return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(header.iv), additionalData: headerBytes }, dataKey, cipher));
  } catch { throw new Error("BACKUP_DAMAGED"); }
}
