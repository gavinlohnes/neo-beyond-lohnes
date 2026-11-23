# GRAYSON-C4.8B-001 — Eating Window meets the meal log

- **Owner authorization:** Gavin, 2026-11-23, on the logger proposals: "Then: 7 + 8 as C4.8b. They tie meals,
  fasting and training together." 7: "Logging a meal during a fast offers 'End fast now?', and logging your last food
  can offer 'Start fast?'." 8: "The meal sheet shows protein today against the window." Then: "Take your questions
  and answer them in the best way. Keep working."
- **Lane:** PROTECTED (design §11.3 "C4.8b — Meal inference and fueling guardrails"; a mark command gains a time).
  Independent exact-head review, green CI and Gavin's merge required. **Builder:** Claude Code. **Base:** C4.8a
  (#619). **Branch / PR:** opened after #619 merges (no stacking).
- **Operator benefit:** he doesn't have to remember to tap END FAST when he eats at 02:10 on shift, or START FAST
  after dinner: the card notices the meal he logged and offers the boundary at that time, one tap. While logging food
  he sees protein against the hours left to eat, before the window closes rather than after.
- **Rules (design §5.4, §5.7, §10.6/7/9):**
  - A meal never moves a boundary by itself; it produces one offer on TODAY's Eating Window card, which he takes or
    waves off (NOT NOW, remembered on the device per meal).
  - FASTING and a meal logged after the fast began (not ahead of now): "You logged <meal> at 02:10, during this
    fast." [END FAST AT 02:10]. Meals are read from the fast's own day and today.
  - OPEN with 60 minutes or less left (or past), from the last meal since it opened; or no marks today and the planned
    window is over, from the last meal today: "Last meal logged: <meal> at 21:40." [FAST FROM 21:40].
  - `markEatingWindow(boundary, at?)`: a given time must be inside today's lived day and not ahead of now. The event,
    payload and void are unchanged; `occurredAt` carries the time, as with timed logs.
  - Protein against the window, OPEN only, from the existing food diary and target: "Protein 76 / 170 g · 94 g left
    with 2:10 of window." / "…left and the planned window is up." / "Target met." No target, no line. On the meal
    sheet the same line follows "Eating window open."; while fasting: "Eating window: fasting since 00:00. Logging
    food doesn't end it; TODAY will offer that." No failure, level or streak words; no red.
- **REUSE:** C4.8a's marks, card, UNDO and void; LOG-TIME-001's `placeInDay`; `getMealEntries`, `getFoodDiary`,
  `getEffectiveProteinTargetG`; MyFitnessPal's "remaining" framing and Zero's "edit start/end time" as patterns.
  **OWN:** `deriveMealPrompt`, `windowFuelLine`, the offer row and sheet line. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no automatic or estimated boundary on the timer, no calorie/energy line, no training or recovery
  conflict text, no notifications, no change to targets, advice or Engine input, no schema change.
- **Acceptance:** pure tests (each offer case, before-fast/ahead-of-now/window-start exclusions, NOT NOW, fuel line
  wording and no failure words); integration (meal changes nothing alone; END FAST AT the meal time; ahead-of-now and
  outside-day refused); browser at 320/360/412 px (offer, no red, no overflow, axe, END FAST AT 02:10 opens at 02:10
  with the protein line; NOT NOW writes nothing; the meal sheet line); C4.8a suites unchanged; full suite.
