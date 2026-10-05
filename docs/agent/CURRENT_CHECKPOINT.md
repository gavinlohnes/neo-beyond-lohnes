# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (reviewer/integrator).** Baseline `origin/master` at `dd2e12f`
(PR #184, CLEANUP-003 merged).

- **Drop:** `CLEANUP-003` words and clutter: ROUTINE. **Merged** (PR
  [#184](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/184), merge `dd2e12f`) and
  **closed** on branch `claude/cleanup-003-close`. **No Drop is active.**
- **Done:** independent review of #184 at `03638a4`: scope clean (no Engine, domain, persistence,
  schema or package change; Engine strings unchanged); each of findings 5-10 and 12 checked;
  mutation checks failed the right tests. PR Verification green on the reviewed head.
- **Verification run (review):** `check:architecture` OK; `typecheck` OK; `git diff --check` OK;
  10 targeted test files 333/333 passed (factoryDrop included, no timeout flag).
- **Left:** nothing. Everything Gavin has approved is finished. Next is **a week of field use**
  (no new features; field notes first, as GitHub Issues labeled `field`) and Gavin's **review
  account**.
- **Open risks:** "How BEYOND decided" still shows raw capacity codes on a day with two or more
  reasons (the Engine joins them as one string, e.g. "energy <= 2, stress >= 4"); a single reason
  reads plainly. A small display follow-up if Gavin wants it. On TRAIN the planned-work question
  can show for a moment before it hides after a finished workout (it waits on one read); a
  finished RECOVERY session also hides it. The backup line shows only on TODAY (the screen BEYOND
  opens to). If the share menu is cancelled, the line shows the browser's own wording (e.g. "Share
  canceled."). A weeks-old backup will usually report "differs from this device" in the restore
  check, because data has been logged since it was made. Carried over: HUD follow-up (ticks not on
  `.tool-label`, see decision 2); @fontsource kept only for Weekly; `factory:status` needs
  `GITHUB_TOKEN`. The timeline was never checked by eye in a browser; tests cover its layout.
  Branches awaiting deletion by Gavin: 56 merged branches plus `codex/dup-meal-001`,
  `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close`,
  `claude/body-timeline-001`, `claude/body-timeline-001-close`, `claude/hud-002`,
  `claude/hud-002-close`, `claude/gym-001`, `claude/gym-polish-001`, `claude/gym-polish-001-close`,
  `claude/gym-002`, `claude/gym-002-close`, `claude/notes-sweep-001`,
  `claude/notes-sweep-001-close`, `claude/notes-handoff-001`, `claude/notes-handoff-001-close`,
  `claude/notes-capsule-001`, `claude/notes-capsule-001-close`, `claude/cleanup-002`,
  `claude/cleanup-002-close`, `claude/cleanup-003`, and `claude/cleanup-003-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
