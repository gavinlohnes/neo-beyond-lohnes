# ROUTINES-001 — my shift rhythm

- **Authority:** Gavin, 2026-10-31: "Routines sound better to me! Let's do that", then approved the
  additive `routines` table and "One quiet row on TODAY".
- **Builder:** Claude Code. **Lane:** PROTECTED (additive schema v19; TODAY composition: one row).
- **Start:** stacked on PROJECTS-001 (`1f71b78`, PR #354) because both add a schema version.
  Branch `claude/routines-001`. Merge #354 first.

## Journey

Write a routine yourself (MORE → ROUTINES) or tell Alfred ("before shift I nap 20, shower, pack meals,
fill my bottle"). He drafts one card; SAVE keeps it. When its moment comes (before shift, on shift,
after shift, or a day off), TODAY shows one collapsed row next to prep. Open it, tick what helps.
Ask Alfred to change it ("move the nap earlier") and he proposes the edit as a card.

## Scope

- `routines` table (Dexie v19). Events: `ROUTINE_CREATED`, `ROUTINE_MODIFIED` (before/after),
  `ROUTINE_ARCHIVED`, `ROUTINE_RESTORED`, and `ROUTINE_STEP_SET` day events for ticks (latest wins).
- Moment comes from the same schedule phase TODAY already uses, plus the declared day: OFF → day off;
  shift started → on shift; shift ended → after shift; else PRE_WORK/SCHEDULED_SHIFT/EXPECTED_POST_WORK.
  An undeclared day or a work day's quiet stretch shows nothing rather than guessing.
- Edits keep the id (and today's tick) of unchanged steps; a stale edit is refused.
- Alfred: `routine_new`, `routine_edit` cards; ROUTINES in his records (names and steps only).
  Ticks are not sent and are excluded from search.

## Doctrine

No streaks, no "missed", no count of days done or skipped, no completion percentage, no reminders.
Ticks are today's only. An unticked step is simply unticked. Engine and recommendations untouched.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** event/command contract (`logIntentEvent`, `logEvent`, `writeAtomically`), schedule phase
  (`scheduledContext`), TODAY's prep placement, Intent screen styles, Alfred cards, native backup.
- **OWN:** routine meaning, moment mapping, tick semantics without tallies.
- **BUILD FROM SCRATCH:** the Routine record and its commands; habit trackers (Loop, Habitica-style)
  center streaks and scores, which doctrine rejects.

## Acceptance

`tests/integration/routines.test.ts`: ticks (latest wins, no-ops), edits keep ticks, stale edit refused,
archive/restore history, validation, moment mapping incl. declining to guess, backup round-trip,
Alfred cards, ticks out of search, invalid rows. `tests/browser/Routines.test.tsx`: by-hand create/edit
at 360px with axe; TODAY row shows only the current moment, keeps ticks, shows nothing otherwise.
Full verify, independent review, green CI; Gavin merges.
