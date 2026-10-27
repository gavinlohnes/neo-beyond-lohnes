# ROTATION-002 — BEYOND understands your rotation (Tracks A + B)

- **Authority:** Gavin, 2026-10-27: "Go A + B", approving the proposal in this session:
  Track A = ROTATION-001 phases 1b (sleep timing per day) and 2 (patterns across a run, with sample
  sizes); Track B = DELTA-ADVANCED items 3 (unusual against your own range) and 4 (rotation-aware
  next window) as readings only, ahead of item 1 (experiments). Also approved: first fix the flaky
  test that blocked the #296 deploy. Spending is out of BEYOND ("Elle and I track finances
  elsewhere").
- **Builder / branch:** Claude Code; `ccr-0be4f40f-16m0ja` from `fa5cdd8` (#296 merged).
- **Lane:** FEATURE (DEV-FLOW-002): owner-approved display capability. No Engine input, recommendation or priority change, no new
  event/command/table/migration, no dependency, no provider. Every merge is Gavin's.
- **REUSE:** Whole Picture's lived-day rows, day inspector and Rotation tab (`RotationMap.tsx`);
  Garmin sleep revisions (exact start/end) and the scheduled shift window
  (`livedDayShiftWindow`, as SLEEP-FILING-001 uses it); measured per-period series
  (`measuredSeries.ts`) and TODAY's Garmin tiles/sheets; Week Ahead forecast; `PICTURE_MEAN_FLOOR`
  abstain floor. Proven pattern: the circadian actogram (one row per day on a fixed 24-hour axis,
  sleep and work as bars), used in sleep medicine and shift-work research.
- **OWN:** run-position statistics (shift 1, 2, … / day off 1, 2, …), the multi-day
  out-of-range rule against the operator's own history, and the next-window reading.
- **BUILD FROM SCRATCH:** a small SVG actogram and the run-position/unusual projections. No
  library fits a 24-row, two-bar, offline, themed chart better than ~60 lines of SVG.

## Track A — how your nights really go

- **1b timing:** each lived day in the Rotation tab shows when main sleep happened beside the
  scheduled shift, on a 24-hour actogram. Exact times come only from Garmin records still backing
  that day's main sleep; a manual entry has a duration but no timing and says so. Shift bars show
  the scheduled hours for recorded work days and are labelled scheduled.
- **2 patterns:** per run position, mean main sleep, mean check-in energy and workouts, each with
  its sample size. A mean needs `PICTURE_MEAN_FLOOR` (3) runs; below that it says how many more.
  The oldest run is left out of positions when the 56-day window cuts it. Patterns, never causes.
  Every position opens the days behind it.

## Track B — BEYOND notices for you

- **Unusual for you:** resting HR, Garmin main sleep and steps (by day kind). Speaks only when the
  last 3+ finished lived days are all outside your own usual range on the same side: 10th–90th
  percentile of the measured days before them, widened to a minimum (6 bpm, 60 min, 2,000 steps);
  28 periods and ≥14 samples, or 56 periods and ≥10 of the same kind for steps. Silent
  otherwise. Shown on the existing TODAY tile label and in its sheet with the range and days.
- **Next window:** the next predicted days off from Week Ahead (labelled a forecast), days since
  the last counted workout, and, when runs support it, which day off you trained on most often.
  Suggests, never schedules or ranks.

## Excluded

Engine/recommendation/priority changes (sleep-aware Engine stays Protected), experiments, new
records or writes, notifications, scores, causal claims, spending, AI.

## Acceptance

Projection unit tests (floors, truncated runs, ambiguous/manual sleep, silence, same-side rule);
browser tests for the actogram, patterns, tile notice and sheet; 320/390 px and desktop
screenshots; typecheck, architecture, build, full verify, green CI, independent exact-head review,
then Gavin's merge.

## Evidence / next

Unit: rotation projection 5/5, copy 2/2, unusual rule 5/5. Integration: Garmin timing 3/3,
mode-pin expiry 8/8 (new clock-after-reads regression fails before the fix). Browser: Rotation
patterns 4/4 and unusual tiles 3/3 incl. axe at 320/390/1280. Flake: reproduced once under full
load (pin cleared, header steady on "Per schedule"); fixed at the only clearing path.
Screenshots: `docs/screenshots/rotation-002/`. Full verify, CI and review: PR.
