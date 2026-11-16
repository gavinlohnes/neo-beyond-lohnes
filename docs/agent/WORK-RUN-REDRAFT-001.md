# WORK-RUN-REDRAFT-001 — offer a fresh work-run draft when something changes

- **Authorization:** Gavin, 2026-11-15, approved item 4 of the ranked opportunities, "Offer to redo the work-run plan
  when something changes" ("Go ahead"): when a confirmed extra shift, or the existing two-short-sleeps trigger, appears,
  offer a fresh work-run draft; a new plan note is saved only when he confirms. One PR, inside Plan Today → Week
  planner, under [4.0-c](BEYOND-4.0-C.md)'s conservative rules. Do not merge.
- **Builder:** Grok Bot. Branch `codex/work-run-redraft-001` from fetched `origin/master` `4d74ac26` (#554 merged).
  PR #555 (SLEEP-DEBT-LEARNED-001) is open and touches the same docs; no source overlap.
- **Lane: Protected.** `npm run check:risk -- 4d74ac26` suggests PROTECTED (Decision Register and brief edits). It also
  extends 4.0-c's Protected conservative composition review: it reads issued Engine guidance and offers a plan change.
  Independent exact-head review, green CI; Gavin merges. No Engine, schema, command/event, notification, backup or
  provider change.

## Triggers (the smallest well-defined set)

The latest saved work-run note in Capture is the snapshot. Its own day lines (`YYYY-MM-DD — Work|Day off (basis)
· starts HH:00`, written by the existing composer) are compared with today's Week planner context. Read-only:
`detectWorkRunChange` is pure; `getWorkRunRedraftOffer` only reads (`src/application/workRunRedraft.ts`).

1. **Work context changed on a date the note still covers.** For a saved date that is today or later and inside Week
   planner's seven dates, the current recorded / confirmed / forecast context says Work where the note says Day off,
   Day off where it says Work, or a different known shift start. The dates from the note's local save date up to its
   first day line count as saved days off: the draft (`runBlock`) skips only known leading days off (a leading unknown
   day stops the draft), so a note saved on a day off starts at the next shift, and a shift later confirmed on one of
   those skipped days (today, tomorrow) is compared too. With that, this is how a confirmed extra shift (overtime or a
   swap) shows up, including on the days off before the saved run; a confirmed day off, a recorded override or a
   saved-rotation change are the same signal and are included rather than special-cased. The reason line names the
   basis (e.g. "confirmed change"). Edge: deleting the first day line of a note makes that date read as a day off.
2. **Two short main sleeps (SLEEP-ENGINE-001), reused read-only.** The active day's latest issued Engine guidance
   carries the existing `shortSleepStreak` trace fact (`traceShortSleepStreak`, the same reading TODAY and TRAIN use)
   with its existing `shortSleepEvidence` (the nights the Engine judged). It is new only when the earliest issued
   guidance carrying that exact evidence came after the note was saved, while the note still covers a date. Guidance
   is reissued at every check-in, so the nights, not a recommendation, identify the change. Nothing is recomputed.

Never an offer: no saved work-run note; the latest one resolved in Capture; no day line left after editing; every
covered date past or outside the horizon; a date that is now unknown or what-if (unknown days are never guessed); only
the basis changed (forecast → recorded with the same work/off and start); short-sleep nights already judged in guidance
issued before the note (including later reissues of the same nights); guidance without short-sleep evidence.

Not triggers, on purpose: SHIFT-CORRECT-001's WORK_PERIOD_RETIMED / VOIDED (they correct recorded worked times on past
or current days, not the plan's future dates; a correction that changes a covered day's work/off context still shows
through trigger 1), calendar edits, task changes, missed workouts, and meal changes.

## The flow

Plan Today → Week planner → *Plan your work run*: when a trigger fires, a panel above the draft button reads
"Something changed since your saved plan note (saved …)", lists each reason, and says the saved note stays as it is
and a new note is saved only on confirm. **DRAFT FRESH RUN PLAN** runs the existing draft path, so an edited unsaved
draft gets the existing "Replace edited draft" warning (REPLACE EDITED DRAFT / KEEP MY DRAFT). Then the unchanged
REVIEW PLAN NOTE → CONFIRM SAVE PLAN NOTE step saves one new Capture note; the offer is re-read and goes away because
the new note matches. **NOT NOW** hides it until the change itself changes: a fingerprint of the note, each changed
date with its new context, and the judged nights for short sleep (never a recommendation id, so a later check-in with
the same nights stays dismissed), in this device's local storage, the coach card's SKIP pattern; an unreadable value
shows the offer again. Old notes are
never edited.

## Boundaries

No silent writes; no task, workout, food, routine or notification writes; no new live plan store (the saved note is
the snapshot; the only local value is the NOT NOW fingerprint, a display preference, not backed up); no Engine rule,
schema, migration, dependency, provider or notification-kind change. No TODAY hint: no existing TODAY surface pattern
fits an offer to open a MORE planner without adding a new card, so it is deferred.

## Reuse disposition

- **REUSE:** the 4.0-c draft journey (`getWorkRunDraft`, replace warning, confirm-once `captureItem` save), Week
  planner context (`getWeekPlanner`), SLEEP-ENGINE-001's issued trace fact, the coach card's local SKIP pattern.
- **OWN:** parsing the note's own day lines and the comparison/offer copy.
- **BUILD FROM SCRATCH:** none.

## Review response (2026-11-15, review of `8d4f7434`)

Blocked on two findings, both fixed: (1) days off before the note's first day line were never compared, so an
extra shift confirmed today or tomorrow was missed; they now count as saved days off. (2) The short-sleep offer returned
after NOT NOW and after a fresh save because each check-in issues new guidance; the trigger and fingerprint now use the
trace's judged nights (`shortSleepEvidence`). Regression tests added for both.

## Verification

`tests/integration/workRunRedraft.test.ts` (no false offer when nothing or only the basis changed, past/unknown dates,
extra/dropped shift and moved start, an extra shift confirmed on the days off before the note's first day line
(OFF,OFF,WORK,WORK,OFF,OFF,WORK), short-sleep timing by judged nights, two same-streak check-ins keeping NOT NOW and
ending after a fresh confirmed save, resolved notes, real-store confirmed overtime end to end, no
read-side writes) and `tests/browser/WorkRunRedraft.test.tsx` (nothing shown when unchanged, NOT NOW persistence and
re-offer on a new change, replace warning, confirm-only single save, Week planner placement, 320 px and axe), in UTC
and America/Chicago. Full `TZ=UTC npm run verify`; PR CI; independent review if the lane requires it; Gavin merges.

## Deferred

- A TODAY or Engine-guidance-adjacent hint.
- Further triggers: missed workouts, calendar or task changes, sleep beyond the existing fact, changes past the
  seven-date horizon.
- Showing a diff between the saved note and the fresh draft.
