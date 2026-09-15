---
id: BODY-UX-001
baseline: 0c560f888ffe83c1377d413b9b518499d9198656
risk_tier: ROUTINE
---

# BODY-UX-001 // ADD MEAL disclosure declutter

## Mission

Direct owner report, 2026-09-15 (in chat, with screenshots of the live app on his phone): the
BODY screen's MEAL MEMORY → "SHOW ADD MEAL" disclosure shows the USDA food-search box AND the
full manual-entry form (name/calories/protein/carbs/fat/SAVE MEAL) unconditionally, at the same
time — before the operator has even searched. Combined with the saved-meals list and TODAY'S
MEALS both potentially open at once, this reads as one long, confusing wall of inputs on a phone
screen ("It has a ton of stuff open at once and it's very confusing"). Agreed fix, proposed by
Claude and confirmed by the owner ("Perfect"): collapse the manual macro fields behind their own
nested disclosure, closed by default, auto-opening only when the operator actually needs it.

## Approved baseline

`origin/master` at `0c560f888ffe83c1377d413b9b518499d9198656`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. UI-only disclosure/state change in one screen file. No schema, domain, application, or
engine changes. No new dependency. Covered by the owner's session-wide delegation ("you are in
charge of keeping us productive") for exactly this class of routine, already-agreed UI fix.

## Authorized scope

- **UI only**: `src/ui/screens/body/BodyScreen.tsx`'s "SHOW ADD MEAL" `FieldDisclosure` block
  (MEAL MEMORY section).
  - Add a `manualMealEntryOpen` state, controlling a new nested `FieldDisclosure` that wraps the
    existing "New meal name" + macro inputs + "SAVE MEAL" button. Closed by default.
  - Auto-open it (force `manualMealEntryOpen` to `true`, not just default-open) when:
    (a) `handleSearchFoods` resolves with `foodResults.length === 0`, matching the existing
    "No results — enter macros manually below." copy, which is currently misleading since the
    fields are already visible regardless;
    (b) `handleSelectFoodResult` is called (a search result was picked and needs review/edit
    before saving) — it already pre-fills the form, this just also reveals it;
    (c) the operator explicitly opens it via its own disclosure toggle.
  - The USDA search box + SEARCH button + result list remain always visible whenever "ADD MEAL"
    itself is open — only the manual macro-entry fields move behind the new nested disclosure.
  - Reset `manualMealEntryOpen` to `false` alongside the existing form-clearing in
    `handleCreateSavedMeal`'s success path (same place `newMealForm`/`foodQuery`/`foodResults`
    already reset), so the next time ADD MEAL is opened it starts collapsed again.

## Explicit exclusions

- No changes to `application/nutritionCommands.ts`, `nutritionQueries.ts`,
  `foodLookupQueries.ts`, `nutritionTargetCommands.ts`/`nutritionTargetQueries.ts` — search,
  save, log, and target logic are all unchanged; this is presentation-only.
- No changes to the Saved Meal list's LOG/EDIT/ARCHIVE buttons, the TODAY'S MEALS disclosure, or
  the NUTRITION TARGETS section added by NUTRITION-003 — those are out of scope for this Drop.
- No changes to `src/ui/styles/global.css` or any other screen — scoped to `BodyScreen.tsx`'s
  ADD MEAL block only.

## Relevant authority / references

- Direct owner report + agreed fix in chat, 2026-09-15 (quoted in Mission above).
- `FieldDisclosure` (`src/ui/components/FieldDisclosure.tsx`) and its existing controlled
  `open`/`onToggle` usage elsewhere in the same file (`proteinManualOpen`, `targetsEditOpen`,
  `addMealOpen` itself) — this Drop nests one more instance of the same established pattern,
  it does not invent a new disclosure mechanism.

## Required invariants

- `handleSelectFoodResult`'s existing pre-fill behavior (`setNewMealForm(...)`) is unchanged —
  this Drop only adds visibility control around the same fields, never touches what fills them.
- `handleCreateSavedMeal`'s save/validation logic is unchanged.
- The existing Playwright substring-match risk (`getByRole` matches by case-insensitive
  substring by default) must be checked explicitly for the new nested disclosure's toggle label
  against the existing "SHOW ADD MEAL" / "SHOW MANUAL ENTRY" (water) / "SHOW TARGET SETTINGS"
  labels already in this same screen — pick a label with no substring collision.

## Acceptance criteria

- Opening "SHOW ADD MEAL" with no prior search shows only the search box + SEARCH button — no
  manual macro fields visible yet.
- Searching for a food with zero results auto-reveals the manual entry fields (still behind a
  disclosure that's now forced open, not hidden).
- Tapping a search result auto-reveals the manual entry fields, pre-filled, for review before
  SAVE MEAL.
- An explicit "manual entry" toggle exists and works independently of search state.
- Saving a new meal collapses the manual-entry disclosure back to closed for next time.
- Existing MEAL MEMORY browser tests (`tests/browser/BodyScreen.test.tsx`) continue to pass,
  updated only where they must now open the nested disclosure explicitly before filling manual
  fields.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-body-ux-001` on branch
  `claude/body-ux-001-add-meal-disclosure`, cut from the baseline above.
- Implement exactly the authorized scope above; anything touching search/save logic itself, or
  any other screen, is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm no application/domain/persistence file changed at all; confirm
  the new disclosure's label has no Playwright substring collision with existing labels in the
  same file; confirm `handleSelectFoodResult`/`handleCreateSavedMeal`'s actual logic is
  byte-for-byte unchanged (visibility-only diff).

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close BODY-UX-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to also touch search/save/log logic, other BODY sections, or another screen is
  a scope-expansion STOP.
- A genuine conflict between this contract and higher repository authority.
