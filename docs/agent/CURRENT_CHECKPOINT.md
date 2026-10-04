# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `449c152` (PR #151 merge).

- **Drop:** FOUNDATION-A-F1 — lived-day series, personal baselines in Weekly (ACTIVE).
- **Branch:** `ccr-22d7c0f8-rqhhjm`.
- **PR:** #152 (it also carries the post-#151 handoff note).
- **Done:** `engine/livedDaySeries.ts` (shared primitive), `engine/personalBaselines.ts`, Day
  Ledger `entryCounts`, Ribbon on the shared grouping, Weekly's YOUR USUAL section, the water rule
  (2+ entries or one of 40 oz+), tests, decision-log entry.
- **Left:** independent review of the exact PR head, owner's go-ahead to merge, close the Drop,
  then the field-test stop (~3 work rotations) before any F2/F3/F4.
- **Verification run:** `npm run check:architecture`, `npm run typecheck`, full `vitest run`
  (167 files, 1,918 passed, 1 skipped, node + real Chromium), `npm run build`,
  `npm run check:risk` (Architectural, as contracted), `git diff --check`.
- **Open risks:** protein partial logging can still pass the 2-entry rule; the middle-half band
  means "below/above" will show some weeks by design; `factory-drop.mjs init/validate` refuses
  while stale unmerged branches (DECISIONS-001 and about 13 others) carry ACTIVE snapshots, so
  this Drop was activated by hand. FACTORY-PHASE-2 still reads APPROVED, with no PAUSED record.

## Where things stand

- **BEYOND 1.0:** the seven roadmap Drops, launch polish and the field-test weekend Drops are all
  merged (PRs #118–#148). FIELD-NAV-001 (tabs open at the top, reveals land in view) merged as
  #149 and #150.
- **Field test:** the Oct 16 debrief is dropped (owner ruling 2026-10-04); BEYOND keeps improving
  now. Formerly date-gated items still need their own owner brief.
- **Deployed:** GitHub Pages deploys on every merge to master.

## Known loose ends

- Field-test friction still open: TODAY's no-check-in card says "…for this BeyondDay. Guidance
  remains deterministic, but less informed." (developer wording); that card's ALL GOOD button is
  red (`btn-primary`). Not yet approved for work — see the roadmap's "Known, not yet approved".
- Codex's factory automation from 2026-10-03 (`scripts/factory-*.mjs`, the Builder App
  workflow, campaign manifests) is still in the repo. `ACTIVE_DROP.md` and
  `node scripts/factory-drop.mjs` remain the one-active-Drop lock; nothing else in it is
  required for a Drop.
- About 40 old branches remain on GitHub. About 14 still carry ACTIVE Drop snapshots, which
  blocks `factory-drop.mjs init/validate`. Deleting them needs the owner's go-ahead.
- On Android, new home-screen shortcuts appear only after the app updates; if missing, remove
  BEYOND from the home screen and add it again.
