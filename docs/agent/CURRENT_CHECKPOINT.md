# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `08ca0c4` (PR #192,
STATUS-001 merged on Gavin's "1. A"; closed in this branch with his 2026-10-06 answers recorded).

- **Drop:** `FIND-001` search everything: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`.
- **Done:** STATUS-001 closed (as-built entry with the locked thresholds, roadmap). Gavin's answers
  recorded: thresholds as built; order FIND → MIRROR → REPORT; Week Ahead rule A written into
  `WEEKAHEAD-001.md`. FIND-001 built:
  - Search covers lifts, PRs, saved meals, journal entries, shift-handoff notes and History days
    (each day carries the lifts trained, meals eaten and its handoff note), alongside Missions,
    Obligations and Capture. Example: "chest" returns Machine Chest Press, every chest PR, and each
    day it was trained.
  - A tap opens where it lives: a LIFT or PR at that lift's strength curve (TRAIN → RECORDS); a
    NOTE or DAY in HISTORY with that day open; a MEAL at BODY's meal entry; a JOURNAL entry in
    JOURNAL; commitments and Capture as before.
  - A search icon at the top right of TODAY, TRAIN, BODY and MORE opens it (MORE's SEARCH row
    stays). Sealed time capsules are never indexed. Read only; no new dependency.
  - Screenshots: `docs/agent/screenshots/FIND-001/`.
- **Left:** independent review, merge on green, close. Then MIRROR-001, then REPORT-001
  (Architectural), then WEEKAHEAD-001 (Architectural).
- **Verification run:** `npm run verify` (199 files / 2077 tests passed, build OK); `git diff
  --check` OK; `check:risk` Routine.
- **Open risks:** a LIFT/PR result during an active workout opens TRAIN on the workout (RECORDS
  only shows between workouts). A JOURNAL result opens the journal list, not the entry itself.
  Capture results still open TODAY's TOOLS, as before. The top-bar icon scrolls away with the
  page. Carried over: TODAY's strip briefly shows the old capacity sentence before the System
  Status reads; a curve opens only from a record card; Android caches home-screen shortcuts until
  the PWA updates; with an OBLIGATION_DUE recommendation the commitment's name shows twice on
  TODAY; agent sessions clone shallow (`git fetch --unshallow origin` before `factory-drop.mjs
  init`); raw capacity codes in "How BEYOND decided" with 2+ reasons; `factory:status` needs
  `GITHUB_TOKEN`; merged branches await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
