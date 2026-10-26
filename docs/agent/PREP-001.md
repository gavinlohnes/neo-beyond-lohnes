# PREP-001 — ready for tonight

- **Authority:** Gavin approved the Prepared for Real Life campaign and focused PREP-001 first
  (“Approved… one focused step at a time”), 2026-10-26. Codex; PROTECTED durable preparation facts
  and bounded TODAY composition. Start `560deb3bc5d080ff19c0dd537c3d20a8c93144cb`; branch
  `codex/prep-001`; PR [#296](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/296). Each merge requires separate Gavin approval.
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

## Evidence / next

Persistence tests 12/12 PASS; initial browser file 10/10 PASS including four axe sizes;
TypeScript, architecture (308 files), production/PWA build and diff check PASS.
[Production evidence](../screenshots/prep-001/README.md) passes all four sizes offline, including
reload after midnight and real native backup→restore preview. Common controls sit side by side
at phone widths after visual inspection. Final full gate covers that CSS refinement.

Initial new tests exposed an event-array ordering assumption and an incorrect import; corrected
without changing behavioral assertions. Initial CI stopped at new test type errors (HTMLElement
cast and work-context source); corrected. Independent WIP review BLOCK at `801d138` reproduced a
clock-correction error in timestamp ordering. Replaced it with causal supersession projection,
rejecting forks/orphans/cycles; the same independent probe and 12 integration tests pass on the
corrected source. Final exact-head review/full gate/CI results are persisted in #296 before
readiness. No Engine/schema/dependency change; Gavin separately approves merge.

Full local gate on `82515e3`: 2,984 passed / two failed / one existing skip. Polish001 caught a
real fold regression under RED guidance; moved preparation after the existing logging controls
within the same Log section, preserving its original phone bounds and ordering assertions.
Follow-up: Preparation + Polish001 pass 23/23; catalog file 57 pass / one TODAY TOOLS timeout
(the original MIRROR timeout passes there); both timed-out navigation cases then pass 2/2 alone.
No assertions/timeouts/configuration weakened. Refreshed all four production captures after the
placement correction; PASS. Landscape MORE setup explicitly scrolls the existing search result
above fixed navigation before its normal click. Final verification/review/CI recorded in #296.
