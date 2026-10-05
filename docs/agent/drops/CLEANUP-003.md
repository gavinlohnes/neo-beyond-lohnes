---
id: CLEANUP-003
baseline: 70e2ec24ff346abb879bfd21f13efbf221885bc1
risk_tier: ROUTINE
---

# CLEANUP-003 // WORDS AND CLUTTER (WALKTHROUGH FINDINGS 5–10, 12)

## Mission

The rest of the walk-through findings, per Gavin's ruling 2026-10-04 "Let's do B. All 13", plus the
Windows test timeouts noted during the day.

## Approved baseline

`origin/master` at `70e2ec24ff346abb879bfd21f13efbf221885bc1`.

## Risk classification

ROUTINE: UI wording, layout and one test file. Engine wording is translated on screen only (like
`capacityCopy.ts` already does); no Engine, schema, event or dependency change.

## Authorized scope

- **5:** the workout summary's "(was: not enough history yet)" reads "(was: first time)".
- **6:** TRAIN's advice reasons are shown in plain words through a display map (e.g. "Incomplete
  evidence last time (…)" → "Last time a set was skipped or short, so keep the same weight.").
- **7:** logged times in BODY show hours and minutes, no seconds.
- **8:** "How BEYOND decided": capacity reason codes use the existing plain labels, and "No
  higher-priority rule matched." reads "Nothing else needed attention first."
- **9:** the timeline's filter chips are outlined (filled only by a thin outline when on), not solid
  white; the 60-day weight chart hides while the timeline is open.
- **10:** TRAIN's "Planning to train today?" hides once a workout was finished today.
- **12:** MORE → Data safety: one BACKUP row with EXPORT BACKUP and SHARE BACKUP (the old ARCHIVE
  row's share), so BACKUP / AUTOMATIC BACKUP / ARCHIVE become BACKUP / AUTOMATIC BACKUP.
- **Tests:** `tests/factory/factoryDrop.test.ts` gets a 60 s per-test timeout (git-heavy fixtures
  time out on Windows at 5 s).

## Explicit exclusions

No new features; no change to what any rule decides; the share action itself is unchanged.

## Relevant authority / references

`docs/agent/WALKTHROUGH-001.md`; plain-words ruling (2026-10-04); `capacityCopy.ts` pattern.

## Required invariants

Every capability stays (export, share, planned-work answer before training); the Engine's own
strings are unchanged.

## Acceptance criteria

1. Each item above is visible as described (tests).
2. MORE still offers both export and share.
3. factoryDrop tests pass on Windows without a global timeout flag.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff.

## Reviewer expectations

A separate session checks each item and that no capability or Engine output changed.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a fix needs an Engine or data change.
