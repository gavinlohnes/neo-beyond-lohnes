# GRAYSON-CHECKIN-EDIT-001 — correct a check-in after you send it

- **Authorization:** Gavin, 2026-11-24. His rule (01:26 CT): **"I should be able to edit and tweak or correct
  everything in this app."** He said yes to the YOURS track and its ranked rows (01:34 and 01:36 CT), and at
  01:53 CT: **"I think we just keep working as long and much as we can."** This brief is backlog row **E2**.
  Merging this brief is his approval of the defaults below; Grok Bot builds once it merges.
- **Lane: Protected.** The check-in feeds the Engine's capacity rule and the Day Ledger. This adds a correction
  event, a corrected check-in row, a bounded edit to `src/engine/dayLedger.ts`, and a re-issued recommendation
  through the existing `evaluate()` path. No Engine rule changes, no Dexie version bump, no new table,
  dependency, provider, permission or navigation change. Independent exact-head review, green CI; Gavin
  merges. No Builder merge.
- **Starting commit:** `origin/master` `7e61e02`. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-checkin-edit-001`. **Active PR:** pending.
- **Overlap check (2026-11-24):** #639 (C6.1 + C6.2) edits `src/domain/common/types.ts` and
  `src/application/delta.ts`, both in scope here: rebase on whichever merges first and keep additions in one
  block. #606, #640, #641 and #642 touch none of the code below. GRAYSON-TRAIN-EDIT-001 (#642, Codex) also edits
  `src/engine/dayLedger.ts`, in its training-set lines; this brief edits only the check-in lines. Whichever
  builds second rebases. While other PRs are open, leave the tracker and checkpoint to the oldest open PR
  (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

He taps 2 for energy when he meant 4, or answers on autopilot at the end of a shift. Today the only way out is
to check in again: the wrong answer stays in his history, his trends and Delta's reading of him. After this,
he taps the check-in, fixes it, and the fix counts everywhere. If it was today's latest, TODAY's advice is
re-worked from the fixed answers. Nothing asks "Are you sure?", the fix can be undone, and the original is
kept.

## Recommended defaults (approved when Gavin merges this brief)

1. **Fix it where you see it:** TODAY's check-in card (`CheckInCard.tsx`) and each check-in in History open
   the same check-in sheet, filled with that check-in's answers, titled **Fix this check-in**.
2. **What can change:** energy, stress, mood, soreness and urge. Not the time it was made.
3. **Today's latest check-in:** saving a fix re-works today's advice through the same path a new check-in
   uses, and TODAY shows the new recommendation. The old recommendation and anything he decided on it stay in
   history.
4. **An earlier or past check-in:** the fix changes history, trends, Delta's reading and the Day Ledger. It
   never re-issues a past recommendation.
5. **No "Are you sure?" (principle 2):** the fix saves at once and shows **Undo** for 8 seconds. It can also
   be put back later from the check-in's "edited" detail. Undoing a fix of today's latest check-in re-works the
   advice again.
6. **The original is never lost:** a fixed check-in shows a small "edited" mark; tapping it shows the before
   and after.
7. **Counts:** a fix is not a second check-in. The day's check-in count stays the same. It counts as one
   correction in the Day Ledger's burden.

## Design principles check (Vision, Nov 24)

1. Yours to change: this brief is that rule for the check-in.
2. Undo, don't ask: Undo toast plus "Put it back"; no dialogs.
3. One tap for the usual: the sheet opens with his answers filled in; the usual fix is one tap and Save.
4. Built around your shift: "today" is the lived day, which can cross midnight.
5. Calm: no prompt to fix, no count of fixes shown to him.
6. Always says why: the new recommendation's existing reason line applies; the edited detail shows the change.
7. Simple first: the card looks the same until he taps it.
8. Tap or say it: fixing a check-in by talking to Delta is E11. Not in this PR.

## Scope

### Model (append-only; no stored row is edited or deleted)

- **New events** in `src/domain/common/types.ts`, `USER`-sourced, logged under the check-in's own
  `beyondDayId`:
  - `CHECK_IN_CORRECTED` `{ commandId, supersedesCheckInId, originalCheckInId, checkIn }`, where `checkIn` is
    the corrected `StateCheckIn` (new id, the original's `recordedAt`, a fresh `seq`, optional
    `correctsCheckInId`). The corrected row is also added to `db.checkIns`.
  - `CHECK_IN_CORRECTION_UNDONE` `{ commandId, correctionEventId }`. Only the newest fix of a check-in can be
    undone; a stale target is refused, as `correctSingleValueLog` (`commands.ts:1242`) refuses one.
- **One pure function** `effectiveCheckIns(events)` in `src/domain/checkInCorrections.ts` (new): the
  check-ins that count, from `STATE_CHECKED_IN` and `CHECK_IN_CORRECTED`, minus superseded ones and minus fixes
  that were undone; plus each check-in's fix history.
- **Readers:** `getLatestCheckIn` (`queries.ts:83`, 36 uses) filters to effective check-ins, so its callers
  need no change. These read `db.checkIns` directly and are routed through one helper,
  `getEffectiveCheckIns()`: `delta.ts`, `wholePictureQueries.ts`, `checkInDraftQueries.ts` (the next draft
  carries the fixed answers), `yearReview.ts`, `orientation.ts`, `tagPatterns.ts`, `monthRecap.ts`. The
  Builder lists any other reader found and routes it, or says in the PR why it should see raw rows.
- **The one engine edit:** `src/engine/dayLedger.ts`, the check-in block (around line 405): the latest
  check-in and the count come from `effectiveCheckIns`; `CHECK_IN_CORRECTED` and `CHECK_IN_CORRECTION_UNDONE`
  join `CORRECTION_TYPES`. Nothing else under `src/engine/` changes.
- **Integrity:** `recordIntegrityQueries.ts` checks that every check-in row has its `STATE_CHECKED_IN`
  event. A corrected row's `CHECK_IN_CORRECTED` event satisfies that check, so a fix never raises a warning.
- **Sequence numbers:** `currentMaxSeq` (`commands.ts:66`) already reads `db.checkIns`; the corrected row
  takes a fresh `seq` from `nextSeq`.

### Commands (`src/application/checkInCorrectionCommands.ts`, new)

`correctCheckIn(checkInId, values)` and `undoCheckInCorrection(correctionEventId)`, each in `writeAtomically`
with `DAY_WRITE_TABLES`. Values follow the check-in's own ranges (energy, stress and mood 1–5; soreness and
urge 0–5). `NO_OP` when nothing changes; `STALE` when the check-in was already fixed. When the target is the
latest effective check-in of the ACTIVE day, the command re-runs the same evaluation `submitCheckIn` uses
(`commands.ts:460`) and issues a recommendation with the same `RECOMMENDATION_ISSUED` event. That shared step
is pulled into one internal function so both commands call it; `submitCheckIn`'s behaviour stays the same.

### Screens

- `CheckInSheet.tsx`: a fix mode, opened with a check-in's answers, titled **Fix this check-in**, with Save.
- `CheckInCard.tsx`: tap opens the sheet in fix mode for today's latest check-in; shows the "edited" mark.
- History (`HistoryScreen.tsx`, `historyCopy.ts`): a check-in row opens fix mode; a `CHECK_IN_CORRECTED` row
  reads "Check-in fixed" with the before and after.
- Undo toast for 8 seconds with the existing save-receipt pattern and `feedback()`.

## Excluded

Removing a check-in; changing its time or day; changing the check-in's questions; any change to the capacity
rule, `evaluate()`, recommendation kinds or the draft rules; re-issuing a past day's recommendation; fixing by
talking to Delta (E11); a Dexie version bump; notifications.

## Files

- **In scope:** `src/domain/checkInCorrections.ts` (new); `src/domain/common/types.ts` (two event types, their
  payloads and optional `correctsCheckInId`, one block); `src/application/checkInCorrectionCommands.ts` (new);
  `src/application/commands.ts` (extract the shared evaluate-and-issue step only); `src/application/queries.ts`
  (`getLatestCheckIn` and the new `getEffectiveCheckIns`); the seven readers named above (routing only);
  `src/application/recordIntegrityQueries.ts` (accept the correction event); `src/engine/dayLedger.ts` (the
  check-in block and `CORRECTION_TYPES` only); `CheckInSheet.tsx`, `CheckInCard.tsx`, `HistoryScreen.tsx`,
  `historyCopy.ts`; tests; `docs/agent/screenshots/GRAYSON-CHECKIN-EDIT-001/`.
- **Off limits:** the rest of `src/engine/` (including `evaluate.ts` and `capacity.ts`); recommendation and
  draft rules; `TrainScreen.tsx` (its quick check-in keeps calling `submitCheckIn`); `src/persistence/db.ts`;
  `android/**`; `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** the supersede chain and stale/no-op refusals of `correctSingleValueLog`; `submitCheckIn`'s
  evaluate-and-issue step, shared, not copied; `CheckInSheet.tsx`; `getLatestCheckIn` as the one filter for its
  36 callers; the save receipt and `feedback()`.
- **OWN:** the two correction events, `effectiveCheckIns`, fix mode and the edited detail.
- **BUILD FROM SCRATCH:** nothing beyond those; no library.

## Acceptance

- `tests/checkInCorrections.test.ts` (pure): fix → the corrected check-in counts and the original doesn't; fix
  twice → the newest counts; undo → the previous answers return; stale and no-op refused; a day with no fixes
  reads exactly as today.
- `tests/integration/checkInCorrections.test.ts` (UTC and America/Chicago): fix today's latest check-in from
  RED-making answers to GREEN-making ones and see a new recommendation issued and shown, with the old one and
  its decision still in history; fix an earlier check-in today and see no new recommendation; fix a past day's
  check-in and see the Day Ledger's capacity, trends, Delta's reading, orientation, month recap and the next
  draft all use the fixed answers, with no past recommendation re-issued; undo each; the day's check-in count
  is unchanged and its correction count is up by one; record integrity raises no warning; a lived day that
  crosses midnight; a native backup round trip keeps the fix and the edited mark; `submitCheckIn` behaves
  exactly as before.
- `tests/browser/CheckInFix.test.tsx`: open fix mode from TODAY and from History; change energy, Save, Undo
  within 8 s; put it back from the edited detail; keyboard only; 320/360/412 px no overflow; axe clean.
- New tests fail on master. `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both
  zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-CHECKIN-EDIT-001/` at 360 px (key ones also 320 and
  412): TODAY's check-in card, fix mode, the new recommendation after a fix, the Undo toast, the edited mark and
  its detail, a fixed check-in in History.
- **Device check (Gavin):** check in with low energy, then fix it to high and watch TODAY's advice change; tap
  Undo; fix yesterday's check-in from History. Then KEEP / REFINE / RETHINK.

## Risks and checks

- **Recommendation authority:** the fix re-runs the Engine's own evaluation; it never picks a recommendation
  itself. Review checks that the shared step is the same code `submitCheckIn` runs.
- **Engine edit:** limited to the check-in block and `CORRECTION_TYPES` in `dayLedger.ts`.
- **Readers:** a reader of `db.checkIns` that skips the filter is a review blocker unless the PR says why.
- **Short-sleep and other day summaries:** they come from the Day Ledger, so a fixed past check-in can change
  a past day's capacity on history screens. That is intended, and the PR says so in its Before/After.
- **Size:** M. If review would be slow, the Builder may ship the model and History fixes first and TODAY's
  re-worked advice second, and say so when asking Gavin to merge.
- **Stale facts to recheck at build time:** line numbers above, the count of `getLatestCheckIn` uses, Dexie
  version (v26), and open PRs.
