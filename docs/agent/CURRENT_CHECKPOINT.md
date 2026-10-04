# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-04 by Claude Code.** `origin/master` at `449c152` (PR #151 merge).

- **Drop:** none active. Last finished: UNDO-001 (undo after every water, sleep, weight and
  protein log) and the builder-roles setup, merged as PR #151.
- **Branch:** none in flight (`ccr-22d7c0f8-rqhhjm` carries only this note).
- **PR:** this handoff update only.
- **Done:** UNDO on BODY's and TODAY's log banners, `*_LOG_VOIDED` events, undone entries leave
  every total. `AGENTS.md` is the shared rulebook: Claude Code primary builder, Codex backup.
- **Left:** the Queue in the roadmap is empty. When the owner picks the next item, Claude Code
  writes its Drop in `docs/agent/drops/` so Codex can build it if Claude is out.
- **Verification run:** on #151: `npm run check:architecture`, `npm run typecheck`, full
  `vitest run` (163 files, 1,887 passed, 1 skipped), `npm run build`; PR Verification green.
- **Open risks:** none known. UNDO-001 added new event types read by the Engine's Day Ledger
  (owner-approved); watch BODY and TODAY totals after an UNDO during field use.

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
- About 40 old branches remain on GitHub. Harmless; deleting them needs the owner's go-ahead.
- On Android, new home-screen shortcuts appear only after the app updates; if missing, remove
  BEYOND from the home screen and add it again.
