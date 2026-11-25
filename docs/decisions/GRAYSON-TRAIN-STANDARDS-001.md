# GRAYSON-TRAIN-STANDARDS-001 — record your standards tests (owner go, 2026-11-24)

Gavin's merge of the [brief](../agent/GRAYSON-TRAIN-STANDARDS-001.md) approves these.

- **One record event for all three tests:** `STANDARD_TEST_RECORDED` covers sit-and-reach (inches, to a quarter
  inch), one-minute sit-ups (reps) and the 1.5-mile run (seconds), so they share one history. This replaces RUN-001's
  note about a `TIMED_TEST` running kind, which never shipped. Sit-and-reach isn't a run.
- **Removal and fix use the shared void family:** a removal is `STANDARD_TEST_VOIDED`, the seventh member of
  FIX-UNDO-001's `*_LOG_VOIDED` family. That family's put-back (`LOG_VOID_UNDONE`), readers and History already handle
  it. A fix voids the old result and records the new one in one write, so the original stays in the log. Undo shows
  only after a fix or a removal (8 s).
- **No score charts or pass/fail:** each row shows the last result and its date, the one before, and the change in
  plain words. Practice sit-up sets stay practice. Bench is unchanged, still observed from his sets.
- **Targets are his own:** blank by default, set per test, and stored in `beyond.standardTargets.v1`. They travel with
  his settings as "Standards targets". A target reads as distance to go or how far past it he is, never pass or fail.
- **Timers write nothing:** the one-minute countdown buzzes once at zero; the stopwatch fills the time on STOP. Both
  run only while the sheet is open with the screen on.
