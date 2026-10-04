---
id: GYM-POLISH-001
baseline: 3ba21b60cacc175cd54a8eb1d0be7f1fd024d9e9
risk_tier: ROUTINE
---

# GYM-POLISH-001 // GYM SCREEN FOLLOW-UPS

## Mission

Fix the four non-blocking notes from the independent review of GYM-001 (PR #170). Gavin's "A",
2026-10-04: merge #170 as is, then do these as a quick follow-up.

## Approved baseline

`origin/master` at `3ba21b60cacc175cd54a8eb1d0be7f1fd024d9e9`.

## Risk classification

ROUTINE: gym screen UI only. No change to logging, rest, PR rules, Engine, data or dependencies.

## Authorized scope

- EXIT at least 56 px tall like the other main controls.
- Keyboard and screen reader: opening gym mode moves focus into it; Escape closes it; closing
  returns focus to the GYM MODE button.
- Wake lock: release any lock still held before taking a new one.
- A finished exercise (picked from TRAIN's exercise list) offers NEXT EXERCISE, which goes to the
  first exercise with sets left (TRAIN's own rule), instead of a dead end.

## Explicit exclusions

No new features, no cue text (GYM-002), no TRAIN behavior change outside gym mode.

## Relevant authority / references

PR #170 review comment; `docs/agent/drops/GYM-001.md`.

## Required invariants

Logging still goes through TRAIN's own handlers; EXIT keeps everything.

## Acceptance criteria

1. EXIT ≥ 56 px.
2. Focus moves into gym mode on open; Escape closes; focus returns to GYM MODE.
3. A held wake lock is released before a new one is taken (test).
4. NEXT EXERCISE appears for a finished exercise and moves on.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff.

## Reviewer expectations

A separate session checks the four fixes and that nothing else changed.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a fix needs a change outside the gym screen and its wiring.
