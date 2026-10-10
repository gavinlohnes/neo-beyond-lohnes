# TRAIN-OPERATOR-001 mobile evidence

Actual production-PWA captures in Chromium, at 320/360/412 × 800 CSS pixels with reduced motion
requested. The browser contexts contain synthetic test workouts entered through the existing UI;
no owner data, prototype records, fixtures, production rules or deployment are involved.

| Journey | 320 px | 360 px | 412 px |
| --- | --- | --- | --- |
| Prepare | [capture](prepare-320.png) | [capture](prepare-360.png) | [capture](prepare-412.png) |
| Record first set | [capture](active-320.png) | [capture](active-360.png) | [capture](active-412.png) |
| Resume and record offline | [capture](resumed-offline-320.png) | [capture](resumed-offline-360.png) | [capture](resumed-offline-412.png) |
| Saved partial workout | [capture](partial-320.png) | [capture](partial-360.png) | [capture](partial-412.png) |

Additional 360 px states: [no check-in](no-check-in-360.png), [full prescription](prescription-360.png),
[Gym Mode](gym-360.png), [inspection](inspect-360.png), [completed](completed-360.png),
and [recovery](recovery-360.png). Completion status is the operator's explicit existing choice;
the capture does not claim that every prescribed set was performed.

The preparation capture shows START before the full prescription and WHY. The 320 px execution
capture shows the current prescription, weight/reps entry and LOG/SKIP above primary navigation.
Progression/substitution are deliberate inspection; last performance and a chosen substitution
remain visible beside the operation. Selecting a finished exercise exposes CONTINUE to the
existing first unfinished exercise, with keyboard focus following the lift. Gym Mode, exercise
navigation, rest controls, undo and finish/partial/stop remain reachable without opening evidence.
An exercise is counted done when its prescribed slots are all logged or skipped; actual logged
sets and skipped sets are reported separately, never presented as performed volume together.

Offline procedure at each width: start and log a set online; wait for the generated service worker
to activate; reload under its control; disconnect; reload; re-enter TRAIN; verify the existing set
and current unrecorded slot; log another set offline; finish through the existing hold control.
The capture is evidence of Chromium offline-PWA operation, not a claim about every device/browser.

The existing full browser project was run using an untracked configuration selecting system
Chromium (151.0.7922.173) because the managed Playwright browser download is unavailable in this
environment. Same tests, setup and aliases; no repository test configuration or CI was changed.
Results and remaining delivery gates are recorded in the [current checkpoint](../../agent/CURRENT_CHECKPOINT.md).

Limitations: no physical-phone, iOS Safari/installed-PWA, VoiceOver/TalkBack, hardware haptic or
wake-lock acceptance is claimed. The immediate completion summary remains transient, as before;
canonical completed sessions and sets remain in the existing history/records routes. Required
GitHub CI and independent exact-head review must still pass before Gavin's separate merge decision.

Protected opportunity, not implemented: existing `logSet` adds the performed row before writing
its event, without one transaction spanning both. The UI now treats a rejected command as
uncertain, reconciles through read-only retry and never blindly repeats LOG. A failure-injection
test covers the row-present/event-missing case. Transactional row/event integrity and any repair
policy need a separate owner-approved command-layer objective; this UI PR does not rewrite records.
