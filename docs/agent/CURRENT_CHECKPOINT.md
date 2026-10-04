# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder), at the end of Gavin's authorized sprint**
("perform a sprint ... in a safe and responsible way": Queue items only; Routine merges on
green after an independent review; nothing Architectural/High-Risk merged without Gavin).
Baseline `origin/master` at `eb6c281` (PR #167 merge, BODY-TIMELINE-001 closed).

- **Sprint so far:** BODY-TIMELINE-001 built, reviewed, merged (PR #166) and closed (#167);
  the Queue's Done items cleared.
- **Drop:** `HUD-002` sprint cleanup: ROUTINE, `ACTIVE`. Branch `claude/hud-002`. **PR:**
  [#168](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/168).
- **Done:** the stale primary-button contrast comment in `tokens.css` now states #D0141B
  (~4.9:1); the PR count-equivalence test uses asymmetric data and fails if `getAllRecords`
  judges against later sessions (checked by breaking it and reverting); new
  `tests/browser/TimelineFilters.test.tsx` covers the Clean days and Goal chips and the goal's
  right-edge pin. Nothing on screen changes.
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,976 passed, 0 failed; `build` OK; `git diff --check` OK.
- **Left:** review, merge on green, close HUD-002. Then the Queue is empty; the sprint stops there.
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-ups (stale `tokens.css`
  contrast comment; ticks not on `.tool-label`); @fontsource kept only for Weekly;
  `factory:status` needs `GITHUB_TOKEN`. The timeline was never checked by eye in a browser;
  tests cover its layout. Branches awaiting deletion by Gavin: 56 merged branches plus
  `codex/dup-meal-001`, `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close`,
  `claude/body-timeline-001`, `claude/body-timeline-001-close`, `claude/hud-002` (and `claude/body-timeline-001-close` once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. What goes into the Queue next: **A. Gym mode (recommended; it's the parking-lot item used every
   workout)** · B. Notes that go somewhere · C. Nothing yet; wait for field notes.
2. HUD-001's "bracket ticks on `.tool-label` frames": **A. Leave as is: the section frames already
   carry ticks (recommended)** · B. Add small brackets around tool labels too.
3. Old branches: **A. Delete every branch already merged into master (recommended; nothing is
   lost)** · B. Keep them. The one-line command is in the sprint report.
