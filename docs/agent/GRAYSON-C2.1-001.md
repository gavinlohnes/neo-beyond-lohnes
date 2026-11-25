# GRAYSON-C2.1-001 — Arrival in two taps (PREFLIGHT)

- **Owner authorization:** Gavin, 2026-11-23, on the proposal: "1, yes 2 yes" — (1) reading recent routine skips only
  to choose which single BEFORE SHIFT step to show, never a count or "missed" (his reading of ROUTINES-001);
  (2) STARTED WORK also marks last shift's handoff note read.
- **Lane:** PROTECTED (TODAY composition; a new reading of routine history). Independent exact-head review, green CI
  and Gavin's merge required. **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i` after #617.
- **Operator benefit:** arriving for the shift is STARTED WORK plus a glance: PREFLIGHT shows the note he left
  himself at the end of the last shift and the one routine step he's most likely to forget, then one tap clears both.
- **Rules:** PREFLIGHT only (the existing 90 minutes before the scheduled start). FROM LAST SHIFT is the existing
  unread handoff (NOTES-HANDOFF-001), shown only when one exists. DON'T FORGET is the active BEFORE SHIFT step he
  passed over most on days he did that routine in the last 14 days, at least twice, ties by the routine's order;
  days he didn't do the routine don't count, so not using routines never nags. It shows the step's own words only.
  STARTED WORK runs `markWorkStarted` then `markShiftHandoffRead` for the note on screen.
- **REUSE:** SHIFT-CHANGE-001's PREFLIGHT moment and STARTED WORK, NOTES-HANDOFF-001's unread note and read command,
  ROUTINES-001's ticks. Things' "This Evening" grouping as an idea only. **OWN:** `application/arrival.ts`
  (`easyToForget`, `getArrival`) and the two lines. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no schema, event, Engine, notification or routine-command change; no count, "missed" or streak; no
  change to TODAY's own handoff line or routine row.
- **Acceptance:** pure tests for the pick (most passed-over, threshold, non-use, ties, moment/status); browser on
  eight weeks of his rotation at 320/360/412 px (both lines shown, no count words, no overflow, axe; STARTED WORK
  records work start and the note read); PREFLIGHT suites (FullShift, FieldRehearsal, CaveBrief) unchanged; full suite.
