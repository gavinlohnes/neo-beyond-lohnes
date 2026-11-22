# GRAYSON-TRAIN-PLANNING-CONNECTION-001

- **Authorization / lane:** Gavin approved this bounded **PROTECTED implementation** objective on
  2026-11-22. Connect the active owner-confirmed A → B → C sequence to existing Week Planner and
  Week Ahead opportunities without turning dates into programme authority. Exact-head independent
  review, green required CI and Gavin's merge approval are required.
- **Campaign item:** C4.4t.
- **Starting commit:** `c881ac1e3789d64c6dd505a4deb2c3cd09627900` (fresh `origin/master`, including
  merged workout-metric PR #584 and sequence activation PR #612).
- **Builder / branch / PR:** Codex; `codex/grayson-train-planning-connection-001`; PR pending.
- **Operator benefit:** Gavin can see what his active programme says is next while looking at his
  real week, without remembering two disconnected systems or being told that a possible day is a
  booking, deadline or missed workout.
- **Scope:** reuse existing Week Ahead opportunity eligibility and the authoritative sequence
  projection; show the same current next member and causal evidence on every eligible Week Ahead and
  Week Planner day; show honest review/unknown states; make explicit that moving or skipping an
  opportunity changes nothing and only existing qualifying workout outcomes advance the sequence.
- **Exclusions:** no fixed-date assignment, catch-up debt, time-based advancement, new planning or
  scheduling semantics, capacity/recovery change, workout start outside TRAIN, linked short/home
  variants, adaptation, navigation, Engine/recommendation/command/event/schema changes, dependency,
  provider or Google Drive work. Existing direct workout choice remains.
- **Acceptance:** no active sequence preserves existing views; active READY sequence replaces the
  competing built-in label only in the two approved planning presentations; every opportunity shows
  one unchanged projected member; days without an opportunity remain rest/unknown; review-required
  evidence abstains and points to TRAIN; reading, time passing, moving or skipping writes nothing and
  never advances; realistic 320/360/412 px journeys, failure checks, focused Node/Chromium tests,
  architecture, typecheck, build and required CI pass.
- **REUSE:** `getProgrammeView` sequence evidence, Week Ahead's existing eligible-day projection,
  Week Planner composition, current TRAIN review/direct-choice path and existing responsive rows.
- **OWN:** the read-only BEYOND mapping that labels a genuine planning opportunity with the current
  sequence member while keeping programme and calendar authority visibly separate.
- **BUILD FROM SCRATCH:** none; this is a small composition layer over existing projections.
