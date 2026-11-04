# DAILY-NOTE-001 — daily note and wiki links

- **Authorization:** Gavin approved the Apps Checklist and explicitly approved starting A3 on 2026-11-04.
- **Risk lane:** Protected — additive Dexie schema v23 and persisted operator notes.
- **Starting commit:** `ae0ff976c2e47d7bc78179b6461a80b11f4860c8` (`origin/master`, rebased after HABITS-001 merged as schema v22).
- **Builder:** Codex.
- **Branch / PR:** `codex/daily-note-001`; PR #414.
- **Scope:** one explicit-save note per lived day; read-only recorded-day context; session-local drafts; `[[links]]`, autocomplete and derived backlinks for people, projects and lived days; journal decision fields reuse the link editor.
- **Exclusions:** no Engine input, recommendation change, primary-nav change, dependency, cloud sync, background save, or collection-item persistence before COLLECTIONS-001.
- **Acceptance evidence:** additive migration and old-backup restore; backup round-trip; focused integration and browser coverage at 360px with 44px targets and axe; typecheck and full verify before push.

## Leverage disposition

- **REUSE:** existing `BeyondDay`, journal, People, Project, MORE catalog, Dexie export/import and session-draft patterns.
- **OWN:** BEYOND's lived-day note mapping and read-derived wiki target/backlink model.
- **BUILD FROM SCRATCH:** none; no suitable dependency is needed for the bounded `[[label]]` grammar.
