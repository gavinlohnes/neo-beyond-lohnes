# GRAYSON-MISSION-REVIEW-001 — once a month, one page on the goal, what he did, what moved, and at most one change

- **Authorization:** Gavin, 2026-11-24. Campaign row **C4.5** "Mission review (monthly)": "One page: goal, what he did
  (training sessions, protein days, sleep), what moved (weight trend, strength, resting HR), how sure, and at most one
  change he can accept or skip. Excludes partly logged days from burn (#592's HONEST-BURN-001). Done when: every number
  links to its metric page; abstains under the evidence floors; the one change is a card he confirms; no Engine change
  applies itself" (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Campaign 4). His goal, Nov 24: **"I'm trying to be healthy, lose
  weight but keep muscle... I'd like to get to 165 or 170."** 8:18 PM CT: **"What's the next best move? ... I want to
  work in the best possible way."** His rule: **"I should be able to edit and tweak or correct everything in this
  app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (slice A changes what the expenditure estimate counts; slice B shows a target proposal). No new
  table or Dexie version. Two slices, each its own PR. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `a226fd62` or later. Re-fetch before each slice. Slice B goes after
  ASKS-COUNT-001 (#694) merges, since both add a panel to the monthly review.
- **Builder:** Claude Code. Branches `claude/grayson-mission-review-001-a` and `-b`. **Reviewer:** a fresh-context
  reviewer.
- **Order:** Claude Code **#14** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25).
- **Reconciles with:** the Integrated Health Mission design (`docs/GRAYSON_INTEGRATED_HEALTH_MISSION.md`), which names
  C4.5 the one cross-domain review ("rather than introducing a second review system") and sets its evidence floors
  ("A missing meal log is not a calorie deficit"). This brief builds that review; it adds no second one.

## Objective and benefit
Every fourth week the weekly review already adds "BODY COMPOSITION · LAST 4 WEEKS" (`monthlyReviewQueries.ts`,
`MonthlyBodyReview.tsx`): weight change, measurements and photos. It doesn't say whether the month got him closer to
165 to 170 while keeping muscle, or what to change. The weekly calorie proposal exists (`targetProposal.ts`), but it
reads a burn estimate that counts every day with any food logged, so a day he logged only breakfast looks like a big
deficit (`engine/expenditure.ts` "assumes the logged days' meals were all logged").

After this, the monthly review opens with one **Mission** panel: his goal, what he did, what moved, how sure each line
is, and at most one change he can take or skip. Days he marks **Not fully logged** stop counting toward his burn, so
the one change rests on honest numbers.

**Benchmark (read 2026-11-25):** MacroFactor says its algorithms have "one major Achilles heel: partial food logging."
At check-in it "will check for days which look likely to be partially logged" and asks whether to "mark any of these
days as partially logged"; marked days are "ignored by the algorithm"
([MacroFactor, partially logged days](https://help.macrofactorapp.com/en/articles/29-how-do-macrofactors-coaching-algorithms-deal-with-partially-logged-days)).
**What we copy:** suggesting the days that look partial, marking them only on his tap, and leaving them out of the
burn estimate. **What we add:** one monthly page across training, food, sleep and body, each line saying how sure it
is. **What we keep out:** a score, a grade on how well he stuck to the plan, and any change that applies itself.

## Recommended defaults (approved when Gavin merges this brief)

### Slice A: Not fully logged (HONEST-BURN)
1. **The mark:** a new event `FOOD_DAY_PARTIAL_SET` on a lived day, payload `{ partial: boolean }`. The newest one for
   that day wins, so unmarking is the same event with `false`. No table, no Dexie version; old events parse unchanged.
2. **Where he marks it:** BODY · a day's health record (`DailyHealthRecord.tsx`), one row under the day's food:
   **Not fully logged** (a switch, 44 px). Marking shows **UNDO** (a fix, his Nov 24 undo pick).
3. **What it changes:** `projectExpenditure` leaves marked days out of intake. They don't count toward
   `MIN_INTAKE_DAYS`, so the estimate may go back to WAITING, and its card says "3 days left out: not fully logged".
   Weigh-ins on those days still count. The weekly proposal reads the same estimate, so it follows.
4. **Suggested days:** at the top of the monthly review, when finished days in the 28-day window have logged calories
   under **half** of his median logged day in that window, one row says "3 days look short. Mark them as not fully
   logged?" with each date and its calories, a switch per day, and **DONE**. Nothing is marked by itself, and a day he
   left unmarked isn't suggested again.
5. **Protein days** in slice B skip marked days the same way.

### Slice B: the Mission panel
6. **Where:** the monthly review, first, above BODY COMPOSITION and ASKS-COUNT's panel. Nothing on TODAY, no alert.
7. **Goal line:** his goal weight from targets (`goalWeightLbs`) and the title of each active mission. With no goal
   weight: "No goal weight set" with **SET GOAL**, which opens targets.
8. **What he did (the 28 lived days):** one line each, each a link:
   - **Training:** "9 of 12 planned sessions", from finished STANDARD and REDUCED sessions against
     `strengthSessionsTargetPerWeek` × 4; runs counted beside it. Opens the workouts metric page.
   - **Protein:** "Protein target hit 16 of 22 logged days", against the same target the food diary shows
     (`getEffectiveProteinTargetG`); marked and unlogged days are left out and named. Opens the protein metric page.
   - **Sleep:** main sleep average and nights recorded. Opens the sleep metric sheet (`SleepMetricSheet.tsx`).
9. **What moved:** one line each, each a link:
   - **Weight trend:** change over the window from the existing `windowWeightChange`. Opens the weight metric page.
   - **Strength:** the three lifts he did most, each as the change in best estimated one-rep max on the same exercise
     (`getStrengthReview`; substitutions don't count). Opens the lift's records.
   - **Resting heart rate:** the change in the weekly average from Garmin. Opens the resting metric page.
10. **How sure:** each line ends with its evidence, like "from 21 weigh-ins" or "from 5 sessions of bench". Under the
    floors it says what's missing instead of a number: weight needs 8 weigh-ins over 14 days (the expenditure floors);
    protein 14 logged days; sleep 14 nights; strength 3 sessions of that lift; resting heart rate 14 days. Nothing is
    called "working" or "stalled".
11. **At most one change, picked in the design's order:**
    - If a line is missing data, the one change is to fix coverage: "Food logged on 11 of 28 days. The burn estimate
      needs 14." with **OPEN FOOD**.
    - Else, if training ran under three quarters of plan: "You did 7 of 12 sessions. Keep the plan, or lower your
      target to 2 a week?" with **SET 2 A WEEK** (writes `strengthSessionsTargetPerWeek`) and **KEEP**.
    - Else, if the weekly calorie proposal stands (`PROPOSAL`): the same proposal, the same numbers and reason, with
      the existing accept path. **Never a new calorie number.**
    - Else: "Nothing to change this month." with no button.
    - Each change shows **SKIP**. Taking it shows **UNDO**. A skipped change isn't shown again until next month's
      review.
12. **Delta:** Delta's monthly line may name the one change and link to the panel; it reads nothing new.

## Everything is his to change
The mark on every day, with undo; the "half of your median" share for suggested days and the evidence floors (shown on
the panel and listed on MORE · Your numbers once YOUR-NUMBERS-001 is built); his goal weight and session target
through their existing screens; whether the Mission panel shows (one switch in the review's settings, on by default);
every change, taken or skipped.

## Design principles check (Vision, Nov 24)
- **Always says why:** each line says how sure it is and what it's from. **Yours to change:** every mark, every
  change, the floors. **Calm:** once a month, inside the review he already opens. **Fix, don't ask:** short days are
  suggested with their numbers; one tap marks them. **Simple first:** three lines of what he did, three of what moved,
  one change. **One tap for the usual:** take or skip.

## Scope
- Slice A: `domain/common/types.ts` (`FOOD_DAY_PARTIAL_SET`), its payload schema, `application/foodDayMark.ts`
  (set, read, the newest wins), `engine/expenditure.ts` (input gains the marked day ids; marked days leave intake),
  `weeklyQueries.ts` (passes them), the expenditure card's "left out" line, `DailyHealthRecord.tsx`, the suggested
  days row in the monthly review.
- Slice B: `application/missionReview.ts` (pure, over existing queries), `monthlyReviewQueries.ts` (returns the
  panel), `ui/screens/review/MissionReviewPanel.tsx` (+ css) in `WeeklyDashboard.tsx`, links to `MetricDetailSheet`,
  `SleepMetricSheet` and the lift records.
- Tests: with no mark saved, the estimate and proposal are byte-for-byte today's; a marked day leaves intake and the
  day count; unmarking restores it; UNDO; suggested days use half the median and skip days he left unmarked; each
  line's floor abstains at one under and shows at the floor; substitutions don't count as the lift; the one change
  follows the order and is never a second calorie number; SKIP holds until next month; nothing writes without a tap;
  native backup round-trip with marks; 320 px and axe on the panel.

## Excluded
A new calorie or protein rule (the existing proposal is the only food change). Marking days without his tap. A score,
grade or streak. Body-fat or muscle claims from the scale. A clinician outcome ("talk to your doctor" stays out unless
he adds it). Changing the monthly cadence. Measurements and photos (they stay in BODY COMPOSITION).

## Acceptance
- Phone check (slice A): mark yesterday Not fully logged in its health record. The burn card says one day was left
  out. UNDO puts it back.
- Slice B, on the monthly week: the Mission panel shows the goal, three lines of what he did, three of what moved,
  each with its evidence. Tap each: it opens its metric page.
- With few weigh-ins, the weight line says what's missing, and the one change is about coverage.
- Take the one change: it saves and shows UNDO. SKIP: it's gone until next month.

## Decision record
- The mark is an event on the day, not a field on meals, so it can be undone and backs up like every other fact.
- The one change reuses the weekly proposal so there is one calorie number, never two.
- The change order is the Mission design's: coverage first, then consistency, then food.

## Stop and ask Gavin if
- His session target isn't set (the training line then needs a different plan count).
- Leaving marked days out sends the estimate to WAITING for more than half his past months.
- A metric a line links to has no page.

## Risks
- **Burn drift:** the byte-for-byte test with no marks is the guard.
- **Too many suggested days:** half the median is strict; the row lists dates so he can see why.
