# MONTH-LETTER-001 — your month in a letter

- **Authorization:** Gavin's queue pick **25** (checkpoint #457), "Monthly letter". **Lane: routine.** It is read
  only and adds no data, schema, provider or dependency. Alfred is already approved and runs only on a tap.
- **What:** DATA → MONTH gains **Your month · <month>** under the calendar: a short plain letter built from that
  month's recorded days. It covers the days recorded (work vs off), sleep (average and nights under 7 h), protein,
  workouts, and clean days and urges when any were logged. **ASK ALFRED TO WRITE IT** sends those exact facts to
  Alfred only when tapped.
- **Rules (reviewer notes on #457):** the plain letter stands alone. Every line rests on logged days and says how
  many; gaps read "not recorded", never 0. No praise, guilt or streaks. Alfred never runs automatically, and
  nothing is saved.

**Leverage gate.**
- **REUSE:** MONTH-001's `getMonth` days and `SLEEP_NEED_MINUTES`, `askAlfred`, and Day One's monthly summary
  pattern.
- **OWN:** the wording.
- **BUILD FROM SCRATCH:** none.

**Evidence.**
- `tests/integration/monthLetter.test.ts`: exact lines, "not recorded" gaps, an empty month, a month in progress,
  and the Alfred ask carrying the facts.
- The month and cave browser suites pass (25 tests).
