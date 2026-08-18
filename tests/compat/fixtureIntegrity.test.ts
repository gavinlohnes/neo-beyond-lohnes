import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PROTECTED_DIR = fileURLToPath(new URL("../../test-fixtures/protected", import.meta.url));

const FIXTURES = [
  {
    file: "beyond-backup-2026-08-17T23-15-09-360Z.json",
    sha256: "8818f6e7e8c6a23d2c89b148c7975176f9f2314af3e4178c1a66ec34a496a8db",
    size: 62028,
  },
  {
    file: "beyond-backup-2026-08-18T06-33-36-443Z.json",
    sha256: "a5bb46f1b1da5070f55f1c255812235ba33e643a41f9af176dfccbb0e9481c15",
    size: 73513,
  },
] as const;

describe("protected historical backup fixtures", () => {
  it.each(FIXTURES)(
    "$file is byte-identical to the recovered original",
    ({ file, sha256, size }) => {
      const bytes = readFileSync(join(PROTECTED_DIR, file));
      expect(bytes.byteLength).toBe(size);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
    },
  );
});
