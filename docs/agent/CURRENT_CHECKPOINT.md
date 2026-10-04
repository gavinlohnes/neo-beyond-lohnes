# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder), during Gavin's authorized sprint** ("perform a
sprint ... in a safe and responsible way", 2026-10-04: Queue items only; Routine merges on green
after an independent review; nothing Architectural/High-Risk merged without Gavin). Baseline
`origin/master` at `891a9f4` (PR #165 merge, PR-CARDS-001 closed).

- **Drop:** `BODY-TIMELINE-001` transformation timeline: ROUTINE, `ACTIVE`.
- **Branch:** `claude/body-timeline-001`. **PR:** [#166](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/166).
- **Done:** BODY → BODYWEIGHT → SHOW TIMELINE: weight over the last 90 days (inline SVG) with
  markers for PRs (finish-summary wording), clean-day milestones at 7/30/60/90/180/365 clean days
  (a running count, never a streak), weight milestones (each new 5-lb step, `describeMilestone`
  wording) and the goal date pinned right when `projectGoalDate` gives one. Chips PRs · Clean days
  · Weight · Goal filter each kind; markers are 44 px buttons (close ones share one) that show
  their lines. No weigh-ins: "Log a bodyweight to start your timeline." `application/
  timelineQueries.ts` (`buildTimeline` pure, `getTimeline`). Read only.
- **Tests:** `tests/integration/timeline.test.ts` (6: every kind pinned in order with source
  wording, milestone steps, 90-day window, no goal pin without a projection, empty and
  write-free, same PRs as RECORDS); `tests/browser/Timeline.test.tsx` (2: empty message; markers,
  filters, tap label, 44 px, no overflow at 320/360/412).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,974 passed, 0 failed; `build` OK; `git diff --check` OK. Not checked
  by eye in a browser (the pane rendered blank frames earlier); layout covered by tests.
- **Left:** review, merge on green, close the Drop. Then the Queue is empty except sprint cleanup
  (clear Done items from the Queue; HUD follow-ups: ticks on `.tool-label`, stale `tokens.css`
  contrast comment).
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-ups (stale `tokens.css`
  contrast comment; ticks not on `.tool-label`); @fontsource kept only for Weekly;
  `factory:status` needs `GITHUB_TOKEN`. HUD-001 and BACKUP-AUTO-001 still sit in the Queue
  marked Done. Branches awaiting deletion by Gavin: 56 merged branches plus `codex/dup-meal-001`,
  `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close` (and this close branch once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
None.
