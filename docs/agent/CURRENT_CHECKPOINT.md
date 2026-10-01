# Current Checkpoint

Short, replaceable snapshot of where BEYOND stands. Replace it wholesale at the next checkpoint;
don't keep appending. It reports state; it doesn't authorize work. For what to build next, read
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

**As of 2026-10-01.** `origin/master` at `dfd1650` (PR #126 merge). Replaces the 2026-09-30
snapshot (baseline `33be435`).

## Where things stand

- **Plan:** BEYOND 1.0 is defined in `docs/ROADMAP_1.0.md` (owner rulings 2026-09-30). All seven
  build Drops and the owner-added launch polish are merged. Next and last: two weeks of field
  use, fixing whatever bugs the owner, then 1.0.
- **Builder:** Claude Code is the sole builder (see `CLAUDE.md`). During field use, each fix is a
  small PR the owner approves.
- **Shipped for 1.0:**
  - Drop 1 (Declutter I): PRs #118, #119.
  - Drop 2 (Declutter II): PR #120.
  - Drop 3 (Tidy): PR #121.
  - Drop 4 (TRAIN): PR #122.
  - Drop 5 (BODY): PR #123.
  - Drop 6 (quit tracker): PR #124. Adds the `quitHabits` table, Dexie v12.
  - Launch polish: PR #125.
  - Drop 7 (tie together): PR #126.
- **What each Drop built:** the as-built notes in `docs/UX_DECISIONS.md` record each one.
- **Deployed:** GitHub Pages deploys on every merge to master; the PR #126 deploy succeeded.
- **Tests:** `npm run verify` green on master (126 files, about 1,606 tests, production build).

## Known loose ends

- After a deploy that changes the web-app manifest, Android only picks up new home-screen
  shortcuts once the app has updated. If they don't appear, the owner removes BEYOND from the home
  screen and adds it again.
- About 37 old branches remain on GitHub. They're harmless; deleting them needs a session with
  wider GitHub access, and the owner's go-ahead.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `.claude/skills/beyond-drop/SKILL.md` §8 still
  describe a Claude + Codex multi-agent model. Per the 2026-09-30 ruling in `CLAUDE.md`, that role
  language is historical until those files are updated.
- `docs/agent/ACTIVE_DROP.md` still reads TODAY-QUICKACTIONS-001, CLOSED. The roadmap Drops were
  run straight from `docs/ROADMAP_1.0.md` and didn't use that factory file.
