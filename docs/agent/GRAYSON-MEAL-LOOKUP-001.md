# GRAYSON-MEAL-LOOKUP-001 — Delta logs meals from real numbers

- **Authorization:** Gavin, 2026-11-27. 21:23 CT: **"2 and 6 we can wait until 1.1"**; 21:28 CT: **"Add to 1.1"**, which
  put "Delta logs meals from real numbers" on the Launch 1.1 list in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md).
  22:17 CT: "We will just focus on getting to 1.1". 22:28 CT, on writing the 1.1 briefs: **"You start here and get
  ready for a builder to start."** His standing rule: **"I should be able to edit and tweak or correct everything in
  this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** It adds a field to `MEAL_LOGGED` events and saved meals (event semantics, backup and CSV), changes
  what Alfred may propose and how its numbers are filled (AI authority), and calls a new Open Food Facts endpoint. Gavin
  merges after green CI and a fresh-context reviewer's exact-head PASS posted on the PR.
- **Starting commit:** latest `origin/master` after X5 (GRAYSON-GARMIN-WORKOUTS-001) merges. Re-fetch before starting.
  Written against `9d83d915` (#755 merged).
- **Builder:** Claude Code, Delta-track session (the "Project Grayson codex notes" chat), which built FUEL rows F1 to F4.
  Branch `claude/grayson-meal-lookup-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** row L1 in the Launch 1.1 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md), first after X5. Builders
  take turns: nothing else is being built while this is.
- **Dexie:** no new version. `source` is a non-indexed field, so no index changes. Old records without it read as
  "not recorded".

## Objective and benefit
When he tells Delta what he ate, Delta should find the food's real numbers before it guesses, and the logged entry
should say where its numbers came from. Today it doesn't (checked in code at `9d83d915`):

- Alfred's `log_meal` tool (`src/application/alfred/alfredTools.ts`, REGISTRY `log_meal`) tells the model to "give your
  best macro estimate and say it is an estimate" for any food that isn't one of his saved meals. Alfred has no food
  lookup tool. Its read tools (`ALFRED_READ_TOOLS` in `src/application/alfred/alfredActions.ts`) are `search_records`,
  `day_entries` and `get_days` only.
- The free helper (`src/ui/components/AlfredSheet.tsx`, `ask()`) offers **FIND "x" FREE**, which only opens the meal
  sheet's search, and **ASK ALFRED TO ESTIMATE**, which is a paid guess.
- A logged meal doesn't record its source. `logManualMeal` (`src/application/nutritionCommands.ts`) writes name and
  macros only, and the meal sheet's `logFood` (`src/ui/components/RecordSheets.tsx`) keeps the source only as text in
  the saved meal's name.
- **A likely live bug in today's food search.** `searchFoods` (`src/application/foodLookupQueries.ts`) sends no
  `dataType`, so branded foods come back, and labels each result's numbers with the food's `servingSize` (for example
  "40 g"). USDA's branded documentation says branded nutrient values are "converted to a 100-unit basis, either gram
  (g) or milliliter (ml)" ([GBFPD documentation](https://fdc.nal.usda.gov/GBFPD_Documentation)). If search results
  follow that, a branded food's per-100 g numbers are shown and logged as per-serving numbers. Not yet confirmed
  against a live response: slice A's first step.

After this, "I had two eggs and a Kodiak cup" becomes a card with each food's real numbers and a plain source line,
one tap to log, one tap to fix.

## Recommended defaults (approved when Gavin merges this brief)
1. **Lookup order.** His own saved meals first (they are his numbers), then USDA FoodData Central (Foundation, SR
   Legacy, Survey and Branded; the builder takes the exact `dataType` values from USDA's
   [OpenAPI spec](https://fdc.nal.usda.gov/api-spec/fdc_api.html)), then Open Food Facts by name. Delta's own estimate
   only when nothing matches.
2. **BEYOND fills the numbers, not Delta.** Delta picks the match and the amount. BEYOND computes calories, protein,
   carbs and fat from the matched record, the same way `fix_entry` fills its card from the record. A proposal whose
   source is USDA or Open Food Facts can't carry numbers that differ from the record at that amount.
3. **The card says where the numbers came from**, in one line under the meal: "USDA · Egg, whole, cooked · 2 large
   (100 g)", "Open Food Facts · Kodiak Power Cup · 1 cup", "Your saved meal", or "Delta's estimate". When he didn't
   say an amount and Delta chose one, the line says "amount guessed".
4. **Tap to fix.** On the card: the amount is editable in place, **OTHER MATCHES** lists the next two matches, and
   **EDIT** opens the existing meal form prefilled. After logging, the entry is fixed through the existing
   correction path (`correctMealLog`, `fix_entry`).
5. **Confirm stays as today.** A saved meal still logs at once with UNDO (ALFRED-ACT-001). A looked-up food or an
   estimate stays a card until he taps LOG. A setting, off by default, logs a looked-up food at once with UNDO.
6. **The free helper looks it up too.** FIND "x" FREE runs the same lookup inline and shows the top match as a card,
   with no Alfred call and no cost. The full search sheet stays one tap away.
7. **Every entry keeps its source.** `MEAL_LOGGED` and saved meals gain `source` (`saved`, `usda`, `off`, `label`,
   `estimate`) and, when there is one, the record's id (FDC id or barcode). Shown on the entry in FUEL and HISTORY, in
   the records CSV and in backups. A correction keeps the source and marks the entry edited.
8. **His usuals come first.** "My usual breakfast" or "the usual" matches the saved meals he has logged most often at
   that time of day in the last 30 days, and the card names which one it picked.
9. **Gentle on free services.** Lookups are cached in memory for the session only (NUTRITION-002: no local copy of
   USDA's database). Open Food Facts is asked only when USDA has no good match, and at most 10 searches a minute, its
   published search limit ([Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api)). Offline,
   Delta says it couldn't look the food up and the card is marked "Delta's estimate".

## Everything is his to change
A FOOD LOOKUP card in settings, with **RESET**: lookup order (saved, USDA, Open Food Facts; each can be turned off),
whether branded foods are searched, log looked-up foods at once (off), "the usual" window (14, 30 or 90 days), and
whether the free helper looks foods up inline. Each entry's amount, numbers and source are editable, with UNDO.

## Slices
- **A. Search numbers are right.** Confirm with a live USDA response whether branded search results are per 100 g. If
  they are, scale branded values to the stated serving when its unit is g or ml, otherwise label them "per 100 g".
  Send `dataType` explicitly. Tests on recorded responses for each data type. This slice fixes today's meal-sheet
  search as well, so it may ship on its own first if Gavin asks.
- **B. Delta looks it up.** A `food_lookup` read tool (query and optional amount) returning up to three matches with
  per-serving numbers, serving text, source and id. `log_meal` gains `source` and `source_id`, and BEYOND refills the
  numbers from the record (default 2). The source line, OTHER MATCHES and amount edit on the card. The free helper's
  inline lookup.
- **C. Source on every entry.** The `source` field on events and saved meals, FUEL and HISTORY lines, CSV, backup, old
  backups load. "The usual" matching. The settings card.

One PR for all three unless slice A ships first on his word.

## Design and locks
- FIELD-AUTHORITY-001: LOG stays the card's one red action; OTHER MATCHES, EDIT and the source line are not red.
- NAV-001: no new tab, screen or menu entry. Everything lives in the existing Delta sheet, meal sheet and settings.
- BRAND-MARK-003: colours from the existing tokens only, so Design 1 can restyle it later.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `searchFoods` and `lookupBarcode` (`foodLookupQueries.ts`, `barcodeLookup.ts`), the `FoodSearchResult`
  shape, `ALFRED_READ_TOOLS` and `runReadTool`, the `fix_entry` pattern of filling a card from the record,
  `correctMealLog`, saved meals, and the meal sheet's food page. Pattern: MyFitnessPal and Cronometer show the database
  entry and serving on every logged food.
- **OWN:** matching order, the source field and its display, BEYOND-filled numbers, the inline free-helper lookup.
- **BUILD FROM SCRATCH:** none.

## Tests
Branded per-100 g scaling (and its absence when the serving unit isn't g or ml); `food_lookup` order with saved meals
first; a proposal with numbers that don't match its record is refilled from the record; a lookup failure falls back to
an estimate marked as one; offline; Open Food Facts' 10-a-minute cap; source kept through a correction; CSV and
backup round-trip; an old backup without `source` loads; "the usual" picks the most-logged meal for that time of day;
the card at 320, 360 and 412 px with axe.

## Excluded
Recipes, micronutrients beyond fiber and sodium, a new food-search screen, storing USDA or Open Food Facts data
beyond what he logs, writing to Open Food Facts, and any change to targets, the burn estimate or FITS-NOW.

## Acceptance
- "Two eggs and a banana" to Delta shows one card per food with USDA numbers and source lines, and logs on LOG.
- A branded food from search logs the label's per-serving numbers, not per-100 g ones.
- Offline, the same message gives cards marked "Delta's estimate".
- Each logged entry shows its source in FUEL, HISTORY and the CSV.

## Stop and ask Gavin if
- Open Food Facts' name search can't be called from the browser (CORS) or needs an account or key.
- USDA's DEMO_KEY limits (30 requests an hour, 50 a day per IP, per the
  [API guide](https://fdc.nal.usda.gov/api-guide)) would be hit in normal use and the deploy has no
  `USDA_FDC_API_KEY` secret set. Setting a free key is his step; say so in one line.
- Filling numbers from the record would need Alfred to log without a card in a case the defaults above don't name.

## Decision record
Add `docs/decisions/GRAYSON-MEAL-LOOKUP-001.md` with the defaults above and Gavin's authorization lines.
