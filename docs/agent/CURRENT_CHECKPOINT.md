# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (independent reviewer + integrator), during Gavin's authorized
sprint** ("perform a sprint ... in a safe and responsible way", 2026-10-04: Queue items only;
Routine merges on green after an independent review; nothing Architectural/High-Risk merged
without Gavin). Baseline `origin/master` at `02ec2f2` (PR #166 merge).

- **Drop:** `BODY-TIMELINE-001` transformation timeline (ROUTINE): **merged and closed.** An
  independent review found no blocking issue (review comment on PR #166). CI PR Verification
  passed on the reviewed head `2378f1c`. Merged as `02ec2f28d144a69c615ded4ba6b9336d59c6b99f`.
  Closed with `factory-drop.mjs close`.
- **No Drop active.** `docs/agent/ACTIVE_DROP.md` is closed.
- **Queue empty — Gavin adds the next item.** HUD-001, BACKUP-AUTO-001 and BODY-TIMELINE-001
  were moved out of the Queue into the roadmap's Done list.
- **Branch / PR:** `claude/body-timeline-001-close` (this close-out: roadmap, as-built line in
  `docs/UX_DECISIONS.md`, this note). Docs only. Not merged; waiting for Gavin.
- **Review notes (non-blocking):** the timeline's PR labels use the finish summary's words
  ("heaviest yet (145 lb)"). The RECORDS cards use their own card wording ("Heaviest: 145 lb × 6").
  Both list the same PRs. The Clean days and Goal filter chips have no browser test of their
  own; they run the same toggle code as PRs and Weight, which are tested.
- **Verification run (review):** `check:architecture` OK; `typecheck` OK; `git diff --check` OK;
  the timeline, Timeline, BodyScreen, Hud001 and accessibility tests: 86/86 passed. Breaking the
  PR, goal or weight-milestone label made a test fail each time. CI PR Verification passed.
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-ups (stale `tokens.css`
  contrast comment; ticks not on `.tool-label`); @fontsource kept only for Weekly;
  `factory:status` needs `GITHUB_TOKEN`. The timeline was never checked by eye in a browser;
  tests cover its layout. Branches awaiting deletion by Gavin: 56 merged branches plus
  `codex/dup-meal-001`, `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close`,
  `claude/body-timeline-001` (and `claude/body-timeline-001-close` once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **What goes into the Queue next?** (A) Gym mode: a full-screen lift view with big buttons,
   the screen kept awake, plate math and a warm-up ramp. **Recommended:** you use it every
   workout. (B) Notes that go somewhere: a day-off capture sweep, a time capsule, a shift
   handoff. (C) Small HUD follow-ups only: ticks on `.tool-label` and the stale contrast comment.
   (D) Nothing yet; wait for field notes.
2. **Merge this docs-only close-out PR?** (A) Yes. **Recommended.** (B) Hold it.
