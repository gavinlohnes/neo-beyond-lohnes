# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `473dd19` (PR #189,
BOOT-001 merged after independent review; closed in this branch).

- **Drop:** `SHORTCUTS-001` home-screen shortcuts: ROUTINE. **ACTIVE**, branch
  `ccr-a34b4863-xb2jzi`.
- **Done:** BOOT-001 closed (as-built entry, roadmap). SHORTCUTS-001 built: long-pressing the icon
  offers exactly START WORKOUT (`?go=workout`: TRAIN at the workout start, or the workout in
  progress), +WATER (`?go=water`: BODY at the water quick-add) and LOG MEAL (`?go=meal`: BODY with
  the meal entry already open). A shortcut never logs or starts anything (Drop 7 ruling). Older
  pinned `?go=weight` / `?go=urge` shortcuts still open their controls. Screenshots:
  `docs/agent/screenshots/SHORTCUTS-001/`.
- **Left:** independent review, merge on green, close. Then VIEWS-001 (in progress locally).
- **Verification run:** `npm run verify` (194 files / 2056 tests passed, build OK; built manifest
  lists the three shortcuts); `git diff --check` OK.
- **Open risks:** Android caches shortcuts with the installed app: the new list shows after the
  PWA updates (sometimes only after re-adding it to the home screen). "+WATER" opens the water
  quick-add rather than adding water by itself — see decision 2. "DAY n" on the boot screen counts
  BEYOND days on record. A PR set taps once like any set. With an OBLIGATION_DUE recommendation
  the commitment's name shows twice on TODAY. Agent sessions clone shallow: `git fetch
  --unshallow origin` before `factory-drop.mjs init`. Carried over: raw capacity codes in "How
  BEYOND decided" with 2+ reasons; `factory:status` needs `GITHUB_TOKEN`; merged branches await
  deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
2. **+WATER shortcut:** **A (recommended, built)** opens the water quick-add; one more tap logs ·
   **B** logs 8 oz straight away, with UNDO on screen (changes the Drop 7 "never logs by itself"
   rule).
3. **What "DAY 14" counts on the boot screen:** **A (recommended, built)** BEYOND days on record ·
   **B** calendar days since the first one · **C** the day of the current work rotation.
