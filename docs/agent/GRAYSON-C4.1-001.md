# GRAYSON-C4.1-001 — Energy curve on steady nights: verified and locked

- **Owner authorization:** Gavin, 2026-11-24: "C4.1", then "Lock it in (Recommended)". That option was a small
  Protected PR with a property test on real-shaped inputs, corrected C4.1 wording, the item marked Done, and no
  visible change.
- **Lane:** PROTECTED (TODAY panel guidance), as the plan classifies C4.1. Independent exact-head review, green CI,
  Gavin's merge. **Builder:** Claude Code. **Starting commit:** master `82a927e5`. **Branch:** `ccr-380c4225-1es42i`.
- **Finding:**
  - The research audit (`docs/GRAYSON_FRONTIER_RESEARCH_RUN1.md`) withdrew #592's claim. Its simulation omitted the
    planned or usual sleep that `getEnergyToday` supplies.
  - Reproduced on current code (TZ America/Chicago):

    | Day sleep | Low with planned sleep | Low without planned sleep |
    |---|---|---|
    | 07:30–14:00 | 04:30–07:30 | 07:30–16:30 (in or after the day sleep, drive line absent) |
    | 08:00–15:30 | 05:15–08:00 | 08:45–16:30 |

  - With 3+ main sleeps, the production query supplies the planned or usual sleep. When a recorded sleep overlaps
    that assumption, the record stands in for it.
- **Change:** no runtime code. A property test locks it, and the records are corrected.
- **Operator benefit:** the energy curve on TODAY keeps showing the night-time low on steady nights. A future change
  that dropped the assumed sleep would now fail CI instead of quietly moving the low into his day sleep.
- **Out of scope:** the circadian anchor (1.5 h before habitual wake) assumes a body clock fully adjusted to nights.
  Studies of permanent night workers (Folkard) report incomplete adjustment in many participants, but nothing measures his. Replacing
  the anchor (partial adjustment, or an off-day anchor) is a separate owner-approved objective with its own
  validation.
- **REUSE:** the existing `getEnergyToday` query and its mocks in `tests/alertnessQueries.test.ts`. **OWN:** the
  grid property test. **BUILD FROM SCRATCH:** none.
- **Acceptance:**
  - `tests/alertnessQueries.test.ts`, "C4.1 steady nights": 48 day-sleep patterns (start 06:30–10:00, length
    5.5–8 h, 3 nights), each with and without a shift plan. The low starts after midnight on the shift night, ends
    before the day sleep, and (by construction) contains no sleep. The first two checks do the work.
  - Passes in America/Chicago, UTC, Europe/London and America/Los_Angeles.
  - All 48 fail if the query stops supplying planned sleep (mutation check, not committed).
  - The existing curve tests pass. Copy unchanged.
