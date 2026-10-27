# ROTATION-003 — flip planning (suggestions only)

- **Authority:** Gavin, 2026-10-27: "go flips", after the proposal: before a switch into or out of a
  work run, show how your own past flips went, with sample sizes; suggestions only.
- **Builder / branch / lane:** Claude Code; `ccr-0be4f40f-16m0ja` from `c03eff3` (#298 merged);
  FEATURE (display only). Every merge is Gavin's.
- **REUSE:** ROTATION-002 runs, sleep timing and actogram; Whole Picture rows; day ledger naps;
  Week Ahead forecast; `RUN_MEAN_FLOOR`; DELTA-004 `unlockGoal`. Proven pattern: aligned actograms
  (rows lined up on the transition day), as shift-work studies plot schedule changes.
- **OWN:** flip extraction (days off → work run, work run → days off) and per-kind summaries.
- **BUILD FROM SCRATCH:** none beyond the projection; the actogram is reused.

## What it shows

- **Flips** section in Rotation, two kinds:
  - **Into work:** the last day off, shift 1 and shift 2 of each recent flip, as an aligned
    actogram; median sleep times on the day before and on shift 1 (each needs 3 Garmin-timed days);
    how many of those days before had a nap.
  - **Out of work:** the last shift, then days off 1–3: median sleep times on days off 1 and 2.
- A nap comparison (sleep and energy over shifts 1–2 after a day before with or without a nap)
  appears only with 3 flips each way; otherwise it states the counts. A pattern, never a cause.
- The next-window card adds one line when the forecast's next run is a flip, pointing to it.

## Excluded

Engine/recommendation changes, scheduling, notifications, TODAY's main view, new records, causal
claims, prescribing sleep times.

## Acceptance

Projection unit tests (flip kinds, unknown context breaks a flip, floors, nap gating); browser tests
at 320/390/1280 with axe; screenshots; full verify; CI; Gavin's merge.
