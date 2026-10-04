# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (builder).** Baseline `origin/master` at `b58fbaf` (PR #169
merge). Gavin queued Gym mode with rulings 1A (two Drops), 2A (cue text stored in the database,
in backups), 3A (warm-up ramp as a suggestion); recorded in the roadmap Queue and
`docs/UX_DECISIONS.md`.

- **Drop:** `GYM-001` gym screen: ARCHITECTURAL, `ACTIVE`. Gavin approves the merge.
- **Branch:** `claude/gym-001`. **PR:** see `docs/agent/ACTIVE_DROP.md` `pr:`.
- **Done:** GYM MODE in an active STANDARD/REDUCED workout opens a full-screen view: typeable
  weight and reps with −/+ (weight by the lift's `incrementLbs`), LOG SET n, SKIP, rest
  countdown, ghost set ("Last time 185 × 5"), auto-advance, EXIT. Screen Wake Lock while open.
  Barbell custom exercises add plate math ("185 lb = bar + 45 + 25 per side") and, before the
  first barbell set, "Warm-up: 45 ×10 · 95 ×5 · 130 ×3 · 155 ×1" (suggestion only). Built-in
  templates A/B/C are machine/cable, so those two lines only appear for barbell lifts Gavin adds.
  All logging goes through TRAIN's own handlers. Helpers in `application/gymModeQueries.ts`.
- **Tests:** `tests/integration/gymMode.test.ts` (plate math, unloadable weights, ramp rounding);
  `tests/browser/GymMode.test.tsx` (ghost/plates/ramp, LOG = same logSet, auto-advance, wake lock
  requested and released, EXIT keeps state, machine lift without hints, ≥ 56 px targets, no
  overflow at 320/360/412, AA contrast, typing a first-ever weight, no-wake-lock browsers).
- **Verification run:** `check:architecture` OK; `typecheck` OK; full `npx vitest run
  --testTimeout 60000`: 1,985 passed, 0 failed; `build` OK; `git diff --check` OK. Checked in the
  browser at 390 px; screenshot in `docs/agent/screenshots/GYM-001/`.
- **Left:** independent review; Gavin approves the merge; close the Drop. Next: `GYM-002` (cue
  text, HIGH-RISK): stop at the plan for Gavin's sign-off on the exact storage change. Note for that
  plan: custom exercises already have an optional `notes` field; built-in exercises have no record.
- **Open risks:** the backup line shows only on TODAY (the screen BEYOND opens to). If the share
  menu is cancelled, the line shows the browser's own wording (e.g. "Share canceled."). A
  weeks-old backup will usually report "differs from this device" in the restore check, because
  data has been logged since it was made. Carried over: HUD follow-up (ticks not on
  `.tool-label`, see decision 2); @fontsource kept only for Weekly; `factory:status` needs
  `GITHUB_TOKEN`. The timeline was never checked by eye in a browser; tests cover its layout.
  Branches awaiting deletion by Gavin: 56 merged branches plus `codex/dup-meal-001`,
  `codex/duplicate-meal-prompt`, `claude/hud-001`, `claude/hud-001-close`,
  `claude/backup-auto-001`, `claude/pr-cards-001`, `claude/pr-cards-001-close`,
  `claude/body-timeline-001`, `claude/body-timeline-001-close`, `claude/hud-002`, and
  `claude/hud-002-close` (once merged).

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. GYM-001 after review: **A. Merge as is (recommended)** · B. Tune a detail first (say which) ·
   C. Hold.
