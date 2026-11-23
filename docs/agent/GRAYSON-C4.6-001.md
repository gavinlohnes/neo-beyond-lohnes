# GRAYSON-C4.6-001 — Water target

- **Owner authorization:** Gavin, 2026-11-23: "C4.6, a water target. Is a great idea. Move the Train my Program
  down. Let's work." Gavin chose to ship the water target alone first ("A"); the two TRAIN placements follow in a
  separate PR after #628 merges. Merge stays with Gavin.
- **Lane:** PROTECTED (stored target field, C4.6). Independent exact-head review, green CI,
  Gavin's merge. **Builder:** Claude Code. **Starting commit:** master `59ffdca5`. **Branch:** `ccr-380c4225-water`.
- **Operator benefit:** his own water target beside what he's logged, on TODAY and in the water sheet, with no
  default number and no nagging.

## C4.6 water target (campaign plan C4.6)
- `waterTargetOz` (16–300 oz, integer), optional and additive on the existing nutrition-targets row; set in
  MORE → targets; blank clears it. No Dexie version change; older rows and backups read as "no target".
- TODAY's WATER tile: "48 / 100 oz", TARGET MET once reached; the existing pace words (BEHIND PACE against his usual)
  are unchanged and still win when behind. The water sheet: "48 of 100 oz today · 52 to go." / "Target met: …".
- Unset: nothing shown anywhere, no prompt to set one.

- **REUSE:** the nutrition-targets row, its validation and partial-update convention (like `calorieFloorKcal`), the
  TODAY tile and water sheet. **OWN:** `waterTargetLine` and the tile wording.
  **BUILD FROM SCRATCH:** none.
- **Exclusions:** no default target, no notification, no Engine or recommendation input, no pace-model change.
- **Acceptance:** target save/keep/clear/range/legacy-row tests and wording; browser at 320/360/412 px (tile, sheet,
  TARGET MET, nothing without a target, axe, no overflow).
