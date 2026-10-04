# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** Baseline `origin/master` at `3f6903e` (PR #159 merge).

- **Drop:** `HUD-001` HUD design system — ARCHITECTURAL, `ACTIVE`. Built; awaiting a separate
  review session and Gavin's merge.
- **Branch:** `claude/hud-001` (worktree `../beyond-worktrees/claude-hud-001`). **PR:** see
  `docs/agent/ACTIVE_DROP.md` once recorded, or `gh pr list --head claude/hud-001`.
- **Done:** black #000 ground; every red role resolves to `--red` #D0141B; cut corners
  (`--cut-shape`) on `.card` and `.btn-primary/-secondary/-danger`, with the 1px diagonal drawn
  back in; bracket ticks on `.equipment-row` frames; `--radius: 0`; Chakra Petch + JetBrains Mono
  self-hosted in `public/fonts/` (OFL licenses beside them; build rewrites the base path; the
  service worker precaches them; no CDN). #D0141B is ~3.8:1 on black, so small red text became
  white with a red stroke (`.meta--error` for error lines, status strip, restore label, active
  RESET/SHIFT DOWN label); `--text-3` lifted to #808080 for AA. Weekly keeps the old look via
  `.hud-legacy` on MORE's Weekly wrapper (no Weekly/F1 file touched). Browser theme and PWA
  colors set to #000.
- **Tests:** new `tests/browser/Hud001.test.tsx` (axe color-contrast enabled on TODAY GREEN/RED,
  TRAIN, BODY, MORE; no red but #D0141B anywhere on those screens; Weekly's ground, faces and
  corners unchanged). Four existing tests updated for the new red/face values only.
- **Verification run:** `npm run check:architecture` OK; `npm run typecheck` OK; full
  `npx vitest run`: 1,931 passed, the only failures were 13 `tests/factory/factoryDrop.test.ts`
  timeouts on Windows (git-heavy fixtures; all 39 pass with `--testTimeout 60000`, untouched by
  this Drop); `npm run build` OK; `check:risk` OK; `git diff --check` OK. Checked in the browser
  at 360 px; screenshots in `docs/agent/screenshots/HUD-001/`.
- **Left:** independent review at the PR's exact head; Gavin approves the merge; then
  `node scripts/factory-drop.mjs close HUD-001 --integration-sha <merge sha>`.
- **Open risks:** clip-path clips anything that overflows a card or button (none seen in tests or
  at 360 px). The @fontsource packages stay installed only for Weekly; remove them when Weekly
  moves to HUD after the F1 review. `npm run factory:status` needs `GITHUB_TOKEN`. 56 merged
  branches plus `codex/dup-meal-001`/`codex/duplicate-meal-prompt` still await deletion by Gavin;
  then clear `docs/agent/RETIRED_BRANCHES.json`.
- **Next in Queue after HUD-001:** `BACKUP-AUTO-001` (ARCHITECTURAL), `PR-CARDS-001`,
  `BODY-TIMELINE-001` (ROUTINE). All have written Drops.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. HUD-001 after review: **A. Merge as is (recommended)** · B. Merge, but tune a detail first
   (say which) · C. Hold.
