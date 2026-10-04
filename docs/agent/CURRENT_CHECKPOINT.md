# Current Checkpoint — the handoff note

**Every agent reads this first and updates it last** (see `AGENTS.md`, "Builders: one baton").
Replace the snapshot below wholesale each time; don't append history. It reports state; it
doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

**As of 2026-10-04, written by Claude Code.** `origin/master` at `b25a95b` (PR #150 merge).

## Baton

- **Holder:** Claude Code.
- **In flight:** one PR from branch `ccr-22d7c0f8-rqhhjm`: UNDO-001 (undo after every water,
  sleep, weight and protein log) plus this agent-handoff setup. Waiting on owner review.
- **Next:** nothing approved yet. The Queue in the roadmap is empty until the owner picks.

## Where things stand

- **BEYOND 1.0:** the seven roadmap Drops, launch polish and the field-test weekend Drops are all
  merged (PRs #118–#148). FIELD-NAV-001 (tabs open at the top, reveals land in view) merged as
  #149 and #150.
- **Field test:** the Oct 16 debrief is dropped (owner ruling 2026-10-04); BEYOND keeps improving
  now. Formerly date-gated items still need their own owner brief.
- **Tests:** `npm run verify` green: 163 files, 1,887 tests (node + real Chromium), PWA build.
- **Deployed:** GitHub Pages deploys on every merge to master.

## Known loose ends

- Field-test friction still open: TODAY's no-check-in card says "…for this BeyondDay. Guidance
  remains deterministic, but less informed." (developer wording); that card's ALL GOOD button is
  red (`btn-primary`). Not yet approved for work — see the roadmap's "Known, not yet approved".
- Codex's factory automation from 2026-10-03 (`scripts/factory-*.mjs`, the Builder App
  workflow, campaign manifests) is still in the repo. `ACTIVE_DROP.md` and
  `node scripts/factory-drop.mjs` remain the one-active-Drop lock; nothing else in it is
  required for a Drop.
- About 40 old branches remain on GitHub. Harmless; deleting them needs the owner's go-ahead.
- On Android, new home-screen shortcuts appear only after the app updates; if missing, remove
  BEYOND from the home screen and add it again.
