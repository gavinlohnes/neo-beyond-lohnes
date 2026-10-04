# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code (low usage).** `origin/master` at `20872d7` (PR #153 merge).
Branch `ccr-22d7c0f8-rqhhjm`, last commit `21c0a15`, everything pushed. No unfinished work.

- **FOUNDATION-A-F1 is finished:** built, merged (PR #152) and closed. Nothing of F1 is left to
  build; it's in its field-test stop to about Oct 25. Don't start F2/F3/F4 before that.
- **Open PR:** #154, plain words on TODAY (owner ruling 2026-10-04). Complete, CI green, waiting
  only on the owner's merge. Codex never merges (`AGENTS.md`, rule 3).
- **Codex: there is no written Drop to build right now.** The roadmap Queue is empty. Stop and
  ask the owner what's next (`AGENTS.md`, rule 2).

### Checklist
1. [ ] Owner merges #154.
2. [ ] F1 field-test stop (~3 work rotations, to about Oct 25), then the debrief questions in
       `docs/agent/drops/FOUNDATION-A-F1.md` / `docs/UX_DECISIONS.md`.
3. [ ] Owner picks the next Queue item; Claude writes its Drop file so Codex can build it.

### Traps
- `factory-drop.mjs init/validate` was blocked by stale branches; fixed in #153 via
  `docs/agent/RETIRED_BRANCHES.json`. Agent sessions can't delete remote branches.
- Browser tests in a fresh cloud container may need a Chromium path workaround; CI is unaffected.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` (168 files, 1,920 passed,
1 skipped) · `npm run build` · `npm run check:risk -- <baseline sha>` · `git diff --check`

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
