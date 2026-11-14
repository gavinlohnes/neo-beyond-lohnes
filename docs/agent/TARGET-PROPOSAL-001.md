# TARGET-PROPOSAL-001 — a weekly calorie proposal you save or keep

- **Authorization:** Gavin, 2026-11-14, approving the proposal "a weekly calorie check-in: once a week BEYOND proposes
  a daily calorie target from your own weight trend and what you've eaten; you save it or skip it": "Approved".
- **Builder:** Claude Code. Branch `ccr-88f5c085-target-proposal`, from master `77c8ab61`.
- **Lane:** Protected. It amends two locked rules (below), so it needs independent exact-head review and green CI;
  Gavin alone merges.
- **Origin:** [HARVEST-001](harvest/HARVEST-001.md) backlog #3 and mission step 5. NUTRITION-003 named this as a
  "possible future direction" when it deferred a weight-trend estimate.

## What it amends

- **NUTRITION-003, "Calorie target is set directly by the operator — no formula."** The target is still set only by
  the operator. BEYOND now *offers* a number from a formula, and saving it is the operator's own edit. Nothing is
  saved without a tap, and the target can still be typed by hand in TARGETS.
- **Drop 6, "nothing reads the estimate."** The proposal reads the weight-trend estimate. Nothing else does: the
  Engine, recommendations, TODAY and Alfred are unchanged.
- **Unchanged:** GARMIN-005. Garmin's burned figure is never used for the proposal; it stays beside the estimate in
  Weekly as context only.

## What Gavin sees

In the weekly check-in, after EXPENDITURE, a section **CALORIES FOR THIS WEEK**:

> **About 2,000 kcal a day**
> From your burn estimate (2,350–2,550 a day) and your aim: lose 0.5% of your bodyweight a week toward 180 lb, about
> 1.0 lb a week. Your target now: 2,200.
> [ SAVE 2,000 ]  [ KEEP 2,200 ]

- **SAVE** writes the calorie target through the existing `saveNutritionTargets`, with its UNDO.
- **KEEP** (or NOT NOW when no target is set) changes nothing and says so. Nothing is stored about the choice: the
  proposal is in Weekly, which is opened on purpose, so it never nags.

## How the number is made (pure, `application/targetProposal.ts`)

1. **Maintenance:** the middle of the existing expenditure range (`engine/expenditure.ts`, unchanged).
2. **Direction:** the goal weight against your current weight (this week's average weigh-in, else the latest). Within
   1 lb of the goal means hold.
3. **Rate:** your weekly rate (% of bodyweight) × current weight × 3,500 / 7 kcal a day. It is capped at 1,000 kcal a
   day below maintenance and 500 above.
4. **Floor:** never below 1,500 kcal a day.
5. **Smoothing:** with a current target, the proposal moves at most 150 kcal from it per week. Within 50 kcal of the
   aim, it says the target already fits and offers nothing to save.
6. **Rounding:** to the nearest 50.

**It abstains, and says what's missing, when:** the expenditure estimate is still waiting (enough logged meal days and
spread weigh-ins), there is no goal weight, there is no weekly rate while the goal is more than 1 lb away, or there is
no weigh-in.

## Wording rules

The same as GARMIN-005: no "deficit", "surplus", "net", "remaining" or "left". No guilt, no urgency, no streak. Every
number says where it came from. "Your choice: nothing changes until you save."

## Excluded

Automatic targets; macro targets; protein changes; Engine, recommendation, TODAY or Alfred changes; using Garmin
burned; reminders or notifications; any schema, backup, dependency or provider change. No stored record of skips.

## Leverage gate

- **REUSE:** `projectExpenditure` (the estimate), `saveNutritionTargets` (save with undo), the stored goal weight and
  weekly rate, Weekly's sections. The weekly proposal with smoothing is the MacroFactor check-in idea (HARVEST-001:
  ideas only, no code).
- **OWN:** the pure proposal function and its wording.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- Unit tests for every branch: lose, gain, hold; each abstention; step limit; floor; deficit and surplus caps; fits;
  no current target; rounding.
- A browser test: the section's numbers and wording, SAVE writes exactly the proposed target and UNDO restores it,
  KEEP writes nothing, abstention copy, no forbidden words, 320–1024 px fit, axe.
- Full Node and browser suites, typecheck, architecture check and build.
