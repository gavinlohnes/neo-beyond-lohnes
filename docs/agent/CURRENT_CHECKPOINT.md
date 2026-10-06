# Current Checkpoint — the handoff note

**Every session reads this first and rewrites it last** (`AGENTS.md`, "Builder roles", rule 5),
Claude Code or Codex alike. Replace the handoff wholesale each time; don't append history. It
reports state; it doesn't authorize work. For what to build next, read the Queue in
[`docs/ROADMAP_1.0.md`](../ROADMAP_1.0.md).

## Handoff

**Written 2026-10-06 by Claude Code (builder).** Baseline `origin/master` at `7a36018` (PR #187,
ADVISORY-002 merged after independent review; closed in this branch).

- **Drop:** `FEEL-001` finish-and-feel pass: ROUTINE. **ACTIVE**, branch `ccr-a34b4863-xb2jzi`.
- **Done:** ADVISORY-002 closed (as-built entry, roadmap). FEEL-001 built:
  - A tab change arrives in 180 ms (fade + 6 px rise, the existing no-overshoot easing).
  - HUD section rules draw in from the left (240 ms) and frame bracket ticks draw down (200 ms),
    once, when they first show. Weekly (pre-HUD look) is left alone.
  - BODY's water and protein totals and TODAY's FUEL line count to their new value in 250 ms.
  - Haptics (`src/ui/feel/haptics.ts`): one 15 ms tap when a set is saved (LOG, in TRAIN and gym
    mode), one 30 ms tap when a hold-to-confirm completes (finishing a workout, ending the day,
    a clean day). No tap for a refused LOG, navigation or a plain press; nothing on iPhone.
  - Every enabled button has a press state (slight push in + brighter face).
  - Reduced motion keeps all of it instant (the existing global rule; tested).
  - Screenshots, 390 px wide: `docs/agent/screenshots/FEEL-001/` (TODAY, TRAIN, RECORDS, active
    workout, gym mode, BODY, BODY timeline, MORE, Weekly, History, Search). On full-page shots
    the fixed bottom bar shows partway down; that is the capture, not the app.
- **Left:** independent review, merge on green, close. Then BOOT-001.
- **Verification run:** `npm run verify` (190 files / 2044 tests passed, build OK);
  `git diff --check` OK; `check:risk` vs `7a36018`: Routine.
- **Open risks:** a PR set now taps once like every other saved set (PR-CARDS-001 said the PR tag
  has no vibration; the PR adds nothing of its own, and the test says so) — see decision 2. While
  a tab is animating in (180 ms), a full-screen overlay opened in that instant is offset by up to
  6 px. The BODY timeline draws 90 days even when weigh-ins cover fewer, so a short history sits
  at the right edge (unchanged, pre-existing). With an OBLIGATION_DUE recommendation the
  commitment's name shows twice on TODAY. Agent sessions clone shallow: `git fetch --unshallow
  origin` before `factory-drop.mjs init`. Carried over: raw capacity codes in "How BEYOND decided"
  with 2+ reasons; `factory:status` needs `GITHUB_TOKEN`; merged branches await deletion.

### Verification commands
`npm run check:architecture` · `npm run typecheck` · `npx vitest run` · `npm run build` ·
`npm run check:risk -- <baseline sha>` · `git diff --check`

### DECISIONS FOR GAVIN
1. **Week Ahead placement rule** (needed before WEEKAHEAD-001 is built):
   **A (recommended)** a workout on each day off, none on work days, A/B rotation, at most 2 days
   in a row · **B** as A plus a short session the morning after a last shift · **C** a fixed 3 per
   week, days off first.
2. **A PR set's tap:** **A (recommended, built)** the same single LOG tap as any set · **B** no tap
   at all on a PR set (strict reading of "PR: no vibration").
