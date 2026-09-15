---
id: NUTRITION-003
baseline: 68b5e4d0f9a068bc00be4454b833289c0bd81919
risk_tier: HIGH-RISK
---

# NUTRITION-003 // Calorie + Protein Targets

## Mission

Direct owner ruling, 2026-09-15 (in chat): "I think we should track protein and calories so I
can ensure I'm eating at a deficit while still eating enough protein." After discussing build
options (manual targets vs. adaptive-TDEE vs. formula-based BMR), the owner chose: calorie
target set directly by hand (no formula guessing at metabolism), protein target derived from
bodyweight x a multiplier defaulting to 1.0 g/lb (the common rounded heuristic used by RP and
most coaches for a cut, adjustable toward 0.8). This reverses NUTRITION-001's locked "no calorie/
macro goal, or nutrition scoring" restriction by direct owner instruction — the same kind of
reversal already applied once this session to the emblem and to TRAIN's "no broad exercise
database" line, each by an explicit, dated owner ruling recorded in the doctrine, never silently.

## Approved baseline

`origin/master` at `68b5e4d0f9a068bc00be4454b833289c0bd81919`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

HIGH-RISK. Trigger: persistence schema/migration — a new `nutritionTargets` Dexie table (single
mutable settings row, same shape as `schedulePatterns`). Owner ruling obtained: YES (Mission,
above; also covered by the owner's session-wide delegation, "you are in charge of keeping us
productive," for exactly this class of routine-within-authorized-scope schema addition).

## Authorized scope

- **Engine**: `src/engine/nutritionTargets.ts` — a pure function `deriveProteinTargetG
  (proteinMultiplierGPerLb, bodyweightLbs)`, plus `DEFAULT_NUTRITION_TARGETS` (multiplier 1.0,
  no calorie target set), mirroring `scheduledContext.ts`'s `DEFAULT_SCHEDULE_PATTERN` placement
  and the pure-derivation/I-O-wrapper split used everywhere else (`deriveCapacity`,
  `evaluateProgression`, `deriveScheduledContext`).
- **Domain** (`src/domain/common/types.ts`): `NutritionTargets` — a single, directly-mutable
  settings record (same treatment as `SchedulePattern`: one row keyed `"current"`, not itself
  event-sourced). `calorieTargetKcal` is optional and set directly by the operator — no formula.
  `proteinMultiplierGPerLb` always has a value (seeded by migration).
- **Persistence**: `src/persistence/nutritionTargetValidation.ts` (Input/full-record zod schema
  split, mirroring `schedulePatternValidation.ts`). `src/persistence/db.ts` v11 adds
  `nutritionTargets` table, seeded via `.upgrade()` with `DEFAULT_NUTRITION_TARGETS` — same
  pattern as `schedulePatterns` at v4.
- **Application**:
  - `src/application/nutritionTargetQueries.ts` — `getNutritionTargets()` (falls back to the
    default if missing/malformed, never throws, mirrors `getSchedulePattern`),
    `getEffectiveProteinTargetG()` (multiplier x `getMostRecentBodyweight()`; returns `undefined`
    if no bodyweight has ever been logged — never invents a number from nothing).
  - `src/application/nutritionTargetCommands.ts` — `updateNutritionTargets(input)`, the only
    writer of the settings row (mirrors `updateSchedulePattern`'s strict-validation-on-write /
    lenient-fallback-on-read split).
  - `src/application/queries.ts` — new `getMostRecentBodyweight()`: the latest effective
    bodyweight across ALL days (not day-scoped, unlike the existing `getLatestBodyweight`),
    since a protein target must stay current even on a day with no fresh weigh-in.
  - `src/application/nutritionQueries.ts` — new `getTotalMealCalories(beyondDayId)`, mirroring
    the existing `getTotalMealProteinGrams`.
- **UI**: `src/ui/screens/body/BodyScreen.tsx` gains a "NUTRITION TARGETS" section (placed
  between the existing PROTEIN and MEAL MEMORY stations) showing today's logged calories vs.
  target (remaining/over) and today's combined protein (meal + standalone) vs. the derived
  target, plus an editable disclosure for the calorie target and protein multiplier.

## Explicit exclusions

- No BMR/TDEE formula, no activity-level input, no new biometric profile fields (height/age/sex)
  — calorie target stays a number the operator sets directly, per the owner's own chosen
  approach tonight.
- No adaptive/trend-derived calorie estimate (the "v2" option discussed and deliberately
  deferred until enough logging history exists to make it meaningful) — this Drop is the
  manual-target v1 only.
- No change to `getMinimumDayStatus` or the Minimum Day protein requirement's own logic — this
  Drop's protein target is a separate, additional signal, not a replacement for Minimum Day's
  existing combined-protein-total behavior.
- No meal planning, no barcode/recipe/serving ontology, no richer food database — tracked
  separately, not this Drop.
- No change to `SavedMeal`/`MEAL_LOGGED`/correction-chain behavior — this Drop only adds a
  calorie total query and a target comparison, reading existing history unchanged.

## Relevant authority / references

- Direct owner ruling in chat, 2026-09-15 (quoted in Mission above).
- `docs/UX_DECISIONS.md`'s NUTRITION (Meal Memory — NUTRITION-001) entry, whose "no calorie/
  macro goal, or nutrition scoring" line this Drop explicitly and narrowly reverses (calorie/
  protein *targets with progress display* — still no food database, barcode, recipe, or serving
  ontology, none of which this Drop touches).
- `src/persistence/schedulePatternValidation.ts` / `application/queries.ts`'s
  `getSchedulePattern`/`updateSchedulePattern` — the exact single-mutable-settings-row pattern
  this Drop's `NutritionTargets` follows.

## Required invariants

- `db.ts` v11 is purely additive — every prior version's `.stores()` block stays byte-for-byte
  unchanged.
- `getNutritionTargets()` never throws — a missing or malformed stored row falls back to
  `DEFAULT_NUTRITION_TARGETS`, matching `getSchedulePattern`'s own fallback discipline.
- `getEffectiveProteinTargetG()` returns `undefined` (not `0`, not a guessed number) when no
  bodyweight has ever been logged — a real "unknown," never false precision.
- Existing `SavedMeal`/meal-logging/correction-chain behavior and Minimum Day's protein
  computation are unchanged (verified by the existing test suite passing unmodified).

## Acceptance criteria

- Setting a calorie target and a protein multiplier persists, survives a reload, and correctly
  computes progress (logged-vs-target, remaining/over) from real logged meal/protein history.
- The protein target updates automatically when a new bodyweight is logged (no re-entry needed)
  — proven by a real integration test logging two different bodyweights and confirming the
  derived target changes between them.
- Before any bodyweight has ever been logged, the protein target reads as genuinely unknown
  (not zero, not a default guess) and the UI says so plainly rather than showing a false number.
- `npm run verify` passes in full, including a real backup/restore round-trip for the new table.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite + production build).
Given the HIGH-RISK schema trigger: a backup/restore round-trip test for `NutritionTargets`,
same shape as prior Drops' own round-trip evidence this session.

## Builder expectations

- Work only in `../beyond-worktrees/claude-nutrition-001` on branch
  `claude/nutrition-001-deficit-protein-targets`, cut from the baseline above.
- Implement exactly the authorized scope; adding a BMR/TDEE formula or new biometric profile
  fields is a STOP condition, not a judgment call — that's a different, not-yet-authorized Drop.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm the schema bump is purely additive, confirm
  `getEffectiveProteinTargetG` genuinely returns `undefined` (not a fallback number) with no
  bodyweight logged, confirm `getMostRecentBodyweight` is genuinely cross-day (not accidentally
  scoped to a single BeyondDay), confirm no Minimum Day/correction-chain behavior changed.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close NUTRITION-003 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to add a TDEE/BMR formula, activity-level input, or new biometric profile
  fields is a scope-expansion STOP — that's a distinct future decision, not this Drop's.
- A genuine conflict between this contract and higher repository authority not already resolved
  by the direct owner ruling cited above.
