# BEYOND 1.0 Roadmap

Owner rulings, 2026-09-30 (ROADMAP-1.0-001). This is the build plan for BEYOND 1.0. When the
owner says "let's work", start here: propose the next unfinished Drop, wait for approval, build
it, open a PR, and report in plain language (see `CLAUDE.md`).

## Goal

BEYOND 1.0 means TRAIN and BODY work perfectly and the whole app feels finished, calm, and fun on
a night shift.

**Principle:** each screen does one job and shows less.

## Vision

### Command Center Rules

Owner rulings, 2026-10-03.

1. Replace an app's core job, not all its features.
2. Four tabs are fixed: TODAY, TRAIN, BODY, MORE. No new tabs.
3. Every new feature must state when it surfaces. Default home is Tools; it appears on TODAY only in
   the phase where it matters.
4. The per-phase row cap is enforced by test. A new item on TODAY must replace an existing one.
5. Burden Meter is the judge: a feature that raises burden has failed.

## Build order

At most 3 changes per Drop.

### Drop 1 — Declutter I

- START WORKOUT on TRAIN's first screen, with template/variant overrides behind "Change".
  **Done (PR #118, merged).**
- During a workout, show only the current set and collapse finished sets. **Done (stacked in PR #119).**
- On TODAY, collapse a finished check-in to one line and cut helper text/dead space so MARK WORK
  ENDED and SHIFT DOWN are visible without scrolling. **Done (stacked in PR #119).**

### Drop 2 — Declutter II

- Shrink BODY's STATUS box and collapse once-a-day forms (sleep, bodyweight, protein) so the
  hydration buttons are on the first screen. **Done (PR #120, merged).**
- Cut slogans, section intros, and repeated text app-wide. **Done (PR #120, merged).**
- Remove decorative red (headers, section labels, corner brackets, the status strip edge, BODY
  selected chips). **Done (PR #120, merged).**

### Drop 3 — Tidy

- Move Planned Work to TRAIN only. **Done (PR #121, merged).**
- Add a Settings group in MORE: Nutrition Targets; backup status (replacing TODAY's reminder);
  the SYSTEM panel inside Diagnostic detail. **Done (PR #121, merged).**
- Adopt Lucide icons to replace multi-line row descriptions. **Done (PR #121, merged).**

### Drop 4 — TRAIN

- Live PR alerts. **Done (PR #122, merged).**
- A finish-workout summary. **Done (PR #122, merged).**
- Hold-to-confirm on finish. **Done (PR #122, merged).**

### Drop 5 — BODY

- A weight trend with "lowest since", milestones, and a projected goal date. **Done (PR #123, merged).**
- One-tap "same as yesterday" meals. **Done (PR #123, merged).**

### Drop 6 — Quit tracker

- A generic habit to avoid, named by the owner in the app. **Done (PR #124, merged).**
- It shows "clean days this month" (never a resetting streak). **Done (PR #124, merged).**
- A one-tap urge log (time + trigger). **Done (PR #124, merged).**
- A post-shift plan inside SHIFT DOWN. **Done (PR #124, merged).**
- Money saved. **Done (PR #124, merged).**

### Launch polish (owner-added 2026-10-01, after a review against the Launch Vision prototype)

- A quieter TODAY on calm days. **Done (PR #125, merged).**
- Mono type for small labels only; red off routine buttons. **Done (PR #125, merged).**
- BODY/TRAIN tidy: disclosure rows instead of button stacks, Planned Work under the workout card,
  LOG clear of the screen edge. **Done (PR #125, merged).**

### Drop 7 — Tie together

- A weekly check-in screen: weight trend + goal date, workouts + PRs, quit-tracker days, protein
  average. **Done (PR #126, merged).**
- Home-screen quick-log shortcuts: water, weight, meal, urge. **Done (PR #126, merged).**

### Then: field use

Two weeks of field use. Fix whatever bugs the owner. That's 1.0.

### Field-test weekend (owner-added 2026-10-03)

Built during field use, by owner decision: the field test becomes a before/after, with the Burden
Meter (merged 2026-10-03 05:27 UTC) as the baseline line for the Oct 16 debrief. One Drop at a
time, each briefed by the owner.

- **Drop 0 — field fixes:** the saved schedule answers "Are you working today?"; open screens
  follow the 16:30 roll. **Done (PR #130, merged).**
- **Drop 1 — Day Ledger + Burden Meter.** **Done (PR #131, merged).**
- **Drop 2 — Shift Clock v1** (TODAY by shift phase, row cap by test, Time-Fit line), with rulings
  (a) no MARK WORK ENDED before the shift and (b) no check-in prompt before or during it.
  **Done (PR #132, merged).**
- **Progression re-entry** (14+ days away → ~90%). **Done (PR #134, merged).**
- **Sleep draft** ("Slept up to 7h 15m?" after Shift Down). **In review.**
- Next, in order: the Ribbon (28 lived days in Weekly); read-only findings in Weekly; stretch: urge
  if-then plans, then the check-in draft. Cut first if short on time: the expenditure readout, then
  the urge-timing finding.
- Waits until after Oct 16: the Engine reacting to evidence, rule adoption, Week Ahead,
  deload/stall suggestions, all wildcards.

## Design rules

- A hard cap on the items visible per screen.
- Hold-to-confirm only for big moments (finishing a workout, ending the day, logging a clean
  day), never for routine sets.
- Adherence-neutral: facts and trends, never shame.

## Later list (not part of 1.0)

- Google Fit / Health Connect sync.
- Progress photos.
- Pre-built meal plans.
