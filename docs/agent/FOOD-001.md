# FOOD-001 — MEAL works like MyFitnessPal, protein first

- **Authority:** Gavin, 2026-10-30: "make it closer to my fitness pal … use their idea and make it
  work for beyond", with three rulings: protein left as the headline, the day by time, barcode
  scanning with Open Food Facts. Recorded in `docs/UX_DECISIONS.md` (FOOD-001).
- **Builder / lane:** Claude Code; Protected (new external data provider, logging flow, servings
  rule), within the owner's go. Branch `ccr-0be4f40f-16m0ja`.

## Finding

BEYOND already had most of the pieces: saved meals ranked LIKELY NOW, QUICK ADD, SAME AS YESTERDAY,
and a USDA lookup hidden behind MORE → Hidden features. What it lacked against MyFitnessPal: the
diary's "remaining" number, searching every food from the meal sheet, any amount, and barcodes. The
owner's real record: food logged on 14 of 30 days, protein 25–96 g a day against 159 g.

## Scope

1. Diary header on MEAL: protein left, protein of target, kcal eaten, TODAY'S FOOD by time.
2. SEARCH ALL FOODS (USDA) on tap; a found food logs by grams or servings and is saved as a meal.
3. SCAN BARCODE: BarcodeDetector camera or typed number → Open Food Facts → the same amount page.
4. Any number of servings for saved meals (0 < servings ≤ 20, macros to one decimal).
5. Out of scope: meal slots, calorie goals, photo/AI logging, recipes built from several foods.

## Leverage

- **REUSE:** MyFitnessPal's diary/search/barcode/servings flow and MacroFactor's timeline; the
  existing saved meals, LIKELY NOW, `searchFoods` (USDA), `logMeal`; the browser's BarcodeDetector;
  Open Food Facts' public product API.
- **OWN:** protein-first remaining, the lived-day timeline, local-first search (online on tap).
- **BUILD FROM SCRATCH:** none — no new dependency, schema or stored food database.

## Tests

`tests/integration/foodLog001.test.ts` (diary, servings, barcode mapping and lookup) and
`tests/browser/FoodLog001.test.tsx` (diary header with axe, search all foods by grams, typed
barcode, any servings), with the network faked.
