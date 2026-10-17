# ULTIMATE-FOUNDATION-002 — Training Record

Gavin approved the Training Record recommendation from the read-only ULTIMATE-FOUNDATION
investigation on 2026-10-17 ("approve, Protected, Claude Code, defer pause"). Sole Builder:
Claude Code. Lane: PROTECTED. That was Gavin's choice: the slice reads only, but it makes one
shared derived volume figure and runs beside an in-progress workout. Fresh starting master:
`8c8b25feb90fd49f30e40d283547e90a6f4dd65a`. Branch: `ccr-f27681c1-sb8gif`. Active PR: linked
from the branch. No merge or deployment authority.

## Outcome and approved boundaries

Make TRAIN's own history inspectable, the training counterpart of #232's Connected Health
Record:

- **TRAIN → HISTORY** (pre-workout, beside RECORDS) lists finished and stopped strength sessions,
  newest first. Each row shows date, template, variant, real status, duration, working sets,
  volume and records set.
- **Session record**: each exercise's sets in logged order, with skipped and substituted sets
  labelled and undone sets left out; the records set that session; and its volume.
- **Lift history during a workout**: a HISTORY control on the current exercise opens that lift's
  existing strength curve and its last three finished sessions' working sets. It closes back to
  the same set; set inputs, focus, the rest timer and Gym Mode are unchanged.
- **One volume rule**: weight × reps over non-skipped, non-undone sets, substitutes included
  (performed work), used by the finish summary, HISTORY and the session record. The rule is the
  one the finish summary already applies, so no number the operator sees today changes.

Session rows follow the existing RECENT rule: STANDARD and REDUCED only, ACTIVE excluded, and
ABANDONED shown under its own status, never as finished. A lift's history follows the existing
strength-curve and RECORDS rule: finished sessions only, with substitutes excluded because a
substitute is a different lift in the same slot. Existing Performance Brief LAST and RECENT
stay as they are.

Reference: the owner-frozen `beyond-ultimate-integrated-prototype.html` (TRAIN history, the
per-exercise history sheet, previous performance). It is a design reference only; none of its
synthetic state or simplified writes is integrated.

## Exclusions

- REVIEW-001 #231 owns trends and aggregate strength analytics (Phase 1b): strength change,
  weekly volume growth, sets per muscle, balance and relative strength. This slice shows what
  happened in each session and lift and draws no conclusions. Phase 1b may reuse the volume rule.
- #232 (ULTIMATE-FOUNDATION-001) owns BODY and the History focus plumbing. A session's link to
  its History day waits for #232 to merge, then reuses that plumbing.
- Pause/resume is deferred by Gavin (2026-10-17). It needs new events and stored state.
- No Engine, recommendation, progression, schema/migration, event or command semantics, backup
  format, fixture, dependency, provider, CI or protection change. No editing of past sessions;
  corrections stay with the existing undo. Rollback is a presentation and read-model revert with
  no data conversion.

BUILD OWNED: small read-model queries and TRAIN components. Reuse `StrengthCurve`,
`CollapsibleRow`, `ReadoutGrid`, `getPerformedSets`/`getUndoneSetIds`, `findSessionRecords`,
`getExerciseNames` and `templateLabel`.

## Acceptance

- One tested volume function, used by the finish summary, HISTORY and the session record.
  Integration tests cover undone, skipped, zero-rep and substituted sets.
- RECOVERY and ACTIVE sessions never appear in HISTORY; ABANDONED keeps its real status. An undo
  removes the set (and any record it carried) from HISTORY on the next read.
- Opening HISTORY, a session record or lift history writes nothing (event count unchanged).
  During a workout, unsaved weight/reps, the rest countdown and the current set survive opening
  and closing lift history, and focus returns to the HISTORY control.
- A retained TRAIN keeps an open session record across a tab round trip. Lift history reads only
  when opened, not after every logged set.
- 320/360/412 px with no horizontal overflow and one main landmark. Values are part of each
  control's accessible name. Reduced motion is respected.
- History reads work offline from IndexedDB in the built PWA, including after a reload.
- The full `npm run verify` gate, a built-PWA walkthrough script with screenshots, and green
  required CI. Then an independent exact-head review and Gavin's separate merge decision.

## Review map

- `application/trainHistoryQueries.ts`: `workoutVolumeLbs`, the session history list, a session
  record and a lift's recent sessions. Reads only.
- `train/TrainingHistory.tsx`: the HISTORY list and session record.
- `train/LiftHistory.tsx`: lift history during a workout, reusing `StrengthCurve`.
- `train/TrainScreen.tsx`: the HISTORY row, the lift-history control on the current exercise,
  and the finish summary switched to the shared volume rule.
