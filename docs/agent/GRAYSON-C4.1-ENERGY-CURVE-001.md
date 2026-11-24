# GRAYSON-C4.1-ENERGY-CURVE-001 — the energy curve's body clock on night runs

- **Owner authorization:** Gavin, 2026-11-23 22:01 CT: "Go on C4.1, the energy-curve fix" (choosing C4.1 from the
  offered next objectives). This phase is **investigation and paperwork only**: the brief and the
  [decision draft](../decisions/GRAYSON-C4.1-ENERGY-CURVE-001.md) go to Gavin before any model code changes.
  Implementation starts only on his approval of an option and the open questions below.
- **Lane:** PROTECTED (TODAY panel guidance, campaign plan C4.1). Independent exact-head review, green required CI,
  Gavin merges. No Builder merge.
- **Builder:** Grok Bot. **Starting commit:** `origin/master` `82a927e5bb599b4531825a67865e6f1b0a63130f` (#633, #634,
  #635 merged). **Branch:** `codex/c41-energy-curve`. **PR:** pending (not opened in this phase).
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

## Proposed fix (recommended option R in the decision draft; awaits Gavin)

In `application/alertness.ts`, replace the fixed anchor with a pure `bodyClockLow(history)`:
- Walk main sleeps (≥ 180 min) of the last 28 days oldest first, starting at the oldest sleep's own target
  (wake − 1.5 h).
- Each later main sleep: if its target is later, the low moves toward it by **at most 30 min**
  (`BODY_CLOCK_DELAY_H_PER_SLEEP = 0.5`, Stone 2018); if its target is earlier (a night-time sleep), the low returns to
  it at once.
- `energyCurve` takes the history separately; `nights` (7-day, MIN_NIGHTS gate, "usual wake" shown) is unchanged.
  `EnergyCurve.basis` gains `lowMinutes`.

Exclusions: no change to sleep pressure, `LOW_FRACTION`, the lowest-stretch rule, the drive rule, caffeine, nap,
shift plan, Garmin import, schema, backup, Engine/`evaluate`, recommendations, dependencies or providers. `src/engine/**`
and `test-fixtures/protected/**` are not touched.

- **REUSE:** the two-process model and its cited constants, `habitualWake`'s wrap handling, `MAIN_SLEEP_MIN_MINUTES`
  and `RHYTHM_WINDOW_DAYS` (engine/sleepRhythm), the energy query and TODAY panel.
- **OWN:** `bodyClockLow` (~15 lines) and its two cited sources.
- **BUILD FROM SCRATCH:** that function only. No maintained, browser-offline, cited library models partial
  night-shift adaptation at this size; full phase-response-curve models (Kronauer/Forger) need light data BEYOND
  doesn't record.

## Acceptance (to run in the build phase)

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
- Typecheck, `check:architecture`, `check:risk` (expect PROTECTED), build, full `TZ=UTC npm run verify`; TODAY panel
  before/after screenshots at 320/360/412 px if the explanation sentence changes.

## Open for Gavin before the build

1. **Option:** R (recommended), N (no adaptation), or 0 (no maths change, only correct C4.1's wording). See decision.
2. **Copy:** C4.1's done-when says "copy unchanged", but "a 24-hour rhythm whose low sits about 1.5 hours before your
   usual wake" would no longer be true. Approve a one-clause amendment (draft in the decision), or keep it word for
   word and accept it as approximate.
3. **Wider lowest stretch:** with the rhythm's low in the night, "Lowest stretch" widens on short runs (night 3 of
   18–06: 04:00–07:00 → 01:15–07:00). Accept in C4.1, or tighten it in a separate follow-up.
