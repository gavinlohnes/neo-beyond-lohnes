# SPEED-UNDER-FATIGUE-001 — common actions with less hunting

**Owner:** Gavin's explicit “Speed under fatigue pack” instruction, 2026-11-15. Builder Codex. Branch `codex/speed-under-fatigue-001`, fresh master `eacbb3a0d1c1252da13281e972c0f879a11c6737`. FEATURE lane: bounded UI/reachability improvements only; no command, Engine, persistence, dependency or provider change. Green CI and Gavin's merge required. PR pending.

## Three selected actions and evidence

1. **Capture a quick thought from TODAY:** currently LOG → Note → type → CAPTURE. Add one quiet NOTE shortcut after TODAY’s existing numbers, before deeper context, reusing the exact Note composer/handler/focus/return path. One navigation tap rather than two; typed text still saves only on CAPTURE. Keep the permanent central LOG and every existing route. The canonical multiline Note form already keeps Enter/IME as text entry, never an implicit save.
2. **Resume workout logging:** TODAY's existing RESUME is already above the fold after merged RESUME-FOLD-001; do not redo it. Its WORKOUT handoff currently focuses TRAIN's top header. With a real active strength workout, land on the existing current-exercise heading so the next set is directly in view; no auto-start, auto-save or new mode. Recovery/no active session keep existing destinations and confirmation gates.
3. **Confirm the current set:** weight/reps already reuse safe prior performance; preserve them and all explicit actions. Optional metadata currently separates required entry from LOG, and exact-repeat and LOG both have primary styling. Put LOG immediately after weight/reps in normal and Gym views; optional kind/effort controls remain below, accessible and unchanged. Keep exact repeat as a one-tap secondary shortcut, with its same label and command. No default/effort copying changes, timer/undo/skip changes or logging semantics changes.

**REUSE:** existing prepared-set/one-tap repeat (DONOR-001/HARVEST), fast note composer, native focus/explicit save, canonical TRAIN handlers and foundation buttons. Proven fast-entry and resume-at-current-position patterns; no donor code/assets/dependency.
**OWN:** one existing-route shortcut, handoff focus target, and local action ordering/hierarchy.
**BUILD FROM SCRATCH:** none.

**Exclusions:** full capture/Mission 3, whole-app redesign, family sharing, metrics/evidence engine, new major surfaces, recommendation authority changes, automatic writes or gamification. The previous week-planner PR remains preserved and separate; do not merge or expand it. Current upstream launch fix merged; other approved upstream queues are not this Builder's objective.

**Acceptance:** direct Note opens existing input in one tap with focus, no write until explicit save, failure/draft/close return preserved and multiline/IME safe; workout handoff reaches current set without writes or altering rest/values; LOG before optional metadata in both views, one primary commit action, exact-repeat/skip/undo still work. Phone widths, 44px targets/16px inputs, keyboard/accessibility, existing TODAY/LOG/resume/workout regressions, type/build/architecture and green required CI. No merge.


## Verification

43 targeted Node checks PASS (workout commands/atomicity/Gym). 112 unique real-Chromium checks PASS across seven files: new speed acceptance (6), full existing TRAIN screen (71), canonical LOG, resume-fold, Gym, optional set metadata, and workout operator/recovery. Includes one-tap canonical Note, focus/draft/Enter/no-write-before-CAPTURE, next-set focus/position/defaults/rest preservation, one primary action, optional warm-up/effort still explicit, repeat/skip/undo/red-capacity/finish/recovery regressions, 320/375/768 note layouts with axe. Architecture, TypeScript and production/PWA build PASS; whitespace clean. Scope is synthetic-data browser acceptance; no claim of measured physical-device speed or user-frequency telemetry. Full required CI is the final integration gate. FEATURE lane does not require a separate Protected exact-head review under DEV-FLOW-002; no self-review approval is claimed. Gavin alone merges.
