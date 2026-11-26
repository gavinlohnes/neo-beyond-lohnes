# GRAYSON-FITS-NOW-001 — your own meals that fit what's left of today

- **Authorization:** Gavin, 2026-11-26, 03:40 CT, picking **"Brief all four"** for "what fits now, a protein heads-up,
  timed and drop sets, and the 800-exercise library". 2026-11-25, 06:50 CT: **"I think the first 2 area we get to being
  above amazing is nutrition and Train."** His rule: **"I should be able to edit and tweak or correct everything in
  this app."** Merging this brief approves the defaults below. His Nov 26 pick lifts his food-brief pause ("Stop after
  717") for this brief and GRAYSON-PROTEIN-HEADSUP-001 only.
- **Lane: FEATURE.** Read only, plus one tap that logs through the existing `logMeal` command. No new table, Dexie
  version, event type, Engine input, TODAY composition or notification. Fresh-context reviewer; self-merge with green CI
  and that reviewer's PASS.
- **Starting commit:** `origin/master` with GRAYSON-DAY-TARGETS-001 merged. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-fits-now`.
  **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session, FUEL first, after DAY-TARGETS-001, in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md).

## Objective and benefit
Today the food card says how much is left ("· 400 remaining", `describeCalorieProgress` in
`ui/screens/body/nutritionCopy.ts`) and the eating window says how much protein is left and for how long
(`windowFuelLine`, `application/eatingWindow.ts`). He still has to work out which of his meals fits.

After this, the meal log answers that for him. At the top of the MEAL sheet's list (`ui/components/RecordSheets.tsx`)
and as one line on the BODY food card, **Fits now** shows up to three of his own saved meals that fit what's left of
today's calories, best for protein first: "Chicken rice bowl · 520 kcal · 45 g protein". One tap logs it now, with
the UNDO the meal log already has.

**Benchmark (read 2026-11-25):** MacroFactor works out how much of one chosen food fits your target
([10 MacroFactor features](https://macrofactor.com/10-macrofactor-features/)). We go past it: GRAYSON picks from the
meals he actually eats, against today's own target, protein and eating window, and he picks nothing first.

## Recommended defaults (approved when Gavin merges this brief)
1. **What's left:** today's calorie target (`getDayCalorieTarget` from DAY-TARGETS-001, which is the plain target when
   that feature is off) minus what's logged today, and his protein target minus today's protein. With no calorie
   target set, Fits now doesn't show.
2. **Which meals:** his saved meals, not archived, whose calories are at or under what's left (one serving). A meal
   over by 50 kcal or less still counts and says "about fits".
3. **Order:** most protein toward what's left first; a tie goes to the meal he's logged most on this kind of day (the
   eating window's day kinds) over the last 28 days. At most three.
4. **When it shows:** while there are at least 150 kcal left and the eating window (if he uses it) isn't closed. With
   the window open and under 60 minutes left, the line says so: "Window closes in 40 min".
5. **Nothing fits:** one plain line, "None of your saved meals fit the 180 kcal left", and no list. No colour, no
   warning.
6. **One tap:** LOG logs one serving now through `logMeal` and shows the existing UNDO. Nothing else is written.
7. **Always says why:** each row shows what it leaves: "Leaves 80 kcal, protein target met".
8. **Off switch:** Fits now on or off in MORE · Nutrition targets (default on).
9. **Tap bar:** a meal that fits, logged in 2 taps (open the meal log, LOG).

## Everything is his to change
On or off. The meals themselves, as today. What counts as "about fits" is fixed in this brief; it can move to his
numbers page later (YOUR-NUMBERS-001).

## Design principles check (Vision, Nov 24)
- **One tap for the usual:** his own meals, ranked. **Always says why:** what each one leaves. **Calm:** no nag, no
  colour, never more than three.

## Scope
- A pure `engine/fitsNow.ts` (what's left, which meals, order). `application/fitsNowQueries.ts` (reads today's target,
  logged meals, saved meals, the eating window view and his 28-day log history).
- UI: a **Fits now** block in the MEAL sheet list (`RecordSheets.tsx`) and one line on the BODY food card; the switch
  in `NutritionTargetsSettings.tsx`.
- Tests: what's left with DAY-TARGETS on and off; no target hides it; the 50 kcal "about fits"; protein order and the
  day-kind tie-break; the 150 kcal floor; a closed window hides it; nothing fits says so; LOG writes one MEAL_LOGGED
  through `logMeal` and UNDO removes it; archived meals never show; 320 px and axe.

## Excluded
Partial servings. Single foods from the database (only saved meals). Putting a meal on the meal plan. Anything that
changes a target.

## Acceptance
- Phone check: with a calorie target set and a few meals logged, open the meal log. Fits now shows up to three of your
  meals with what each leaves. LOG one: it's logged, and UNDO takes it back. Switch Fits now off in Nutrition targets:
  it's gone.

## Decision record
- Saved meals only, because they're what he actually eats and they already carry their numbers.
- Protein first, because his goal is to lose weight and keep muscle.

## Stop and ask Gavin if
- Showing Fits now on the BODY card would push anything he uses off the first screen.

## Risks
- **A stale target:** it reads the day's target through the one query DAY-TARGETS-001 adds, never its own copy.
