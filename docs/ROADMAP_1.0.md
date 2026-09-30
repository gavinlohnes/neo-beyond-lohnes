# BEYOND 1.0 Roadmap

Owner rulings, 2026-09-30 (ROADMAP-1.0-001). This is the build plan for BEYOND 1.0. When the
owner says "let's work", start here: propose the next unfinished Drop, wait for approval, build
it, open a PR, and report in plain language (see `CLAUDE.md`).

## Goal

BEYOND 1.0 means TRAIN and BODY work perfectly and the whole app feels finished, calm, and fun on
a night shift.

**Principle:** each screen does one job and shows less.

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

- Live PR alerts. **Done (PR pending).**
- A finish-workout summary. **Done (PR pending).**
- Hold-to-confirm on finish. **Done (PR pending).**

### Drop 5 — BODY

- A weight trend with "lowest since", milestones, and a projected goal date.
- One-tap "same as yesterday" meals.

### Drop 6 — Quit tracker

- A generic habit to avoid, named by the owner in the app.
- It shows "clean days this month" (never a resetting streak).
- A one-tap urge log (time + trigger).
- A post-shift plan inside SHIFT DOWN.
- Money saved.

### Drop 7 — Tie together

- A weekly check-in screen: weight trend + goal date, workouts + PRs, quit-tracker days, protein
  average.
- Home-screen quick-log shortcuts: water, weight, meal, urge.

### Then: field use

Two weeks of field use. Fix whatever bugs the owner. That's 1.0.

## Design rules

- A hard cap on the items visible per screen.
- Hold-to-confirm only for big moments (finishing a workout, ending the day, logging a clean
  day), never for routine sets.
- Adherence-neutral: facts and trends, never shame.

## Later list (not part of 1.0)

- Google Fit / Health Connect sync.
- Progress photos.
- Pre-built meal plans.
