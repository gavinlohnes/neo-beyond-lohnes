# GRAYSON-FLAKES-003 — browser focus checks wait for focus instead of racing it

- **Authorization:** Gavin, 2026-11-26, 05:51 CT, **"Yes"** to putting Launch 1.0 at the top of the build order and
  briefing the flaky-test fix and the lighter-night card. 05:39 CT: **"I like the idea of the smaller launch. I think we
  shift into that mode."** This is Launch 1.0 piece **X1**, and it goes first: every 1.0 PR has to pass CI.
- **Lane: ROUTINE (tests only).** No app change unless a test exposes a real app race; then say so in the PR and keep
  that change to the race alone. Fresh-context reviewer; self-merge with green CI and that reviewer's PASS.
- **Starting commit:** `origin/master` `8258dbed` or later. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225` (it has no PR open; the TRAIN session is on B1).
  Branch `ccr-380c4225-flakes-003`. **Reviewer:** a fresh-context reviewer.
- **Order:** first in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) under Launch 1.0, ahead of DAY-TARGETS-001.

## Objective and benefit
Browser tests still fail at random on focus checks under full-suite load, mostly in shard 2. Each failure costs a
builder a re-run and Gavin a wait. Seen in the last three days:
- `RunningSession.test.tsx`: re-run twice on 2026-11-24 for focus timing (commits `27c60e9d`, `12010022`).
- `ExerciseNotes.test.tsx`: fixed once in #721 (focus returns on the next animation frame); the second check at
  line 102 is still synchronous.
- `SetFixSheet` (#727) and `SleepMetric` / `MealRoundTrip` (#637): same kind, fixed one at a time.

The pattern is the same each time: the test reads `document.activeElement` straight after an action, while the app
moves focus in an effect or on the next frame. On a busy runner the read wins the race. After this, every focus check
in `tests/browser` waits for focus the way #721 did, so this kind of flake stops for good instead of one file at a time.

## What to do
1. Every synchronous `expect(document.activeElement…)` in `tests/browser` (40 checks in 26 files at `8258dbed`) that
   follows an action becomes `await expect.poll(() => document.activeElement…)` or `await expect.element(x).toHaveFocus()`.
   A check that reads focus with no action before it may stay as it is; say which in the PR.
2. Where a test focuses an element itself and the screen moves focus on load (the SetFixSheet case), it first waits
   for that initial focus, as `openRecord` does since #727.
3. A test that taps TODAY before it settles awaits `todaySettled()` (`tests/browser/helpers/todaySettled.ts`).
4. Add one short note to the browser test setup or helpers: "Focus moves in effects and on the next frame: wait for
   it, never read it straight after an action."

## Rules (from CI-FLAKE-001, still in force)
Never skip, `.only`, loosen or delete an assertion. No blanket timeout or retry increase. A poll keeps the default
timeout unless a test already sets its own.

## Acceptance
- The full suite passes **5 consecutive CI runs** on the PR (re-run the workflow, don't push empty commits), with the
  run links in the PR body.
- The PR lists each file changed and what it waited for.
- REUSE / OWN / BUILD FROM SCRATCH in the body.

## Excluded
Failures that aren't timing: a wrong label, a strict-mode locator that matches two elements, an axe finding. Those
belong to the PR that caused them. At the time of writing, #730 (ROUTINE-EDIT-001) fails on two of its own (an axe
contrast finding in its new test, and the command search showing Machine Chest Press twice); they are #730's to fix,
not this brief's.

## Stop and ask Gavin if
- A test can only pass by changing what the app does, beyond a race.

## Risks
- **Hiding a real bug:** a poll that waits for focus that never comes still fails, so a real focus bug still shows.
