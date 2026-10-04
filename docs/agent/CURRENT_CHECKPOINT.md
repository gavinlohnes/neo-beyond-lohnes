# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `20872d7` (PR #153 merge).

- **Drop:** plain words on screen (owner ruling 2026-10-04), a small Routine fix; no Drop file.
- **Branch:** `ccr-22d7c0f8-rqhhjm`.
- **PR:** open, waiting on the owner.
- **Done:** developer terms removed from TODAY (check-in label, End Day card, Minimum Day, the
  no-check-in card); a source-level test keeps them out of the main screens. Red ALL GOOD stays
  by owner ruling.
- **Left:** merge; then the F1 field-test stop continues (to about Oct 25). The Queue is empty.
- **Verification run:** `npm run check:architecture`, `npm run typecheck`, full `vitest run`
  (168 files, 1,920 passed, 1 skipped), `npm run build`.
- **Open risks:** the no-check-in attention card is effectively unreachable since Shift Clock v1
  (CHECK_IN is a phase row in every phase where it would show); its wording is fixed anyway.
  FACTORY-PHASE-2 still reads APPROVED, with no PAUSED record.

## Where things stand

- **BEYOND 1.0:** the seven roadmap Drops, launch polish and the field-test weekend Drops are all
  merged (PRs #118–#148). FIELD-NAV-001 merged as #149 and #150; Undo after every log and the
  builder roles as #151; FOUNDATION-A-F1 as #152.
- **Field test:** the Oct 16 debrief is dropped (owner ruling 2026-10-04); BEYOND keeps improving
  now. Formerly date-gated items still need their own owner brief.
- **Deployed:** GitHub Pages deploys on every merge to master.

## Known loose ends

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
