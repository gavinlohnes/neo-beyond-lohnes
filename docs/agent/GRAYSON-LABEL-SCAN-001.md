# GRAYSON-LABEL-SCAN-001 — photograph a nutrition label to fill a food's numbers

- **Authorization:** Gavin, 2026-11-27. 21:23 CT: **"2 and 6 we can wait until 1.1"**; 21:28 CT: **"Add to 1.1"**, which
  put "Photo scan of a nutrition label with no barcode" on the Launch 1.1 list in
  [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md). 22:28 CT, on writing the 1.1 briefs: **"You start here and get ready
  for a builder to start."** His standing rule: **"I should be able to edit and tweak or correct everything in this
  app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** A photo goes to Anthropic (privacy), a model reads numbers that become his food records (AI
  authority), and saved meals gain an indexed barcode (schema, Dexie v30). Gavin merges after green CI and a
  fresh-context reviewer's exact-head PASS posted on the PR.
- **Starting commit:** latest `origin/master` after L2 (GRAYSON-REST-ALERT-001) merges. Re-fetch before starting.
  Written against `9d83d915`.
- **Builder:** Claude Code, Delta-track session (the "Project Grayson codex notes" chat), which builds L1. Branch
  `claude/grayson-label-scan-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** row L3 in the Launch 1.1 table of [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md), after L1 and L2. It uses
  L1's `source` field (`label`).
- **Dexie:** v30, adding a `barcode` index to `savedMeals` (default 6). X5 takes v29. PR #694 (ASKS-COUNT, out of 1.0
  and 1.1) renumbers again after this merges.

## Objective and benefit
A food with no barcode, or one Open Food Facts doesn't know, has to be typed in by hand today. Checked in code at
`9d83d915`:

- The meal sheet (`src/ui/components/RecordSheets.tsx`) offers USDA search, a barcode scan (`BarcodeScanner.tsx`, the
  browser's BarcodeDetector) and NEW MEAL by hand. A barcode Open Food Facts doesn't know ends at "Not found in Open
  Food Facts. Search by name, or add it with NEW MEAL." (`readBarcode`).
- Nothing reads a label. The app already takes photos with a plain file input and the camera
  (`ProgressPhotos.tsx`, `capture`), and already calls Anthropic with his own key and a monthly cap
  (`src/application/alfred/alfredClient.ts`, `ALFRED_MODELS.everyday`; `alfredSpend.ts`, `capReached`).
- Saved meals have no barcode (`savedMeals: "id, archivedAt, createdAt"` in `src/persistence/db.ts`), so the same
  unknown product has to be found again every time.

After this, he snaps the label, checks the numbers, taps LOG, and the next scan of that barcode finds his own copy
straight away, offline.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where.** **PHOTO OF LABEL** beside SCAN BARCODE in the meal sheet, and on the "not found" line after a barcode
   miss. Not red.
2. **Taking it.** The phone camera through a file input with `capture="environment"`, or a photo he already has. The
   picture is shrunk on the phone to the smallest size that still reads well (the builder measures this on real
   labels) before it is sent.
3. **Reading it.** One call to Anthropic with his Alfred key and the everyday model, asking for one structured answer:
   product name if shown, serving size as printed, serving grams or ml, calories, protein, carbs, fat, fiber, sodium,
   and the fields it couldn't read. It counts in the monthly spend line and stops at his cap.
4. **He confirms.** The answer fills the existing food page: serving, amount and numbers, every one editable. A number
   it couldn't read is left blank, never guessed and never 0. Nothing is saved until he taps LOG or SAVE. The entry's
   source is "From the label" (L1's `label`).
5. **A sanity line.** When the label's calories differ from 4 × protein + 4 × carbs + 9 × fat by more than 20%, one calm
   line: "These numbers don't add up. Check them against the label." It never blocks LOG.
6. **His copy comes first next time.** After a barcode miss, the saved meal keeps that barcode. A later scan of the same
   barcode finds his saved meal first, offline, before Open Food Facts.
7. **The photo isn't kept.** It is dropped once read: not in the database, not in backups, never sent anywhere else. The
   first time, one line says "The photo goes to Anthropic with your key to read the numbers, and isn't kept."
8. **Without the reader.** Offline, with no Alfred key, or at the cap, PHOTO OF LABEL says why in one line and NEW MEAL
   is right there.

## Everything is his to change
In the FOOD LOOKUP settings card (L1), with **RESET**: label scan on or off, the sanity-line threshold (10, 20 or 30%,
or off), keep barcodes on saved meals (on), and whether his saved meals come before Open Food Facts on a scan (on).
Each saved meal's barcode can be added, changed or removed in the saved-meal editor.

## Scope
- A pure `readLabelAnswer(raw)` that validates the model's structured answer (units, ranges, blanks) into the
  `FoodSearchResult` shape, plus the call that sends the photo.
- The PHOTO OF LABEL entry points, the first-use line, the sanity line, the offline, keyless and cap states.
- Dexie v30 with the `barcode` index on `savedMeals`; `lookupBarcode`'s caller checks saved meals first; the barcode in
  the saved-meal editor, CSV and backups; old backups without it load.

## Design and locks
- FIELD-AUTHORITY-001: LOG stays the food page's one red action.
- NAV-001: no new tab or screen. Everything is inside the existing meal sheet and settings.
- BRAND-MARK-003: colours from the existing tokens only.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** the meal sheet's food page and `chooseFood`, the `FoodSearchResult` shape, `ProgressPhotos`' camera input,
  the Alfred client, key and spend cap, `lookupBarcode`, saved meals, L1's `source` field. Pattern: MyFitnessPal's and
  Cronometer's nutrition-label scan, which fill the form for the user to check.
- **OWN:** the structured answer and its validation, the barcode memory, the sanity line.
- **BUILD FROM SCRATCH:** none. On-device text reading (Tesseract-style OCR) was considered and set aside: it adds a
  large download and reads label tables less reliably than the model he already pays for.

## Tests
`readLabelAnswer` on good answers, missing fields, wrong units and out-of-range values; a blank stays blank on the form;
the sanity line at the threshold and below; offline, keyless and capped states; spend is counted; the photo isn't
written to Dexie or backups; Dexie v30 upgrade from v29 with data; a saved barcode is found before Open Food Facts;
old backups load; the food page and states at 320, 360 and 412 px with axe. A small set of real label photos (his own,
taken for the test, not committed if he prefers) is read on the phone check.

## Excluded
Ingredient lists, allergens, micronutrients beyond fiber and sodium, recipe scanning, sending products to Open Food
Facts, keeping photos, and any change to targets or the burn estimate.

## Acceptance
On his phone: a label photo fills serving and numbers he can check, LOG saves it marked "From the label", and scanning
that product's barcode again finds his saved meal at once, with the phone offline.

## Stop and ask Gavin if
- The cost of one label read, measured on the spend line, is more than a few cents.
- Reading needs a different model or provider than the Alfred client already uses.
- The v30 migration would need to touch existing saved meals' data, not just add an index.

## Decision record
Add `docs/decisions/GRAYSON-LABEL-SCAN-001.md` with the defaults above and Gavin's authorization lines.
