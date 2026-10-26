# PREP-001 — ready for tonight

- **Authority:** Gavin approved the Prepared for Real Life campaign and focused PREP-001 first
  (“Approved… one focused step at a time”), 2026-10-26. Codex; PROTECTED durable preparation facts
  and bounded TODAY composition. Start `560deb3bc5d080ff19c0dd537c3d20a8c93144cb`; branch
  `codex/prep-001`; PR pending. Each merge requires separate Gavin approval.
- **Outcome:** food/snacks and bottle preparation, one tap each; frozen/home-made/other covered
  arrangements and not-needed choices are valid; change/undo; offline/restart/midnight continuity.
- **Placement:** enrich existing TODAY Log area (no new dominant/attention row or Engine input).
  Real PRE_WORK phase shows controls; at other phases a quiet manual PREPARE FOR WORK opens the
  same sheet. Mode pins never manufacture work context/preparation. Existing logging stays.
- **Persistence:** append-only PREPARATION_RECORDED events in the existing event table, scoped
  to the active lived-day ID; item-level optimistic revision, idempotent same-state calls and
  transactional guards. Food ready is not food eaten; bottle filled is not water consumed.
  Undo appends a revision, does not erase history or overwrite a newer revision. Midnight keeps
  the lived day; rollover/new day starts unknown with no carry-forward debt. No schema migration.
- **REUSE:** existing logEvent/nextSeq, writeAtomically, day queries, native LogSheet/focus,
  ConfirmBanner/useUndoWindow, current PRE_WORK context and canonical backup/history path.
  Existing repository patterns solve storage, offline and UI; no external package/assets needed.
- **OWN:** small preparation payload/state projection, guarded commands and display mapping.
- **BUILD FROM SCRATCH:** only preparation facts/projection; consumption/Obligations cannot
  truthfully represent them. No new framework or duplicate nutrition store.
- **Excluded:** spending, inventory/recipes, auto meal/water logging, recommendations/priority,
  notifications, streaks/scores, overdue/catch-up obligations, Engine/schema/dependency changes.
- **Acceptance:** one-tap common actions; source history/change/undo; honest pending/error states;
  stale/double writes and old-day writes guarded; no meal/water/Obligation side effects; day-off/
  unknown manual access, context changes and overnight restart; backup round trip including old
  backup without prep events; phone/landscape/desktop and keyboard/axe evidence. Full verify,
  green CI and independent exact-head review before separate owner merge approval.
