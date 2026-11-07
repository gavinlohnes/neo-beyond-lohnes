# LIFE-PATTERN-001 phone evidence

Real 360 × 800 viewport captures of the built App in Chromium (`scripts/shoot-life-pattern.mjs`), not
full-page shots, so the fixed tab bar sits where it does on a phone. Synthetic, empty records only.

- TRAIN: `train-before-1/2.png` and `train-after-2/3.png`. The picker and START WORKOUT are unchanged
  (first screen). Below them, MY PROGRAMME and TRAINING SUMMARY take the shared section shape and
  PLANNED WORK moves last as the "more" fold.
- BODY (DATA tab): `data-before-1/2.png` and `data-after-1/2.png`. With nothing logged, CALORIES, PROTEIN and
  WATER say "Not logged" (as sleep and weight already did) instead of a bare 0. PROGRESS leads with one
  weight section and one way in (Weight history); the other progress views follow under MORE PROGRESS.
  DATA keeps its three sections in the same order.
- MORE menu: `more-before-1/2.png` and `more-after-1/3.png`. Each existing native group disclosure has a
  mono eyebrow, a plain heading, a short description and one way in. Destinations and their order are unchanged.
- Plans: `plans-before-1/2.png` and `plans-after-1/2.png`. Plan Today's selected task list and add-task form
  use the shared section shape. Empty lists stay kind, failed reads stay unavailable, and existing tasks and
  write paths are unchanged.
- Weekly review (Whole Picture): `review-before-1/2.png` and `review-after-1/2.png`. Slogans become plain
  lines ("What you recorded in this period, side by side."), headings say what a section holds, and
  empty counts read in words ("None", "No recorded days", "NONE RECORDED") instead of a bare 0.
