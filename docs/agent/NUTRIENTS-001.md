# NUTRIENTS-001 — fiber and sodium

- **Authorization:** Gavin, 2026-11-19. First "1 through 5 are approved" (item 3), then, when told it needs new
  stored fields (a Protected schema, event and backup change), "2. A" (Yes, build it).
- **Lane:** PROTECTED, for backed-up data: new optional fields on `SavedMeal` and the `MEAL_LOGGED` payload. It needs
  independent exact-head review and green CI, and **Gavin merges**: the merge delegation excludes Protected PRs.
- **Origin:** HARVEST-001 backlog #6. The free food databases already send fiber and sodium, and BEYOND dropped them.

## What changes

- **Capture:**
  - USDA FoodData Central nutrient 1079 (fiber, g) and 1093 (sodium, mg), and Open Food Facts `fiber_*` and
    `sodium_*` (sodium given in g, kept as mg). Both are read when present.
  - A food without them still qualifies, as before.
- **Storage:** optional `fiberG` and `sodiumMg` on saved meals, and on each logged meal, scaled by servings.
  - Absent means not recorded, never 0.
  - Validation refuses negatives.
  - There is **no Dexie version or migration** (the fields aren't indexed) and **no backup format change**: the
    native backup copies records whole, and older backups restore exactly as before.
- **Corrections:** once a meal is corrected, its fiber and sodium read as not recorded (Gavin, 2026-11-19, "1A", on the
  review's flag that they would go stale). This is read side only; the stored values are untouched. Manual entry doesn't
  ask for them yet.
- **Shown:**
  - MEAL's day line: "Fiber 10.1 g · Sodium 6 mg · from 1 of 2 meals", only when a meal recorded them.
  - The CSV meals file gains `fiber_g` and `sodium_mg`, with empty cells where a meal didn't record them.
  - No target, no "too much" or "too little", and no change to the Engine or advice.

## Reuse

- **REUSE:** the existing food lookups, the saved-meal and meal-log path and its serving scaling, `getFoodDiary`, and
  EXPORT-001's meals file.
- **OWN:** the two optional fields and their mapping.
- **BUILD FROM SCRATCH:** none.

## Verification

- `tests/integration/nutrients001.test.ts` (Node, UTC and America/Chicago):
  - parsing from both databases, including foods without the nutrients;
  - storage and scaling, with an older meal having none;
  - day totals with meal counts, and null when none;
  - a correction keeps them;
  - the CSV columns and empty cells;
  - negatives refused.
- `tests/browser/Nutrients001.test.tsx`: a backup and restore round trip keeps them (and a meal without them), and
  the MEAL sheet's line at 16 px.
- The whole Node suite passes (307 files, 2513 tests), including the protected historical backup fixtures, which
  are unchanged. RestoreCompat, CommandCenterLog and Export001 pass too. PR CI runs the full suite.
