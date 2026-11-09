# SLEEP-RHYTHM-001 — when you sleep, across shifts

- **Authorization:** Gavin, 2026-11-09: "I'd like the next thing we do to be really impressive and add a lot of
  value. It can be anything you'd like." Builder (Claude Code) chose **sleep regularity across shifts**
  (numbered 27 in the 2026-11-08 "what's left" list he picked from). **Lane: routine.** It is read only and adds no stored data, schema, dependency or provider. It
  changes nothing in Engine advice or TODAY's composition, so it is not Protected.
- **What:** the existing sleep page (TODAY's sleep tile / DATA sleep / the cave's VITALS) gains a **RHYTHM · LAST 4
  WEEKS** section:
  - One row per measured night on a 24-hour strip, with work days solid, days off outlined and unset days dim.
  - In words, for work days and for days off: "asleep around …, up around … · usually within … · N nights".
  - How far the clock moves between work days and days off, framed as time zones.
- **Rules kept:** Garmin's measured start and end times only, because logged sleep has no clock times. A lived day's
  main sleep is its longest session of 3h or more, so naps are left out. Each group needs at least 3 nights, and
  missing stays missing. There is no score, streak or advice, and the page says so ("Nothing here changes advice").
- **Method:** circular statistics for clock times (mean via sin/cos; spread = median distance from the typical
  midpoint), so 11:30 pm and 12:30 am average to midnight rather than noon. The work/day-off difference is the
  "social jetlag" measure (Wittmann et al., 2006) adapted to declared work days.

## Leverage gate
- **REUSE:** the existing sleep page and Garmin import, lived days and day kinds (`groupLivedDays`), circular
  statistics, and the social-jetlag measure.
- **OWN:** the mapping onto BEYOND's lived days and declared work/off days, and the plain wording.
- **BUILD FROM SCRATCH:** none (about 100 lines of pure maths, no library warranted).

## Evidence
- `tests/engine/sleepRhythm.test.ts` covers:
  - clock maths across midnight and from Garmin's zone offset;
  - a night-worker month: naps and old nights excluded, the usual times per kind, and the clock-change line;
  - nothing stated without enough nights;
  - the chart's split bars.
- `tests/browser/SleepRhythm.test.tsx` covers the real sleep page with a synthetic Garmin month: the lines, one row
  per night, both kinds shown, no false clock-change claim, fits 360 px, and never writes.
- Screenshot: `docs/screenshots/sleep-rhythm-001/rhythm.png` (invented data).
