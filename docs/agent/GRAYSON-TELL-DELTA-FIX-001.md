# GRAYSON-TELL-DELTA-FIX-001 — fix sleep, weight, check-ins and sets by telling Delta

- **Authorization:** Gavin, 2026-11-24. Backlog row **E11** (EASE, principle 8 "tap or say it"): "Fix anything by
  talking to Delta: sets, sleep, weight and check-ins (today it's only meals, water and protein)"
  (`/mnt/project-files/grayson/BACKLOG.md` row 11). His rule: **"I should be able to edit and tweak or correct
  everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (Delta proposing writes to records). No new event, table or Dexie version: every fix goes through
  a correction command that already exists. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `f70a4a65` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-tell-delta-fix-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#22** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25). It changes Delta's tool list
  (`alfredTools.ts`), so it rebases on any open PR that touches it.

## Objective and benefit
Delta can already propose fixing a meal, water or protein entry from the current or previous lived day (`fix_entry`,
`application/alfred/fixEntryRules.ts`). It can also correct or remove only today's latest water, sleep or weight log
(`correct_log`, `remove_log`). Each one goes through a card he confirms.

The other fixes he makes most need a screen: a weigh-in from Tuesday, last night's sleep when it wasn't the latest log,
a check-in tapped wrong, or a set logged at 135 when it was 155.

After this, he can say "I slept 6 and a half, not 7", "Tuesday's weight was 182.4", "my stress was a 2 this morning, not
a 4" or "my third bench set was 155 for 8". Delta shows the same kind of card with before and after. CONFIRM saves it
through the app's own correction, with UNDO.

**Benchmark:** none new. This is the Vision's principle 8, "tap or say it", applied to fixes. It reuses ALFRED-FIX-001's
card.

## Recommended defaults (approved when Gavin merges this brief)
1. **Window:** entries from the last 7 lived days, the same week the log-time day picker offers (LOG-WHEN-001). Today's
   meal, water and protein window widens to match.
2. **Kinds added to `fix_entry`** (and its `day_entries` listing): **SLEEP** (correct minutes, or remove), and
   **WEIGHT** (correct pounds, 50 to 700, or remove). They go through `correctSleep`, `voidSleepLog`,
   `correctBodyweight` and `voidBodyweightLog`. A Garmin-filled sleep corrected here becomes his own correction, so
   Garmin never overwrites it (`garminSleep.ts`).
3. **Check-ins:** a new tool, `fix_check_in`, for one check-in in the window. It names only the answers that change, in
   `correctCheckIn`'s own ranges (`checkInCorrectionCommands.ts`: energy, stress and mood 1 to 5, the others 0 to 5),
   and keeps the rest as recorded. It goes through `correctCheckIn`, and UNDO through `undoCheckInCorrection`, so
   History marks it edited as today, and a fix to today's check-in re-works today's plan as a fix on screen does.
4. **Sets:** a new tool, `fix_set`, for any set of a finished or stopped session in the window: correct (weight, reps,
   warm-up mark, reps left), remove, or add a forgotten set. It goes through `correctSet`, `removeSet` and
   `addSetToSession`, with UNDO through `undoSetFix`. A set in the workout in progress is left to TRAIN.
5. **The card:** "Sleep on Tue Nov 24: 7 h 00 min → 6 h 30 min", "Bench press, set 3: 135 lb × 8 → 155 lb × 8", with
   CONFIRM and CANCEL. BEYOND fills in the entry from the record and re-checks it on CONFIRM. If it changed since the
   card was made, the card says so and saves nothing (ALFRED-FIX-001's rule).
6. **Only when he says so:** each tool's description tells Delta to propose a fix only when he says something is
   wrong. Delta never offers one from a pattern it noticed. `correct_log` and `remove_log` stay as they are for today's
   latest log; their descriptions point an older sleep or weight to `fix_entry`.
7. **Several at once:** "Fix Monday and Tuesday's weights" gives one card per entry. There's no bulk confirm.

## Everything is his to change
Every fix Delta proposes is his to confirm, cancel or undo. The entries stay fixable on their own screens as today.

## Design principles check (Vision, Nov 24)
- **Tap or say it:** every common fix by voice or text. **Fix, don't ask:** one card, one confirm, then UNDO.
  **Always says why:** the card shows before and after. **Yours to change:** nothing is saved without his CONFIRM.

## Scope
- `application/alfred/fixEntryRules.ts` (SLEEP and WEIGHT kinds, the 7-day window), `application/alfred/alfredTools.ts`
  (`fix_entry` description and input, `day_entries`, new `fix_check_in` and `fix_set`), `application/alfred/alfredActions.ts`
  (their proposal types), the card confirm path (`fixEntries.ts` and its siblings), `application/logEntries.ts` if
  `LogKind` widens, and the card UI in the Delta sheet (+ css).
- Tests: each kind's correct and remove through its real command, with UNDO; a Garmin-filled sleep corrected by Delta
  is never refilled; the window refuses day 8; a changed entry refuses on CONFIRM; check-in answers outside `correctCheckIn`'s
  ranges are refused; a set in the workout in progress is refused; no tool writes without CONFIRM; each new tool's description says
  "only when he says it's wrong"; 320 px and axe on each card.

## Excluded
Fixing a Garmin night itself (SLEEP-WRONG-001 owns that). Workouts in progress. Habits, home jobs, People dates and work
records (their own briefs). Bulk fixes. New free-helper phrases.

## Acceptance
- Phone check: tell Delta "my weight on Monday was 181.6". A card shows Monday's weigh-in before and after. CONFIRM:
  BODY shows 181.6 · edited. UNDO puts it back.
- "My third bench set last workout was 155 for 8": the set card, CONFIRM, and TRAIN history shows the fix.
- "My stress this morning was a 2": the check-in card, CONFIRM, and History marks it edited.

## Decision record
- Existing correction commands only, so a fix by voice and a fix by tap leave the same record.
- Seven days, matching the log-time picker, so "Tuesday" works all week.
- Workouts in progress stay in TRAIN, where the set is in front of him.

## Stop and ask Gavin if
- A correction command needs a value Delta can't get from the record or his words (a check-in answer that wasn't
  asked).

## Risks
- **Wrong entry:** BEYOND fills the card from the record and re-checks on CONFIRM, and he sees before and after.
