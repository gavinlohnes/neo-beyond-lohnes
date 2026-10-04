# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `2052f3f` (PR #152 merge).

- **Drop:** none active. FOUNDATION-A-F1 (lived-day series, personal baselines in Weekly) merged
  as PR #152 and closed.
- **Branch:** none in flight (`ccr-22d7c0f8-rqhhjm` carries only this closure note).
- **PR:** this closure update only.
- **Done:** F1's shared lived-day series, YOUR USUAL in Weekly, the water rule (2+ entries or one
  of 40 oz+), Undo after every log, builder roles.
- **Left:** F1 field-test stop, about 3 work rotations (~3 weeks, to about Oct 25). At the stop,
  ask: did the ranges match how the days felt; did Gavin look at them unprompted; did one answer
  "is this low for me?"; was anything misleading (protein especially); was the evidence line
  enough; did Weekly feel heavier; should the band, floors or entry rules change. F2/F3/F4 wait
  for that. The Queue is otherwise empty.
- **Verification run:** on #152: `npm run check:architecture`, `npm run typecheck`, full
  `vitest run` (167 files, 1,918 passed, 1 skipped), `npm run build`; PR Verification green.
- **Open risks:** protein partial logging can still pass the 2-entry rule; "below/above" will
  show some weeks by design. FACTORY-PHASE-2 still reads APPROVED, with no PAUSED record.

## Where things stand

- **BEYOND 1.0:** the seven roadmap Drops, launch polish and the field-test weekend Drops are all
  merged (PRs #118–#148). FIELD-NAV-001 merged as #149 and #150; Undo after every log and the
  builder roles as #151; FOUNDATION-A-F1 as #152.
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
- Old branches: the owner approved deleting them (2026-10-04), but agent sessions can't delete
  remote branches. 55 are safe to delete (their work is in master, or their PR merged at their
  exact tip); 11 hold unmerged work and are kept (see the PR #153 description). The 18 merged ones
  that still read ACTIVE are pinned in `docs/agent/RETIRED_BRANCHES.json`, so
  `factory-drop.mjs init/validate` works again; drop their entries once they're deleted.
- On Android, new home-screen shortcuts appear only after the app updates; if missing, remove
  BEYOND from the home screen and add it again.
