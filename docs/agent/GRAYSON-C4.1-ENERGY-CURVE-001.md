# GRAYSON-C4.1-ENERGY-CURVE-001 — the energy curve's body clock on night runs

- **Owner authorization:** Gavin, 2026-11-23 22:01 CT: "Go on C4.1, the energy-curve fix" (choosing C4.1 from the
  offered next objectives). This phase is **investigation and paperwork only**: the brief and the
  [decision](../decisions/GRAYSON-C4.1-ENERGY-CURVE-001.md) went to Gavin before any model code changed.
  Gavin, 2026-11-24 02:16 CT: **"Option R"**; on the explanation sentence, **"Yes, rewrite that clause"**; on the wider
  lowest stretch, **"Accept the wider stretch in C4.1"**. That approves implementation of option R as below.
- **Lane:** PROTECTED (TODAY panel guidance, campaign plan C4.1). Independent exact-head review, green required CI,
  Gavin merges. No Builder merge.
- **Builder:** Grok Bot. **Starting commit:** investigation on `82a927e5`; implementation rebased onto `origin/master`
  `1fd2c47f` (includes `a870b63a`). **Branch:** `codex/c41-energy-curve`. **PR:** see the branch's PR (status lives in
  the PR body while #606 is the oldest open PR, per DEV-FLOW-002).
- **Operator benefit:** on a night run the curve's 24-hour rhythm stops assuming his body clock has already flipped to
  his day sleep. The rhythm's low stays in the waking night (late shift, drive home) on nights 1–3, then drifts later
  at a realistic pace, instead of jumping 7 hours into day sleep whenever day sleeps become the majority of the week.

## What the investigation found (scratch reproduction on `82a927e5`, UTC and America/Chicago agree)

`application/alertness.ts` `energyCurve()` places the circadian low at `habitualWake(nights) − LOW_BEFORE_WAKE_H`
(1.5 h), where `habitualWake` is the median wake of the main sleeps in the last 7 days (`alertnessQueries.ts`
`getEnergyToday`). That assumes the body clock has fully adjusted to whatever sleep dominates the week.

| Run (3 nights, day sleeps only in the window) | Circadian low now | Rhythm's high now | Where shift-work evidence puts it |
|---|---|---|---|
| 18:00–06:00, day sleep 07:00–14:00 (his pattern) | **12:30**, asleep | 00:30, mid-shift | ~05:30–06:30 (end of shift) |
| 19:00–07:00, day sleep 08:00–15:00 | **13:30**, asleep | 01:30, mid-shift | ~05:30–06:30 (end of shift) |
| 22:00–06:30, day sleep 07:30–14:30 | **13:00**, asleep | 01:00, mid-shift | ~05:30–06:30 (end of shift) |

The 2–3 h-before-wake rule (the code uses 1.5 h, inside its cited 1.5 ± 1.0 h) is right for a sleep the clock is
entrained to. For night workers it is not: most show no meaningful shift within 3 consecutive nights (Boivin 2022
review), healthcare workers delayed a mean 1 h 40 min over 3–4 nights (Stone 2018), under 25 % of permanent night
workers adapt (Folkard 2008, already in the #592 source register).

Two more defects in the same anchor:
- **Flip.** On his 2-2-3 rotation the low jumps between 05:30 and 12:30 from one night to the next, depending only on
  whether day sleeps are the majority of the last 7 days (e.g. night 2 of one run 05:30, night 2 of the next 12:30).
- **Even-count median.** Three night sleeps (wake 07:00) plus three day sleeps (wake 14:00) average to wake 10:30, low
  **09:00**, a time matching neither.

What the #592 reconciliation already corrected still holds: with planned sleep supplied (production does) the
**displayed** "Lowest stretch" and the drive line already sit at the end of the shift (18–06: 04:00–07:00; 19–07:
05:00–08:00; 22–06:30: 04:30–07:30, drive line present). So this is a shape fix (the rhythm under the line, and its
mid-shift "peak"), not a missing warning.

## The fix (option R, approved 2026-11-24)

In `application/alertness.ts`, replace the fixed anchor with a pure `bodyClockLow(history)`:
- Walk main sleeps (≥ 180 min) of the last 28 days oldest first, starting at the oldest sleep's own target
  (wake − 1.5 h).
- Each later main sleep: if its target is later, the low moves toward it by **at most 30 min**
  (`BODY_CLOCK_DELAY_H_PER_SLEEP = 0.5`, Stone 2018); if its target is earlier (a night-time sleep), the low returns to
  it at once.
- `energyCurve` takes the history separately; `nights` (7-day, MIN_NIGHTS gate, "usual wake" shown) is unchanged.
  `EnergyCurve.basis` gains `lowMinutes`.
- TODAY's "How this is worked out" sentence: "against a 24-hour rhythm whose low sits about 1.5 hours before your usual
  wake" becomes "against a 24-hour rhythm whose low sits about 1.5 hours before you wake from a night-time sleep and,
  on a run of day sleeps, moves later by at most half an hour a day, because most night workers' body clocks lag."
  The two new sources join the panel's source list. Nothing else on the panel changes.

Exclusions: no change to sleep pressure, `LOW_FRACTION`, the lowest-stretch rule, the drive rule, caffeine, nap,
shift plan, Garmin import, schema, backup, Engine/`evaluate`, recommendations, dependencies or providers. `src/engine/**`
and `test-fixtures/protected/**` are not touched.

- **REUSE:** the two-process model and its cited constants, `habitualWake`'s wrap handling, `MAIN_SLEEP_MIN_MINUTES`
  and `RHYTHM_WINDOW_DAYS` (engine/sleepRhythm), the energy query and TODAY panel.
- **OWN:** `bodyClockLow` (~15 lines) and its two cited sources.
- **BUILD FROM SCRATCH:** that function only. No maintained, browser-offline, cited library models partial
  night-shift adaptation at this size; full phase-response-curve models (Kronauer/Forger) need light data BEYOND
  doesn't record.

## Acceptance

- New `tests/alertness.test.ts` cases, run in UTC and America/Chicago (and across both DST dates):
  1. **Property (C4.1 done-when):** for shifts 18–06, 19–07 and 22–06:30, each preceded by ≥ 2 night sleeps
     23:00–07:00, nights 1, 2 and 3 of the run put `basis.lowMinutes` inside the waking night window (shift start →
     post-shift sleep start) and never more than 30 min later per day sleep.
  2. **Day worker unchanged:** regular 23:00–07:00 nights give identical `points`, `low`, `drive` to master; a late
     weekend (wake 09:00) moves the low at most 60 min and Monday's matches master.
  3. **Reset:** one night-time sleep returns the low to that sleep's target.
  4. **Permanent nights:** 20 day sleeps converge to wake − 1.5 h and stay there (no oscillation).
  5. **No night-time sleep on record:** same as master (no invented starting clock).
  6. **No even-count artifact:** 3 + 3 mixed sleeps never give 09:00.
  7. **Drive line still present** at shift end for the three runs.
- `tests/alertnessQueries.test.ts`: the history reaches 28 days; the "3 main sleeps in the last week" gate and count
  are unchanged.
- Existing `alertness`, `alertnessQueries`, `EnergyCurve001` and TODAY suites pass unchanged (their histories are day
  sleeps only, so their anchor does not move). No protected fixture or snapshot changes.
- `tests/browser/EnergyCurve001.test.tsx` asserts the approved sentence and adds 360 px to its overflow/16 px widths.
- Typecheck, `check:architecture`, `check:risk` (expect PROTECTED), build, full `TZ=UTC npm run verify`; TODAY panel
  before/after screenshots at 320/360/412 px with "How this is worked out" open:
  [`screenshots/GRAYSON-C4.1-ENERGY-CURVE-001/`](screenshots/GRAYSON-C4.1-ENERGY-CURVE-001/) (seeded lived month,
  2026-10-21 22:10 CT: "Lowest stretch 03:45–06:45" before, "03:30–06:45" after; drive line unchanged).

## Gavin's answers (2026-11-24 02:16 CT)

1. Option: **"Option R"**.
2. Copy: **"Yes, rewrite that clause"**: the amendment above replaces C4.1's "copy unchanged".
3. Wider lowest stretch on short runs: **"Accept the wider stretch in C4.1"**. No `LOW_FRACTION` change.
