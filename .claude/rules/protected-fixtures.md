---
paths:
  - "test-fixtures/protected/**"
---

# Protected fixtures — never edit in place

- `test-fixtures/protected/*.json` are real historical BEYOND backup exports — the sole
  surviving evidence of a recovered prior app instance's export format. They are compatibility
  evidence, not sample data.
- Never edit, reformat, pretty-print, or regenerate these files. `tests/compat/
  fixtureIntegrity.test.ts` is the real guarantee: it asserts exact byte-length + SHA-256 on
  every run and fails the suite if either file changes at all, even whitespace.
- Need a mutated variant (a corrupted/forked correction chain, etc.) for a test? Copy the JSON
  into a synthetic fixture elsewhere — never modify these in place.
- Read `test-fixtures/protected/MANIFEST.md` for what each fixture specifically proves before
  touching anything that consumes them (`tests/compat/fixtureImport.test.ts`, `tests/compat/
  legacyBackupParsing.test.ts`, `tests/integration/restoreWiring.test.ts`, `tests/integration/
  hydrationCorrection.test.ts`).
- Any change that could affect how these fixtures import/parse is High-Risk — see
  `.claude/skills/beyond-drop`.
