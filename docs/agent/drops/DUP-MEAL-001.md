---
id: DUP-MEAL-001
baseline: a75da3d2ae605291cb00cf78f1c92a86908d639e
risk_tier: ROUTINE
---

# DUP-MEAL-001 // DUPLICATE-MEAL PROMPT

## Mission

During the field test the owner logged dinner twice because there was no clear save
confirmation, doubling that day's protein and kcal. When a meal is logged that matches a meal
logged moments ago, BEYOND asks "Same meal?" with KEEP BOTH / REMOVE THIS ONE. It's a prompt,
never a silent merge. Owner brief 2026-10-04 (Queue item 1).

## Approved baseline

`origin/master` at `20872d7f36a5e5f4b16fead4ad0e27ea19665118` when written. **Builder:** if
`origin/master` has moved (PR #154 is expected to merge first), set `baseline:` above to the fresh
`git rev-parse origin/master` before `node scripts/factory-drop.mjs init`; that is the only edit
to this file the builder makes.

## Risk classification

ROUTINE. A pure helper beside the existing "Same food?" rule in `src/engine/sameFood.ts`, a
read-only query, and a BODY prompt. REMOVE THIS ONE uses the existing `voidMealLog` →
`MEAL_LOG_VOIDED` path. No new event type, schema, persistence, Engine/recommendation, or
correction-model change. `npm run check:risk` will flag `src/engine/` by path; that is
semantically routine here (same kind of read-only interpretation helper as Drop 1.5's sameFood).

## Authorized scope

**Matching rule (exact).** Right after a meal is logged with `logMeal`, an earlier meal on the
same BeyondDay is a possible duplicate when ALL hold:

1. it is still standing (not voided; `getMealEntries` already drops voided meals);
2. it was logged within `SAME_FOOD_WINDOW_MS` (2 minutes, reused from `sameFood.ts`) before the
   new one, by `recordedAt`;
3. it is the same meal: the same `savedMealId`, OR the same name (trimmed, case-insensitive) AND
   the same effective calories AND the same effective protein (grams).

If several match, use the most recent. Two different meals logged close together (different
saved meal and different name/macros) are never flagged.

**Where.** Only where meals are logged: BODY (the saved-meal rows' LOG action). Meals aren't
logged on TODAY, so nothing on TODAY changes. SAME AS YESTERDAY (`logMealsAgain`, a batch) is out
of scope for this Drop.

**Copy (exact).**
- Question: `Same meal? {name} already logged at {HH:MM}.` (24-hour local time of the earlier
  meal, e.g. `Same meal? Dinner already logged at 02:14.`)
- Buttons: `KEEP BOTH` · `REMOVE THIS ONE`
- After REMOVE THIS ONE: `Removed the second {name}. Protein today: {g} g.` (the day's protein
  from `getDayProteinTotalG`)
- After KEEP BOTH: the prompt closes; nothing is written.

**Behavior.**
- The prompt shows under the meal row that was just logged, like the existing "Same food?"
  prompt (`renderSameFood` in `BodyScreen.tsx`), as a `role="group"` named "Same meal?".
- KEEP BOTH is always one tap and writes nothing.
- REMOVE THIS ONE calls `voidMealLog(dayId, newMealRootEventId)`: the NEW entry is voided, the
  earlier one stays. Clear the meal's UNDO banner if it points at the voided entry.
- If both this check and the existing "Same food?" (meal vs protein-only log) would fire for one
  log, show only "Same meal?". One question at a time.
- The prompt closes on its own if another meal is logged.

**Files (expected).**
- `src/engine/sameFood.ts`: add a pure `findDuplicateMeal(meals, justLoggedId)`, with the meal
  shape extended by `savedMealId` and `calories`.
- `src/application/sameFoodQueries.ts`: add `getDuplicateMealCheck(beyondDayId, mealRootId)`.
- `src/ui/screens/body/BodyScreen.tsx`: ask after `logMeal`; render the prompt; wire the two
  buttons.
- `src/ui/screens/body/nutritionCopy.ts`: the copy above.
- Tests: `tests/engine/sameFood.test.ts`, `tests/integration/duplicateMeal.test.ts`,
  `tests/browser/DuplicateMeal.test.tsx`.
- Docs: `docs/UX_DECISIONS.md` as-built entry. The roadmap and handoff note are updated by
  Claude Code (Codex flags; see `AGENTS.md` rule 4).

## Explicit exclusions

- No schema, new event type, persistence or backup change. If one turns out to be needed, stop
  and say so in the PR (see Stop conditions).
- No silent merge or auto-void; nothing is removed without the tap.
- No change to F1 / Weekly / Day Ledger code paths beyond what voiding already does.
- No change on TODAY. No SAME AS YESTERDAY batch handling. No change to the existing
  protein-vs-meal "Same food?" rule except yielding to "Same meal?" when both fire.
- No change to the 2-minute window or protein slack constants.

## Relevant authority / references

- Owner brief 2026-10-04 (this Drop).
- Drop 1.5 "Same food?" (`docs/UX_DECISIONS.md`, `src/engine/sameFood.ts`): a question, never
  blocking, never removing on its own.
- Hotfix 2026-10-03: meal delete via `MEAL_LOG_VOIDED`; meal UNDO banner.
- `AGENTS.md` (Codex builds only from this Drop, never merges, doesn't edit governance docs).

## Required invariants

- A prompt, never a silent change; KEEP BOTH writes nothing.
- REMOVE THIS ONE voids only the new entry, through `voidMealLog`; nothing is erased.
- A voided duplicate leaves every total: BODY meals list and kcal/protein, TODAY's protein,
  Minimum Day, Weekly, Day Ledger.
- Two different meals logged close together are never flagged.

## Acceptance criteria

1. Logging the same saved meal twice within 2 minutes shows `Same meal? Dinner already logged at
   HH:MM.` with KEEP BOTH and REMOVE THIS ONE.
2. **Two different meals logged close together are NOT flagged.**
3. Same name + same calories + same protein from different saved meals within 2 minutes IS
   flagged; same name with different macros is NOT.
4. The same meal logged more than 2 minutes apart is NOT flagged.
5. KEEP BOTH closes the prompt and writes no event; both meals count.
6. **REMOVE THIS ONE voids the new entry and it leaves every total:** `getMealEntries`,
   `getDayProteinTotalG`, `getTotalMealProteinGrams`, the Day Ledger (`kcal`, `proteinG`,
   `entryCounts.food`) and Weekly's protein. The earlier meal stays; History shows "Meal log
   deleted."
7. A previously voided meal never triggers the prompt.
8. When both would fire, only "Same meal?" shows.
9. BODY at 320 / 360 / 412 px: no horizontal overflow; both buttons ≥ 44 px tall.

## Required verification

```
npm run check:architecture
npm run typecheck
npx vitest run --project node tests/engine/sameFood.test.ts tests/integration/duplicateMeal.test.ts
npx vitest run --project browser tests/browser/DuplicateMeal.test.tsx
npm run check:risk -- <baseline sha>
npm run verify
git diff --check
```
Then exact-head PR Verification after the PR opens.

## Builder expectations

- Codex (backup builder) or Claude Code. Work on your own branch from the baseline, activate with
  `node scripts/factory-drop.mjs init DUP-MEAL-001 --baseline <sha> --branch <branch>`, build
  exactly this scope, run the verification, open the PR, write the handoff note, stop. Codex
  never merges.

## Reviewer expectations

- Claude Code (or a separate session) reviews the exact PR head against the acceptance criteria,
  especially #2 (no false positives) and #6 (voided entry leaves every total).

## Integrator expectations

- Claude Code merges only on the owner's say-so with exact-head CI green, then closes the Drop
  with `node scripts/factory-drop.mjs close DUP-MEAL-001 --integration-sha <merge sha>`.

## Stop / escalation conditions

- Stop and report if the rule can't be met without a schema or new event type.
- Stop if it needs any change to the Engine's recommendations, F1/Weekly code, or TODAY.
- Stop if matching by saved meal or name+macros isn't enough to avoid flagging different meals.
