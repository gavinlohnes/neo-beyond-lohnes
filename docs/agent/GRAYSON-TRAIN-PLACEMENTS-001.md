# GRAYSON-TRAIN-PLACEMENTS-001 — MY PROGRAMME below the live workout; Gym-mode Delta above SET DETAILS

- **Owner authorization:** Gavin, 2026-11-23: "Move the Train my Program down." The second item is the #628 review's
  placement note, carried in the same approved batch (C4.6 batch; water target shipped separately as #629).
- **Lane:** PROTECTED (TRAIN composition). Independent exact-head review, green CI, Gavin's merge. **Builder:** Claude
  Code. **Starting commit:** master `9e94946a`. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** mid-workout the live set leads TRAIN and MY PROGRAMME is still there, one scroll down; in Gym
  mode at 320 px Delta's suggestion appears right after LOG without scrolling.
- **Rules:** before a workout MY PROGRAMME stays where it was; during a live workout (WORKOUT view) the same panel
  renders at the bottom of TRAIN, fully usable (edit, activate, clear). Gym mode renders Delta's panels directly after
  LOG / SKIP, before SET DETAILS. Nothing is removed and no behaviour changes.
- **REUSE:** the existing `TrainingProgrammePanel` and `DeltaPanels`. **OWN:** two placements. **BUILD FROM
  SCRATCH:** none.
- **Acceptance:** browser test (DOM order: live set before MY PROGRAMME, which still offers EDIT PROGRAMME; Delta
  before SET DETAILS in Gym mode); existing TRAIN, programme, Gym, resume-fold, 16 px and framing suites.
