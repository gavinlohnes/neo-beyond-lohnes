# GRAYSON-FLAKES-002 — the two CI flakes slowing every builder

- **Owner authorization:** Gavin, 2026-11-24: "Go". This was approval of the plan to fix the flaky tests during the
  field week and then start C6.4.
- **Lane:** ROUTINE (a one-line UI bug repair plus tests and records). The Builder merges after an independent
  exact-head PASS and green CI (owner merge delegation). **Builder:** Claude Code. **Starting commit:** master
  `d1f088f6` (after #636). **Branch:** `ccr-380c4225-1es42i`.
- **MealRoundTrip, root cause (confirmed):**
  - Opening LOG renders `RecordSheets` once with the previous `page` before its layout effect resets it.
  - `bodyVisible` counted `page === "mealTools"` without checking the target, so in that render the hidden meal tools
    (BodyScreen) were "visible".
  - After an earlier failed meal read, BodyScreen's `[visible]` effect then started `retryMealRead()`. Its busy state
    reaches App as `mealInFlight`, and `canNavigate()` silently dropped the next MEAL tap until the read settled.
  - Real effect for the operator: after a failed read, opening LOG quietly retried in the background and could swallow
    a tap.
- **Fix:** meal tools count as visible only inside a meal sheet:
  `(target === "meal" || target === "myMeals") && page === "mealTools"`. "More meal tools" exists only there.
- **SleepMetric (#635 CI, tests 3/4):**
  - The failure was focus not returning to TODAY's sleep tile after the sheet closed.
  - The test tapped before TODAY settled, contrary to the #624 rule. It now awaits `todaySettled()`.
  - The exact focus thief is unconfirmed: it did not reproduce in 6 loaded local runs, and the tile is not remounted.
    Recorded as such, not claimed fixed beyond the race the rule removes.
- **REUSE:** the existing `todaySettled()` helper and MealRoundTrip harness. **OWN:** one condition and one regression
  test. **BUILD FROM SCRATCH:** none.
- **Acceptance:**
  - New `MealRoundTrip` test, "after a failed meal read, LOG's MEAL opens even while a slow read is still pending". It
    holds the recovery read open forever. It failed deterministically before the fix (MEAL dialog never opened) and
    passes after.
  - Every browser file using the meal helper, RecordSheets or LOG: 30 files, 277 passed.
  - SleepMetric 9/9.
- **Records:** checkpoint refreshed. Folded-in notes from the #636 review: the plan's evidence row is reworded, and
  the C4.1 brief is precise about "many" and the overlap case. The tracker's Q5 row is marked Done (#634, Codex).
