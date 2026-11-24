# GRAYSON-TRAIN-EDIT-001 — fix any logged set, in a live or a past workout

- **Authorization:** Gavin, 2026-11-24. His rule (01:26 CT): **"I should be able to edit and tweak or correct
  everything in this app."** At 01:34 CT he said yes to an Editable track and its first brief on fixing past
  workouts, and at 01:36 CT yes to the eight design principles in the Vision ("Yes, add those to the track as
  well"). This brief is backlog row **E1** (YOURS track), first part. Merging this brief is his approval of the
  defaults below; Codex builds once it merges.
- **Undo rule (Gavin, 2026-11-24 02:02 CT, option 1 of three):** routine logs stay as OWNER-GO-001 left them
  (`docs/UX_DECISIONS.md`, 2026-10-29: the confirmation is the message only, with no UNDO). Undo shows only
  after a fix or a removal, where a slip costs more. The Undo in this brief is that case, so it stays.
  Its 8 s window is one shared constant, `FIX_UNDO_MS = 8000` in `src/ui/hooks/useUndoWindow.ts`, also used by
  GRAYSON-FIX-UNDO-001; add it if it isn't there yet.
- **Lane: Protected.** New event types, a new correction model for performed sets, and corrected sets feeding
  progression, PRs and the Day Ledger (one bounded edit in `src/engine/dayLedger.ts`). No Dexie version bump,
  no new table, dependency, provider, permission or navigation change. Independent exact-head review, green CI;
  Gavin merges. No Builder merge.
- **Starting commit:** `origin/master` `7e61e02`. Re-fetch before starting.
- **Builder:** Codex. Branch `codex/grayson-train-edit-001`. **Active PR:** pending.
- **Order:** Claude Code **#1** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24); open as #675. Originally: after GRAYSON-TRAIN-RUN-001 (#640) is built, because both edit `TrainScreen.tsx`,
  `trainCopy.ts` and `src/domain/common/types.ts`. Gavin can swap the order.
- **Overlap check (2026-11-24, rechecked):** #639 (C6.1 + C6.2) edits `src/domain/common/types.ts` and
  `src/ui/screens/history/historyCopy.ts`; #643 (check-in fixes) and #645 (remove and undo) also add event types,
  add to `CORRECTION_TYPES` in `src/engine/dayLedger.ts` and add `FIX_UNDO_MS` to `src/ui/hooks/useUndoWindow.ts`.
  #606 touches none of the files below. Keep additions in one block and rebase on whichever merges first. While other PRs are open, leave the tracker and checkpoint to the oldest open PR (DEV-FLOW-002,
  2026-11-23 amendment, rule 2).
- **Second part (E1b, separate brief):** correcting a whole session's status or length, removing a whole
  session, moving it to another day, and changing which exercise a set belongs to. Those change which workout
  comes next (A/B/C) and every session reader, so they are kept out of this PR.

## Objective and benefit

He logged 185 when he lifted 175, forgot the last set, or tapped a warm-up as a working set. Today he can only
undo the last set while the workout is still running (`undoLastSet`, `trainCommands.ts:234`). After this, he
taps any set he can see, fixes it, and the fix shows everywhere: history, PRs, the next progression suggestion.
Nothing asks "Are you sure?", every fix can be undone, and the original is always kept.

## Recommended defaults (approved when Gavin merges this brief)

1. **Fix it where you see it:** tap any logged set in the live workout (not only the last) or in a past
   session's record (`SessionRecordView` in `TrainingHistory.tsx`) to open one fix sheet.
2. **What can change:** weight, reps, warm-up or working, reps in reserve. A skipped set can be filled in with
   what he did. A set can be removed. A set he forgot can be added to a finished session.
3. **No "Are you sure?" (principle 2):** every fix saves at once and shows **Undo** for 8 seconds. Any fix can
   also be put back later from the set's "edited" detail.
4. **Corrected numbers count everywhere:** history, the workout recap, PRs, progression suggestions, stall
   detection, the strength curve, weekly and monthly pages, search and Delta's context all read the corrected
   set. A PR that only existed because of a typo goes away; a real one that was hidden appears.
5. **The original is never lost:** a corrected set shows a small "edited" mark; tapping it shows what it was
   and when it changed.
6. **Which day:** a fix is recorded on the workout's own lived day, not the day he makes it.
7. **What a set fix never changes:** the session's status, its length, the A/B/C sequence or which workout
   comes next. Those are E1b.

## Design principles check (Vision, Nov 24)

1. Yours to change: this brief is that rule for TRAIN sets.
2. Fix, don't ask (undo after a fix or removal only): no confirmation dialogs; Undo toast plus "Put it back".
3. One tap for the usual: the fix sheet opens filled with the set's current values; the common fix (weight or
   reps) is one change and Save.
4. Built around your shift: fixes land on the workout's lived day, which can cross midnight.
5. Calm: no nudges, badges or counts about fixes. Fixes count as corrections in the Day Ledger's burden only.
6. Always says why: the "edited" detail shows the before and after.
7. Simple first: the record view stays as it is; editing appears only on tap.
8. Tap or say it: fixing sets by talking to Delta is E11, a later row. Not in this PR.

## Scope

### Model (append-only; no stored row is edited or deleted)

- **New events** in `src/domain/common/types.ts`, all `USER`-sourced and logged under the **set's own
  `beyondDayId`**:
  - `SET_CORRECTED` `{ commandId, sessionId, exerciseId, setNumber, replacesSetId, newPerformedSetId, before,
    after }` where `before`/`after` hold `weight, reps, skipped, setKind, repsInReserve`. It writes a **new**
    `performedSets` row with the corrected values and the same `sessionId`, `exerciseId`, `setNumber`,
    `recordedAt` and `seq` as the row it replaces, plus optional `correctsSetId`. The replaced row is
    retracted.
  - `SET_REMOVED` `{ commandId, sessionId, exerciseId, setNumber, performedSetId }`.
  - `SET_ADDED` `{ commandId, sessionId, exerciseId, setNumber, performedSetId, weight, reps, setKind?,
    repsInReserve? }` for a finished session. The new row's `recordedAt` defaults to just after that
    exercise's last set, and is always inside the session's `startedAt`–`endedAt`. `setNumber` is the next
    free one for that exercise.
  - `SET_FIX_UNDONE` `{ commandId, fixEventId }` cancels one fix. Only the newest fix on a set can be undone,
    as `correctSingleValueLog` (`commands.ts:1242`) refuses a stale target.
- **One pure function** `projectSetFixes(events)` in `src/domain/workout/setFixes.ts` (new) returns the
  retracted set ids (from `SET_UNDONE`, `SET_REMOVED`, `SET_CORRECTED.replacesSetId`, and rows whose `SET_ADDED`
  or `SET_CORRECTED` was undone) and, per set, its fix history for the "edited" detail.
- **Readers pick it up through the existing filter:** `getUndoneSetIds()` (`trainQueries.ts:124`) returns
  `projectSetFixes(...).retractedSetIds`, so its 13 callers in other files need no change. Rename is optional; behaviour must
  match.
- **The one engine edit:** `src/engine/dayLedger.ts` uses `projectSetFixes` in place of its own `SET_UNDONE`
  filter (line 286); counts `SET_ADDED` as a training set and `SET_REMOVED` as minus one (beside line 228);
  and adds `SET_CORRECTED`, `SET_REMOVED`, `SET_ADDED` and `SET_FIX_UNDONE` to `CORRECTION_TYPES`. Nothing else
  under `src/engine/` changes.
- **Readers that skip the undo filter today:** `dayRolloverQueries.ts`, the rollover in `commands.ts`
  (line 386) and `alfred/alfredSearch.ts` read `db.performedSets` raw. The Builder routes each through the
  filter, or states in the PR why that reader should see raw rows.
- **Integrity checks:** `workoutIntegrityQueries.ts` matches stored rows to `SET_LOGGED` events. It must count
  `SET_CORRECTED` and `SET_ADDED` as the recording event for their new rows, so a fix never raises an
  integrity warning. `recordIntegrityQueries.ts` keeps seeing raw rows.

### Commands (`src/application/trainFixCommands.ts`, new)

`correctSet`, `removeSet`, `addSetToSession`, `undoSetFix`. Each runs in `writeWorkoutAtomically`. Rules, with
plain messages:
- Same value rules as `logSet` (`trainCommands.ts:142`): weight 0 or more, reps a whole number of 1 or more,
  reps in reserve 0–10 or blank, set kind WORKING or WARMUP.
- `NO_OP` when nothing changes; `STALE` when the set was already replaced; a removed set can't be corrected;
  `addSetToSession` only on a COMPLETED or PARTIAL session; working-set numbers stay unique per exercise.
- Fixing a set in the ACTIVE session is allowed and keeps the live screen correct (the next set number, rest
  and the last-set undo all read the effective sets).

### Screens

- `src/ui/screens/train/SetFixSheet.tsx` (new): weight, reps, warm-up toggle, reps in reserve, **Save**,
  **Remove set**; for a skipped set, the same fields to fill it in. Reuse the field patterns of
  `LogEntrySheet.tsx`.
- `SessionRecordView` (`TrainingHistory.tsx`): each set row opens the sheet; an **Add a set** link under each
  exercise; the "edited" mark and its before/after detail with **Put it back**.
- Live workout (`TrainScreen.tsx`): any logged set row opens the same sheet. The existing last-set undo stays.
- Undo toast for 8 seconds after every fix, using the existing save-receipt pattern and `feedback()`.
- `trainHistoryQueries.ts`: the session record carries each set's fix history for the mark and detail.

## Excluded

E1b (session status, length, removal, day move, exercise change); fixing by talking to Delta (E11); fixes for
running sessions (RUN-001 has its own); bulk edits; any change to progression rules, PR rules, the A/B/C
sequence, capacity, STANDARD/REDUCED/RECOVERY, Gym mode or C4.4; a Dexie version bump; notifications.

## Files

- **In scope:** `src/domain/workout/setFixes.ts` (new); `src/domain/common/types.ts` (four event types and
  payloads, one block); `src/domain/workout/types.ts` (optional `correctsSetId` on `PerformedSet` only);
  `src/application/trainFixCommands.ts` (new); `src/application/trainQueries.ts` (`getUndoneSetIds` body);
  `src/application/trainHistoryQueries.ts` (fix history on the record); `src/application/workoutIntegrityQueries.ts`
  (count fix events); `dayRolloverQueries.ts`, `commands.ts` rollover read and `alfred/alfredSearch.ts` (filter
  only); `src/engine/dayLedger.ts` (as above only); `src/ui/screens/train/SetFixSheet.tsx` (new),
  `TrainingHistory.tsx`, `TrainScreen.tsx` (open the sheet from a set row only), `trainCopy.ts`;
  `src/ui/hooks/useUndoWindow.ts` (`FIX_UNDO_MS` only); tests; `docs/agent/screenshots/GRAYSON-TRAIN-EDIT-001/`;
  `docs/decisions/GRAYSON-TRAIN-EDIT.md` (new).
- **Off limits:** the rest of `src/engine/`; `WORKOUT_TEMPLATES`; `trainingProgramme*.ts`; progression,
  PR and stall rules; `GymMode.tsx`; `src/persistence/db.ts`; `android/**`; `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** the `SET_UNDONE` retraction model and `getUndoneSetIds` as the one filter; the supersede chain
  and stale/no-op refusals of `correctSingleValueLog`; `LogEntrySheet.tsx` field patterns;
  `writeWorkoutAtomically`; the save receipt and `feedback()`; existing set validation from `logSet`.
- **OWN:** the four fix events, `projectSetFixes`, the fix sheet and the "edited" detail.
- **BUILD FROM SCRATCH:** nothing beyond those; no library.

## Acceptance

- `tests/setFixes.test.ts` (pure): correct → the new row is effective and the old retracted; correct twice →
  only the newest counts; undo the newest → the previous value returns; remove → retracted; undo a remove →
  back; add → effective; undo an add → gone; `SET_UNDONE` behaves exactly as today.
- `tests/integration/trainSetFixes.test.ts` (UTC and America/Chicago): fix a set in a past session and see it
  in the session record, the workout recap, the progression suggestion for that exercise, PRs (a typo PR goes
  away, a hidden one appears), stall detection and the weekly page; fix on a lived day that crosses midnight
  lands on the workout's day; add a forgotten set inside the session window; remove a set; fix a non-last set
  in the ACTIVE session, then log the next set and use last-set undo; refusals for no-op, stale, removed and
  invalid values; workout integrity shows no warning after every kind of fix; the Day Ledger's set count and
  correction count are right; A/B/C next workout unchanged by any set fix; a native backup round trip keeps
  every fix and the edited marks.
- `tests/browser/SetFixSheet.test.tsx`: open from a past set and a live set; change weight, Save, Undo within
  8 s; Remove and Put it back from the detail; fill in a skipped set; Add a set; the edited mark; keyboard
  only; 320/360/412 px no overflow; axe clean.
- New tests fail on master. `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both
  zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-EDIT-001/` at 360 px (key ones also 320 and 412):
  past session record, the fix sheet, a corrected set with the edited mark, its before/after detail, the Undo
  toast, Add a set, a live set opened mid-workout, a filled-in skipped set.
- **Device check (Gavin):** open a past workout, change one set's weight, then check that lift's next
  suggestion and PRs; tap Undo once; remove a set and put it back; add a set you forgot. Mid-workout, fix your
  first set after logging the second. Then KEEP / REFINE / RETHINK.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-TRAIN-EDIT.md`, as TIMEBOX-001 and C4.1 did
(DEV-FLOW-002, 2026-11-23 amendment).

## Stop and ask Gavin if

- the work needs a Dexie version bump or a new index;
- it needs any change to progression, PR detection or `trainSuggestion` rules beyond reading fixed sets;
- a reader of sets has to see raw rows, beyond `getUndoneSetIds`'s own definition and workout integrity;
- it would change what logging a set, the last-set UNDO or finishing a workout do today;
- it needs a change to `backup.ts`, `restore.ts` or `backupKeys.ts`.

## Risks and checks

- **Many readers:** about 20 files read performed sets. The single filter is the safeguard; the integration
  test must cover each reader family above. A reader that skips the filter is a review blocker unless the PR
  says why.
- **Engine edit:** limited to the lines named in `dayLedger.ts`. Any other engine change is out of scope.
- **Progression changes by design:** corrected sets change the next suggestion. That is the point, and the PR
  says so in its Before/After.
- **Integrity false alarms:** covered by the integrity test above.
- **Size:** M to L. If review would be slow, the Builder may ship the model and past-session fixes first and
  live-session fixes second, and say so when asking Gavin to merge.
- **Stale facts to recheck at build time:** line numbers above, Dexie version (v26), open PRs, and whether
  RUN-001 has landed.
