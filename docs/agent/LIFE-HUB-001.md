# LIFE-HUB-001 — one place for everything that's you

- **Authority:** Gavin, 2026-11-01: "merge 361 and go life hub", on the proposal: one LIFE screen in
  MORE (Direction, Plans, Routines, People, Home, Memory) plus visual tidy-ups. The TODAY
  "before you go" merge was proposed separately and is NOT part of this (it needs its own OK).
- **Builder:** Claude Code. **Lane:** Routine/Feature (MORE-internal destination, copy, styling).
  No schema, Engine, dependency or TODAY composition change. Branch `ccr-0be4f40f-16m0ja` from `cecaaec`.

## What changes

- **MORE → LIFE**: tabs over the existing screens, unchanged: Direction (My context + PLAN MY NEXT
  DAYS OFF), Plans (Missions & Obligations with Projects), Routines, People, Home, Memory (BEYOND's
  and Alfred's). Visited tabs stay mounted so drafts survive switching. Search: "life", "personal".
- MORE-TRIM-001 cap kept: LIFE is browsed; ROUTINES becomes search-only (it lives in LIFE). The other
  dedicated screens and search entries stay.
- Personal Understanding drops its People and Home tabs (one line points to MORE → LIFE).
- Alfred's opening screen: quick-starts grouped **Plan · Remember · Review** in a two-column grid, so
  the message box is reachable without a long scroll.
- Alfred's cards show dates as said ("Sun, Nov 15"), not YYYY-MM-DD.
- TODAY's routine row uses BEYOND's › chevron (rotates when open; no motion with reduced motion).
- Review nits from #361: a misplaced docblock in shiftClock.ts and an import's formatting.

## REUSE / OWN / BUILD FROM SCRATCH

REUSE: every existing panel (MemoryPanel, IntentScreen, RoutinesPanel, PeoplePanel, HomePanel,
AlfredMemoryList), chip and tab styles, the COMMAND catalog. OWN: the LIFE grouping and copy.
BUILD FROM SCRATCH: none.

## Acceptance

`tests/browser/Life.test.tsx`: every tab shows its screen at 360px with axe and no overflow; a draft
survives switching tabs. Catalog tests: 55 entries, browsed list still within the cap. Card-text tests
updated to human dates. Full verify, review, green CI; Gavin merges.
