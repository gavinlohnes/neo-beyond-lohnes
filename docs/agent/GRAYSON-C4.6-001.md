# GRAYSON-C4.6-001 — Water target, and two TRAIN placements (one batch)

- **Owner authorization:** Gavin, 2026-11-23: "C4.6, a water target. Is a great idea. Move the Train my Program
  down. Let's work." The batch also carries the #628 review's Gym-mode placement note. Merge stays with Gavin.
- **Lane:** PROTECTED (stored target field, C4.6; TRAIN composition). Independent exact-head review, green CI,
  Gavin's merge. **Builder:** Claude Code. **Starting commit:** master `59ffdca5` (rebased after #628 merges).
- **Operator benefit:** his own water target beside what he's logged, on TODAY and in the water sheet, with no
  default number and no nagging; and mid-workout the live set leads TRAIN, with MY PROGRAMME still one scroll away.

## Item 1 — C4.6 water target (campaign plan C4.6)
- `waterTargetOz` (16–300 oz, integer), optional and additive on the existing nutrition-targets row; set in
  MORE → targets; blank clears it. No Dexie version change; older rows and backups read as "no target".
- TODAY's WATER tile: "48 / 100 oz", TARGET MET once reached; the existing pace words (BEHIND PACE against his usual)
  are unchanged and still win when behind. The water sheet: "48 of 100 oz today · 52 to go." / "Target met: …".
- Unset: nothing shown anywhere, no prompt to set one.

## Item 2 — TRAIN placements
- During a live workout, MY PROGRAMME moves below the live workout (still fully usable; nothing removed).
- Gym mode: Delta's suggestion sits right after LOG / SKIP, above SET DETAILS, so it's visible at 320 px without
  scrolling (#628 review note).

- **REUSE:** the nutrition-targets row, its validation and partial-update convention (like `calorieFloorKcal`), the
  TODAY tile and water sheet; existing TRAIN components. **OWN:** `waterTargetLine`, the tile wording, two placements.
  **BUILD FROM SCRATCH:** none.
- **Exclusions:** no default target, no notification, no Engine or recommendation input, no pace-model change.
- **Acceptance:** target save/keep/clear/range/legacy-row tests and wording; browser at 320/360/412 px (tile, sheet,
  TARGET MET, nothing without a target, axe, no overflow); TRAIN placement tests.
