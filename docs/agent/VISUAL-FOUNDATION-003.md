# VISUAL-FOUNDATION-003 — TODAY's first view on the foundation (slice 3)

- **Authorization:** Gavin, 2026-11-14: "Do all [but] 5. I don't need to be asked if I want to work out today. If I do
  want to work out I will just start a work out." Earlier the same day: "we should be transforming beyond and make
  leaps and bounds in improvements".
- **Lane:** Protected, because it changes TODAY's primary composition, approved. It needs an independent exact-head
  review. No Engine, schema, dependency, command or recommendation change.
- **Builder:** Claude Code. **Starting commit:** `5a7338bd`, with master `e1209287` merged in.
- **Branch:** `ccr-88f5c085-today-deck`.

## Scope

1. **Skyline horizon:** the mode header stays TODAY's top edge and gains the date eyebrow (`ModeHeader`'s `eyebrow`).
2. **Command line:** the eyebrow carries the date. The mode header already carries the shift, the countdown and the
   lived-day strip, so no second bar is added.
3. **Next step:** a framed panel. A recommendation card is its own panel, with the bracket and no second frame. Its
   selection, wording, actions and WHY are unchanged.
4. **Numbers:** AT A GLANCE moves directly under the next step, two across, each reading a framed panel. Garmin's
   readings are captioned in Garmin blue. Values, wording, pace dimming, BEHIND PACE, unusual labels and taps are
   unchanged.
5. **No training panel** (Gavin).
6. **Band and week strip:** the band is a framed panel with 16 px sentences. The week strip has cut-corner cells,
   with the red bracket on today.
7. **Unchanged:** WATER · MEAL · LOG, quick capture, TOOLS, Alfred, the brief, review and every sheet.

**Also in scope:**
- **BODY to 16 px:** BODY's dashboard is brought up to the amended 16 px rule, and `BodyDash001` asserts it.
- **Empty preparation frame:** fixed. The group drew a bordered empty box on shift.
- **#516's non-blocking notes:**
  - THIS WEEK says "No workouts this week." for an empty week;
  - `getActiveHabits` gets the same fixed order.

**Leverage gate:**
- **REUSE:** the foundation (#515), TODAY's existing components and their states, and BODY-DASH-001's seed, now
  shared as `tests/browser/helpers/livedMonth.ts`.
- **OWN:** TODAY's mapping onto the foundation (`todayFoundation.css`).
- **BUILD FROM SCRATCH:** none.

## Verification

- **Checks:** typecheck, the architecture check, the node and browser suites and the build.
- **`tests/browser/VisualFoundation003.test.tsx`:**
  - the date, the skyline and the order (band, next step, numbers, life, brief);
  - framed panels, and Garmin blue only on Garmin's readings;
  - no workout prompt;
  - no empty preparation frame;
  - a recommendation card framed once, with the bracket;
  - no spill, overlap or undersized text at 320, 360, 412, 768 and 1024 px;
  - axe.
- **`BodyDash001`:** the 16 px rule is asserted on BODY's dashboard. **`VisualFoundation002`:** the empty-week wording.
