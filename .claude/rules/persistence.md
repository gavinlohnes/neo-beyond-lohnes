---
paths:
  - "src/persistence/**"
---

# Persistence rules

- The current schema version is whatever `db.ts`'s highest `.version(N)` call says. Never
  hardcode a copy of it elsewhere (a prior drift bug: a UI diagnostic hardcoded schema version
  4 while the live database had already migrated to 6 — fixed by reading `db.verno` live; don't
  reintroduce a second source of truth for this number).
- Migrations are additive-only, no data loss across versions. A new migration is a High-Risk
  Drop — see `.claude/skills/beyond-drop` — and needs explicit escalation before writing it.
- Restore is replace-only: `clearTablesBeforeImport: true`, always preceded by preview
  (`previewRestore`/`previewAnyRestore`) before any write. Never add a merge-with-existing-data
  path without an explicit product decision.
- Backup/restore format changes (the native `dexie-export-import` shape or the legacy
  `BEYOND_BACKUP` compat shape) are High-Risk — they affect real historical data recoverability.
- See `.claude/rules/protected-fixtures.md` for the historical fixtures this layer's compat
  tests depend on.
