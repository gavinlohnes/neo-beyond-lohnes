# EXP-STATS-001 — honest statistics for personal experiments

- **Authorization:** Gavin, 2026-11-15, approved the overnight plan whose Wave 3 includes "honest statistics for
  experiments" ("Approved. If you have anything you want to change ask me and I'll decide."). Bounded: report the
  experiment effect with an uncertainty range, the number of days in each arm, and say plainly "not enough data yet" /
  "can't tell yet" when samples are too small or the range crosses zero, instead of declaring a winner. Pure functions
  in the application layer with unit tests; minimal wording changes in the existing experiment result view. No Engine
  rule changes, new alert kinds, migrations/schema changes, or new dependencies. Do not merge.
- **Builder:** Grok Bot. Branch `codex/exp-stats-001` from fetched `origin/master` `abd9dc71` (#555 merged).
  Worktree `/workspace/exp-stats`. Fast-forwarded onto `44a1c5b0` after Gavin merged #556 (2026-11-15 18:42 CT),
  before push; no code overlap.
- **Lane: FEATURE.** Honest readout of the existing LOOP TRY comparison. `npm run check:risk` may suggest PROTECTED
  only because this brief, the LOOP/capability-map notes and the checkpoint sit on governance paths; those record the
  approved objective and the comparison's wording, and amend no doctrine or authority. Semantically: no Engine, schema,
  event, persistence, backup, permission, provider, navigation or dependency change; experiments are still never an
  Engine input. Normal review, green CI, Gavin merges.
- **Overlap check:** #556 work-run re-draft merged as `44a1c5b0` while this branch was in flight (checkpoint-only
  conflict; resolved by making this the current section and #556 historical). Open PRs #557 (capture parity) and #558
  (follow-ups) do not touch `tryExperiment.ts` or the Experiments view. No competing experiment-stats branch. The
  existing TRY feature (#309) is on master; this tightens its comparison, it does not add a new one.

## What changes

- **`meanDiffInterval` / `diffVerdict`** in `src/application/tryExperiment.ts` (pure). A Welch 95% interval on the
  difference of means (experiment days − usual days of the same kind), using the same `PICTURE_MEAN_FLOOR` (3) each
  side already needed for a mean. No new dependency: a short t critical table, interpolated for Welch's non-integer df.
- **`experimentResult`** still compares main sleep and check-in energy, with day counts, plus the training count line.
  Each sleep/energy line now also carries the range (widened when rounded, so display rounding cannot hide a zero
  crossing). Verdicts:
  - fewer than 3 recorded days with that measure on either side: no line; if neither measure qualifies, "not enough
    data yet" and what is missing (same need sentence as before);
  - the range includes both zero and a gap at or beyond 15 min of sleep / 0.3 energy: "can't tell yet", with the point
    estimate and range — no winner;
  - the whole range stays inside that small band, or the range excludes zero but the point is still inside the band:
    "about the same", with the range;
  - otherwise: "X min more/less" or "Y higher/lower", with the range.
- **UI:** the existing result list; "Not enough data yet: this needs …"; one clarifying clause on the "pattern, not
  proof" line. Closing outcomes and TODAY's quiet "Trying:" line are unchanged.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** LOOP TRY (`experimentResult`, Whole Picture rows, `PICTURE_MEAN_FLOOR`, the 15 min / 0.3 "about the same"
  bands, the Experiments card). Welch's interval for a difference of means (standard, no library).
- **OWN:** the verdict rule that refuses to name a winner when the range still includes zero and a meaningful gap, and
  the plain-language range wording.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- `tests/integration/tryExperiment.test.ts` (node; run under `TZ=UTC` and `TZ=America/Chicago`): existing journal
  window/close cases; a clear sleep difference now carries its range and no longer over-claims the energy gap; overlapping
  samples say "can't tell yet"; a tight range says "about the same"; a large clean gap still names the direction with
  its range; thin samples still say what is missing; `meanDiffInterval` refuses a short arm, returns a point interval
  when there is no spread, and matches a textbook overlapping example; t critical values for df 1, 2, 4, 30, 60.
- Browser: `TryExperiment` — the empty-state line now reads "Not enough data yet".
- Full gate `TZ=UTC npm run verify`; PR CI. Gavin merges.

## Deferred

- A formal equivalence test (TOST) or a bootstrap interval (Welch is enough for these small daily samples).
- Intervals on the training-count line (it remains a count, not a winner).
- Using days outside the Whole Picture window (the existing comparison's horizon is unchanged).
