# DELTA-ADVANCED — smarter about you, not more AI (direction approved 2026-10-23)

- **Authority:** Gavin, 2026-10-23: "I approve the direction. Make the brief." This approves the
  *direction and order* below. Each item still gets its own slice brief and approval under
  DEV-FLOW-002 before implementation; items marked **Protected** need explicit owner approval.
- **Builds on** [DELTA-002](DELTA-002.md) (what changed, plain why, question buttons, tap-through
  evidence). Same rule: DELTA explains what BEYOND computed. It never decides, never claims a cause,
  never scores. The 2026-10-09 "smart by design, AI optional" ruling stands; nothing here needs a model.
- **REUSE:** existing Intelligence Spine, Whole Picture, personal-baseline and shift-forecast
  primitives, and Decision Journal; match existing evidence and explicit-user-choice patterns.
- **OWN:** mapping future approved slices to BEYOND events, rules, provenance and lived-day data.
- **BUILD FROM SCRATCH:** none for this direction-only document; future implementation slices
  must justify any new custom capability individually. No new dependency or provider.
- **Integration status (2026-10-23):** Whole Picture #283 and TODAY’s plain-language “Why this?”
  #284 merged. This does not mean every DELTA-002 part shipped. Gavin explicitly approved
  merging this documentation and #286; advanced features remain parked pending named approval.

## Guardrails (apply to every item)

1. **Data first.** An item ships only when enough real data exists for it to say something; until
   then it says what's missing and how much more logging unlocks it (DELTA-002 part 4).
2. **Patterns, not causes.** Never "X caused Y". Always show the sample size and the comparison.
3. **Every claim taps through** to the records behind it.
4. **Silence is valid.** Nothing unusual → nothing shown.
5. **Forecasts are labelled forecasts**, from your own history, never facts.

## The five items, in order

| # | Item | What it does | Needs | Lane |
|---|---|---|---|---|
| 1 | **Personal experiments** | You set one change and a window ("eat before 2 AM on work nights, 2 weeks"); BEYOND compares that window with your usual on sleep, check-in energy, weight and training, and reports what the records show, including "no clear difference". | A new record kind (the experiment) | **Protected** (new event/command) |
| 2 | **Forecast from your rotation** | Before a run of shifts: "the last 4 times you started a 3-night run on under 5 h, check-in energy fell by night 2." | Shift forecast + enough past runs | **Protected** if it feeds the recommendation; Routine as a labelled reading |
| 3 | **Unusual, against your own range** | Speaks only when a reading leaves your normal range for several days (e.g. resting HR 8 bpm over usual for 3 days). | Personal baselines (exist) | Routine as a reading; Protected if it changes advice |
| 4 | **Rotation-aware planning** | Points at real windows in the shift forecast: "your days off start Friday — your best window for the heavy session you've skipped." Suggests, never schedules. | Shift forecast + Plan (exist) | Routine (display); Protected if it ranks priorities |
| 5 | **What moves the needle** | After months of data, which of your habits line up with your good weeks, with counts and "a pattern, not proof". | Months of consistent logging | **Protected** (interprets/ranks) |

## Sequence

1. WHOLE-PICTURE-001 (Codex) → 2. DELTA-002 first slice (what changed + "Why this?") →
3. about a month of real logging → 4. item 1, personal experiments (first advanced slice) →
5. items 3 and 4 as readings → 6. item 2 → 7. item 5 when the data supports it.

## Acceptance (for every slice)

Real evidence behind every sentence; sample sizes shown; tap-through works; honest "not enough data"
state tested; nothing writes unless the slice is approved to; focused tests, full verify, green CI,
independent exact-head review, Gavin's merge.
