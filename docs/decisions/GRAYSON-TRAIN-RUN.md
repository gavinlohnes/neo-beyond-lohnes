# GRAYSON-TRAIN-RUN — running sessions and his editable run/walk plan (owner go, 2026-11-24)

Gavin merged the [brief](../agent/GRAYSON-TRAIN-RUN-001.md) (#640), which approves these defaults.

- **Plan:** the NHS Couch to 5K interval pattern, 9 weeks × 3 runs, each with a 5-minute warm-up and cool-down walk.
  Structure only, cited; no NHS audio or branding. After week 9: "Foundation done: 30 minutes running. The 1.5-mile
  phase comes next." Nothing past that is invented.
- **Week:** 2 runs expected, a third optional, Monday–Sunday by lived day. Information only; never "missed".
- **Moving on:** only on his tap after a COMPLETED run (Move on / Repeat, with Undo). Partial or stopped runs offer
  Repeat only. The position is derived from events; jump to any run from the plan.
- **Cues:** on-screen countdown and a buzz at each change, screen kept awake. No speech or locked-phone cues (B3).
- **Pain:** one always-visible control ends the run as partial, with TRAIN's no-diagnosis line.
- **Counts toward:** TRAIN history and this plan only. Not lift progression, PRs, A/B/C, Gym mode, C4.4, MINIMUM DAY
  or TODAY.
- **His to change:** every run's intervals (his version, NHS reset per run or whole plan, undoable), runs a week
  (1–4), the optional extra, the week's start day, the three cue switches, and any past run's status, minutes, day
  or removal. All append-only events, carried by the backup.
- **Records:** one additive table (`runningSessions`, Dexie v27) and nine `RUNNING_*` events. Standards tests are a
  separate event (GRAYSON-TRAIN-STANDARDS-001), not a `TIMED_TEST` kind here.
