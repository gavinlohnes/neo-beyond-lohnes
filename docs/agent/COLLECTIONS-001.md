# COLLECTIONS-001 — operator-defined typed lists

- **Authorization:** Gavin approved the Apps Checklist and explicitly continued A6 on 2026-11-04.
- **Risk lane:** Protected — additive Dexie v24 persisted records.
- **Starting commit:** `1ee2c601` (`origin/master`, rebased after DAILY-NOTE-001 merged as schema v23).
- **Builder:** Codex. **Branch / PR:** `codex/collections-001`; PR #415.
- **Scope:** named lists with 1–6 text/number/date/yes-no/link fields; add, edit, archive, sort and search; search-only MORE destination; free-helper confirmation card.
- **Exclusions:** no Engine/recommendation input, formulas, relations, cloud sync, dependency, destructive deletion, or primary-nav change.
- **Verification:** migration, v23 restore, backup round-trip, typed command/query/helper tests, 360px/44px/axe browser test, typecheck and full verify.

## Leverage disposition

- **REUSE:** Dexie additive-store pattern, application command/query boundary, MORE/COMMAND catalog, and existing free-helper confirmation pipeline.
- **OWN:** BEYOND's bounded six-field mapping and local-first collection/item records.
- **BUILD FROM SCRATCH:** none; a database/spreadsheet dependency would exceed the bounded need.
