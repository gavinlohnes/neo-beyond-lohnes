# Current Checkpoint

Short, replaceable snapshot of where BEYOND stands. Replace it wholesale at the next checkpoint;
don't keep appending. It reports state; it doesn't authorize work. For what to build next, read
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

**As of 2026-09-30.** `origin/master` at `54bd9ed` (PR #124 merge). Replaces the 2026-09-15
snapshot (CHECKPOINT-003, baseline `e066a24`).

## Where things stand

- **Plan:** BEYOND 1.0 is defined in `docs/ROADMAP_1.0.md` (owner rulings 2026-09-30): seven
  Drops, then two weeks of field use.
- **Builder:** Claude Code is the sole builder (see `CLAUDE.md`). On "let's work", propose the
  next Drop from the roadmap, wait for approval, build, open a PR, report.
- **Drop 1 (Declutter I):** done (PRs #118, #119).
- **Drop 2 (Declutter II):** done (PR #120).
- **Drop 3 (Tidy):** done (PR #121).
- **Drop 4 (TRAIN):** done (PR #122).
- **Drop 5 (BODY):** done (PR #123).
- **Drop 6 (quit tracker):** done (PR #124).
- **Launch polish:** built, in review (owner-added after a review against the Launch Vision
  prototype). Calmer TODAY, labels-only mono, neutral routine buttons, BODY/TRAIN tidy. Next:
  Drop 7 (tie together).
- **Recently shipped:** 16:30 day rollover plus rollover on app resume (#111, #112);
  MoreScreen unmount guard (#115); square corners on chamfered panels, Diagnostic detail opens
  inline, TodayScreen test-flake fix (#116); retired stale branches so new Drops can start (#117); START WORKOUT on
  TRAIN's first screen (#118).
- **Factory:** `docs/agent/ACTIVE_DROP.md` reads TODAY-QUICKACTIONS-001, CLOSED. 18 finished
  branches that agent sessions can't delete are listed in `docs/agent/RETIRED_BRANCHES.json`;
  the ACTIVE-Drop check passes against all live branches.
- **Tests:** `npm run verify` green on master (118 files, about 1,530 tests, production build).

## Known loose ends

- About 37 old branches remain on GitHub. They're harmless; deleting them needs a session with
  wider GitHub access, and the owner's go-ahead.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `.claude/skills/beyond-drop/SKILL.md` §8 still
  describe a Claude + Codex multi-agent model. Per the 2026-09-30 ruling in `CLAUDE.md`, that role
  language is historical until those files are updated.
