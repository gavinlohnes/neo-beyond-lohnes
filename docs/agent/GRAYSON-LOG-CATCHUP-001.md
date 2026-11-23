# GRAYSON-LOG-CATCHUP-001 — Post-shift catch-up

- **Owner authorization:** Gavin, 2026-11-23, on the logger proposals: "Then: 3, the post-shift catch-up. It's the
  biggest time saver for how your nights actually go." Proposal 3: "After SHIFT DOWN (beside the close), one screen
  asks 'On shift, did you have:' and lists your usual shift foods and drinks. Tick what you had and each item is
  logged at a sensible time." Then: "Take your questions and answer them in the best way. Keep working."
- **Lane:** PROTECTED (TODAY composition after SHIFT DOWN; a new reading of log history). Independent exact-head
  review, green CI and Gavin's merge required. **Builder:** Claude Code. **Starting commit:** master `e0b12d13`.
  **Branch / PR:** opened after #619 merges (no stacking).
- **Operator benefit:** the food and water he had at work but didn't log get recorded in one pass when he gets home,
  at roughly the right times, so protein, water and the eating window reflect the real night.
- **Rules:**
  - Shown on TODAY after SHIFT DOWN on a day with a scheduled shift, just above CLOSE THE DAY, once per day (device
    flag, like the close). Hidden while a workout, reset, SHIFT DOWN or operation conflict holds the screen.
  - "Usual" means the last 28 days of shift days: a saved meal logged inside the shift on at least 2 of them (top 5,
    most often first), and water if it was logged inside the shift on at least 2 of them. Manual meals and archived
    saved meals are not offered.
  - Already logged tonight inside the shift: that meal is left out; water offers only the usual count minus tonight's.
  - Time: a meal at its median point into the shift; water spread evenly across the shift; never before the shift
    starts or after its end or now. Servings and water amount are his most common ones.
  - Nothing is ticked for him. LOG n writes each ticked item through `logMeal`/`logWater` on tonight's day; a failure
    keeps what saved and offers the rest again. NOTHING ELSE writes nothing. Neither card uses red.
  - Shows nothing when there is no pattern yet.
- **REUSE:** C1.3's close card frame and device flag, SHIFT DOWN completion, `livedDayShiftWindow`, `getMealEntries`,
  `getHydrationEntries`, `logMeal`, `logWater`, LOG-TIME-001 placement. MyFitnessPal "recent/frequent foods" and
  "copy meal" as patterns. **OWN:** `application/shiftCatchUp.ts` (`deriveCatchUp`, `getShiftCatchUp`),
  `ShiftCatchUpCard`. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no schema, event, command, Engine or backup change; no new notifications; no change to the close card
  or SHIFT DOWN; no editing amounts in the card (fix afterwards in the food diary/BODY).
- **Acceptance:** pure tests (pattern threshold, median time, servings, water slots, tonight's logs, now/shift clamps,
  outside-shift logs ignored); browser at 320/360/412 px on two prior shifts (items shown, nothing pre-ticked, no red,
  no overflow, axe, LOG 2 writes the bowl at 22:30 and water at 21:00 and 03:00 on tonight, then the close shows;
  NOTHING ELSE writes nothing); DayClose suite unchanged; full suite.
