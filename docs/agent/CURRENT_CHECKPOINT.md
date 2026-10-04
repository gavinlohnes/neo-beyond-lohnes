# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (review + integration session).** `origin/master` at
`749b885` (PR #160 merge).

- **Drop:** `HUD-001` HUD design system: **merged and closed.** Reviewed independently at head
  `1242ae2` with no blocking findings; PR Verification green on that head; merged per Gavin's
  2026-10-04 ruling "merge as is"; `ACTIVE_DROP.md` closed at integration `749b885`.
- **Active Drop:** none.
- **Branch / PR for this note:** `claude/hud-001-close` (docs only: Drop close, Queue item marked
  done, `docs/UX_DECISIONS.md` as-built entry, this handoff).
- **Review notes (non-blocking, follow-up only):** an old `tokens.css` comment still cites
  #c81e2c ~5.11:1 for the primary button (now #D0141B, ~4.9:1, still AA); bracket ticks sit on
  `.equipment-row` frames only, not `.tool-label`; `.hud-legacy` would not un-cut a
  `.card--warning` inside Weekly (Weekly has none today).
- **Verification run (review):** `tests/browser/Hud001.test.tsx` 7/7, and it fails when
  `--text-3` is set back to #6e6e6e; `check:architecture` OK; `typecheck` OK; `build` OK (fonts
  under the base path and precached by `sw.js`, no CDN); PR Verification success on `1242ae2`.
- **Next in Queue:** `BACKUP-AUTO-001` automatic backup (ARCHITECTURAL; written Drop at
  `docs/agent/drops/BACKUP-AUTO-001.md`). Needs Gavin's go-ahead before anyone builds it. After
  it: `PR-CARDS-001`, `BODY-TIMELINE-001` (ROUTINE).
- **Open risks:** clip-path clips anything that overflows a card or button (none found in
  review). The @fontsource packages stay installed only for Weekly; remove them when Weekly
  moves to HUD after the F1 review. `npm run factory:status` needs `GITHUB_TOKEN`. 56 merged
  branches plus `codex/dup-meal-001`/`codex/duplicate-meal-prompt` and now `claude/hud-001`
  still await deletion by Gavin; then clear `docs/agent/RETIRED_BRANCHES.json`.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. Start BACKUP-AUTO-001 (automatic backup) next: **A. Yes, build it (recommended)** · B. Build
   something else first (say which) · C. Hold.
