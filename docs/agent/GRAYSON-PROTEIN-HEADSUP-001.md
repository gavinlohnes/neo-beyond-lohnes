# GRAYSON-PROTEIN-HEADSUP-001 — a calm heads-up when protein runs well under target for several days

- **Authorization:** Gavin, 2026-11-26, 03:40 CT, picking **"Brief all four"** for "what fits now, a protein heads-up,
  timed and drop sets, and the 800-exercise library". 2026-11-24, 04:08 CT: **"I'm trying to be healthy, lose weight
  but keep muscle."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging
  this brief approves the defaults below. His Nov 26 pick lifts his food-brief pause for this brief and
  GRAYSON-FITS-NOW-001 only.
- **Lane: PROTECTED** (a new message on a health surface, read from his intake). No new table, Dexie version, event
  type, Engine input, TODAY composition or notification. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with GRAYSON-FITS-NOW-001 merged. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-protein-headsup`.
  **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session, FUEL first, after FITS-NOW-001, in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md).

## Objective and benefit
His protein target is one daily number (`getEffectiveProteinTargetG`, `application/nutritionTargetQueries.ts`), and
each day shows how close he got. Nothing notices when several days in a row come in well short, which is the pattern
that costs muscle during a cut.

After this, when protein has run well under his target for several logged days, the BODY food card shows one quiet
line, once: "Protein has been under 75% of your target on 3 of the last 4 days." It offers two taps: **SHOW HIGH-PROTEIN
MEALS**, which opens Fits now sorted by protein, and **THAT'S FINE**, which hides it for a week.

## Recommended defaults (approved when Gavin merges this brief)
1. **What counts:** finished days with at least one meal logged (the same rule the burn estimate uses,
   `engine/expenditure.ts`). A day he marks "Not fully logged" (MISSION-REVIEW-001 slice A, once built) is left out.
   Today never counts.
2. **The pattern:** protein under **75%** of his target on **3 of the last 4** counted days. Both numbers are his to
   change in MORE · Nutrition targets (50 to 95%, 2 to 7 days).
3. **Where:** one line on the BODY food card and a sentence in the weekly debrief (`application/weeklyDebriefQueries.ts`).
   Never on TODAY, never a phone alert.
4. **How often:** at most once in any 7 days. THAT'S FINE hides it for 7 days. It goes away by itself once the pattern
   ends.
5. **Words:** plain facts only, with the days listed under a tap ("Mon 98 g, Tue 104 g, Thu 91 g of 180 g"). No
   advice, no health claims, no colour.
6. **Delta:** may mention it once in its read of the day when asked about food, using the same sentence.
7. **Off switch:** on by default; off in MORE · Nutrition targets.
8. **Tap bar:** see it in 0 taps; dismiss in 1; act on it in 1.

## Everything is his to change
On or off, the percent, the number of days, and THAT'S FINE.

## Design principles check (Vision, Nov 24)
- **Calm:** one line, once a week at most, never on TODAY. **Always says why:** the days behind it are one tap away.
  **Yours to change:** both numbers and the switch.

## Scope
- A pure `engine/proteinPattern.ts` (counted days, the pattern, the 7-day quiet). `application/proteinPatternQueries.ts`
  (per-day protein from `getFoodDiary`, the target, his settings, the last dismissal).
- Settings: `NutritionTargets.proteinHeadsUp?: { on: boolean; underPercent: number; days: number; windowDays: number;
  dismissedAt?: string }` in `domain/common/types.ts` and `persistence/nutritionTargetValidation.ts` (optional; older
  backups import).
- UI: the line on the BODY food card, the debrief sentence, the settings block.
- Tests: days without meals and today don't count; 3 of 4 under 75% shows; 2 of 4 doesn't; his own numbers apply;
  THAT'S FINE hides for 7 days; the pattern ending hides it; no target means nothing shows; a marked day is left out
  once MISSION-REVIEW lands; old rows read; 320 px and axe.

## Excluded
Any change to his protein target. Alerts. Calorie patterns. Carb and fat.

## Acceptance
- Phone check (with a test copy or real days): after 3 short protein days out of 4, BODY's food card shows the line.
  Tap it to see the days. SHOW HIGH-PROTEIN MEALS opens Fits now. THAT'S FINE hides it.

## Decision record
- Facts, not advice, because his targets are his own and some come from people he trusts outside the app.
- Once a week at most, because a repeated nudge becomes noise.

## Stop and ask Gavin if
- The weekly debrief has no plain place for one sentence.

## Risks
- **Unlogged days read as low protein:** only days with a logged meal count, and marked days are left out.
