import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// Side-effect import, as persistence/backup.ts does: adds db.export()/db.import().
import "dexie-export-import";
import { db } from "../../src/persistence/db";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { startDay, logWater } from "../../src/application/commands";
import { createKeySet, decryptBackup, encryptBackup, generateRecoveryCode, readHeader } from "../../src/application/driveBackup/backupCrypto";

/** DRIVE-BACKUP-001. Low PBKDF2 iterations keep tests fast; production uses KDF_ITERATIONS. */
const FAST = 1_000;
const PROTECTED_DIR = fileURLToPath(new URL("../../test-fixtures/protected", import.meta.url));
const bytes = (text: string) => new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;

describe("encrypted backup format", () => {
  it("unlocks with the passphrase or the recovery code (any case, with or without dashes), and fails cleanly otherwise", async () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    const { dataKey, wraps } = await createKeySet("correct horse battery", code, FAST);
    const file = await encryptBackup(bytes('{"hello":"world"}'), dataKey, wraps, FAST);
    const text = (b: Uint8Array) => new TextDecoder().decode(b);
    expect(text(await decryptBackup(file, "correct horse battery", "passphrase"))).toBe('{"hello":"world"}');
    expect(text(await decryptBackup(file, code.toLowerCase().replace(/-/g, " "), "recovery"))).toBe('{"hello":"world"}');
    await expect(decryptBackup(file, "wrong passphrase", "passphrase")).rejects.toThrow("WRONG_SECRET");
    await expect(decryptBackup(file, "AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA", "recovery")).rejects.toThrow("WRONG_SECRET");
  });

  it("detects a tampered body or header, and never exposes the key", async () => {
    const { dataKey, wraps } = await createKeySet("correct horse battery", generateRecoveryCode(), FAST);
    await expect(globalThis.crypto.subtle.exportKey("raw", dataKey)).rejects.toThrow();
    const file = await encryptBackup(bytes("secret records"), dataKey, wraps, FAST);
    const body = file.slice(); body[body.length - 1]! ^= 1;
    await expect(decryptBackup(body, "correct horse battery", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
    const { header } = readHeader(file);
    const headerChanged = file.slice(); const at = new TextDecoder().decode(file).indexOf(header.iv); headerChanged[at]! ^= 2;
    await expect(decryptBackup(headerChanged, "correct horse battery", "passphrase")).rejects.toThrow();
    expect(new TextDecoder().decode(file)).not.toContain("secret records");
    expect(JSON.stringify(header)).not.toMatch(/correct horse battery/);
    await expect(createKeySet("short", generateRecoveryCode(), FAST)).rejects.toThrow("PASSPHRASE_TOO_SHORT");
  });

  it("rejects an unauthenticated header that is truncated, malformed, or asks for absurd work, before deriving any key", async () => {
    const { dataKey, wraps } = await createKeySet("correct horse battery", generateRecoveryCode(), FAST);
    const file = await encryptBackup(bytes("records"), dataKey, wraps, FAST);
    const magicLength = 10;
    const { header } = readHeader(file);
    const withHeader = (h: unknown) => {
      const headerBytes = bytes(JSON.stringify(h)), out = new Uint8Array(magicLength + 4 + headerBytes.length) as Uint8Array<ArrayBuffer>;
      out.set(file.slice(0, magicLength)); new DataView(out.buffer).setUint32(magicLength, headerBytes.length); out.set(headerBytes, magicLength + 4);
      return out;
    };
    const oversized = withHeader({ ...header, kdf: { ...header.kdf, iterations: 4_000_000_000 } });
    const started = Date.now();
    await expect(decryptBackup(oversized, "correct horse battery", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
    expect(Date.now() - started).toBeLessThan(1_000);
    await expect(decryptBackup(withHeader({ ...header, kdf: { ...header.kdf, hash: "SHA-1" } }), "x", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
    await expect(decryptBackup(withHeader({ ...header, wraps: { passphrase: {} } }), "x", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
    await expect(decryptBackup(file.slice(0, magicLength + 20), "x", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
    const badJson = file.slice(); badJson[magicLength + 4] = 0x7b ^ 0xff;
    await expect(decryptBackup(badJson, "x", "passphrase")).rejects.toThrow("BACKUP_DAMAGED");
  });

  it("treats NFC and NFD spellings of the same passphrase as the same", async () => {
    const { dataKey, wraps } = await createKeySet("caf\u00e9 au lait", generateRecoveryCode(), FAST);
    const file = await encryptBackup(bytes("ok"), dataKey, wraps, FAST);
    expect(new TextDecoder().decode(await decryptBackup(file, "cafe\u0301 au lait", "passphrase"))).toBe("ok");
  });
});

describe("encrypt → upload → download → decrypt → restore", () => {
  const roundTrip = async (plain: Uint8Array<ArrayBuffer>) => {
    const { dataKey, wraps } = await createKeySet("correct horse battery", generateRecoveryCode(), FAST);
    const uploaded = await encryptBackup(plain, dataKey, wraps, FAST);
    const downloaded = new Uint8Array(uploaded.buffer.slice(0)) as Uint8Array<ArrayBuffer>; // mock Drive: bytes in, bytes out
    const decrypted = await decryptBackup(downloaded, "correct horse battery", "passphrase");
    expect(Buffer.from(decrypted).equals(Buffer.from(plain))).toBe(true); // byte-equal, not just equivalent
    return new File([decrypted], "drive.json", { type: "application/json" });
  };

  it("restores every protected historical backup exactly as the unencrypted file does", async () => {
    for (const name of readdirSync(PROTECTED_DIR).filter((f) => f.endsWith(".json"))) {
      const raw = readFileSync(join(PROTECTED_DIR, name));
      await applyAnyRestore(new File([raw], name, { type: "application/json" }));
      const expected = await Promise.all(db.tables.map(async (t) => [t.name, await t.count()]));
      await applyAnyRestore(await roundTrip(new Uint8Array(raw) as Uint8Array<ArrayBuffer>));
      expect(await Promise.all(db.tables.map(async (t) => [t.name, await t.count()]))).toEqual(expected);
    }
  });

  it("round-trips today's native backup through the existing confirmed restore path", async () => {
    const day = await startDay(); await logWater(day.id, 16);
    const native = new Uint8Array(await (await db.export({ prettyJson: false })).arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const restoreFile = await roundTrip(native);
    expect((await previewAnyRestore(restoreFile)).format).toBe("NATIVE");
    await db.events.clear();
    await applyAnyRestore(restoreFile);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
  });
});
