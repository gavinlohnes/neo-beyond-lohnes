# GRAYSON-RUN-DEBRIEF-001 — two-tap debrief when a work run ends

- **Authorization:** Gavin, 2026-11-24. Backlog row **C2.5 · Q8** (LEARN, ranked 5th), from the ranked backlog he
  approved; campaign plan item **C2.5 "Two-tap run debrief"** (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Not started). His
  rule (01:26 CT): **"I should be able to edit and tweak or correct everything in this app."** Later: **"Good, put
  that grok Bot to work. Let's get after it, brother".** Merging this brief is his approval of the defaults below;
  Grok Bot builds it once it merges.
- **Lane: FEATURE.** A Decision Journal entry through the existing journal commands, as LOOP-002's shift debrief
  is, plus one localStorage skip flag like `shiftHandoffSkips.ts`. No new record kind, event, field, Dexie version,
  Engine input, notification or navigation change. The campaign plan's lane for C2.5 is "Feature · S".
- **Starting commit:** `origin/master` `1fd2c47`. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-run-debrief-001`. **Active PR:** pending.
- **Order:** after GRAYSON-HOME-LASTDONE-001 in Grok Bot's queue. Overlap check on `1fd2c47`: the only open PR is
  #641 (campaign plan text). CHECKIN-EDIT-001 also edits `TodayScreen.tsx`, in the check-in block; keep this
  edit to the RUN OVER section (`TodayScreen.tsx` near line 2835) and rebase if CHECKIN-EDIT-001 lands first.
  Recheck open PRs at build time. While other PRs are open, leave the tracker and checkpoint to the oldest open PR
  (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

Each shift already gets a one-tap "How was it?" (LOOP-002, `reflect.ts` `closeShift`), but the run as a whole
never does. On RUN OVER, the first day off, TODAY shows the post-run report (`postRunReport.ts`: shifts, sleep,
energy, workouts) and nothing asks how the run felt. After this, the RUN OVER section asks **How did the run go?
Rough / OK / Good**. One tap saves it. A second, optional line takes **One thing for next run**. It's kept in
the Decision Journal beside the shift debriefs, so later LEARN work (Weekly, Delta) reads a run-level answer
instead of guessing one.

**Benchmark:** the campaign plan's own rule for C2.5: "reuses `reflect.ts` shift-debrief; shows once per run;
never asks about calls or people". There's no outside app claim in this brief.

## Recommended defaults (approved when Gavin merges this brief)

1. **Where and when:** inside TODAY's RUN OVER section ("After the run"), between the post-run report and the
   recovery contract. Only on RUN OVER, under the same hiding rules as that section. Once per run: the run is
   identified by its last work day (`PostRunReport.to`). With no post-run report (no recorded work days), it
   doesn't show.
2. **Tap 1 (principle 3):** **How did the run go?** with **Rough / OK / Good**, reusing `SHIFT_FELT`. One tap
   saves a journal entry: title **Run debrief**, context **Run Nov 18 to Nov 21, 4 shifts** (from the report),
   decision **Run felt rough**.
3. **Tap 2, optional:** the card then shows **One thing for next run (optional)**, 200 characters, with **SAVE**
   and **DONE**. SAVE adds it to the same entry as its expectation, "Next run: …". DONE leaves the entry as it
   is. Placeholder: "Bed by 9 on night one". It never asks about calls, patients, people or details from work.
4. **Fix it (principles 1 and 2):** after saving, the card reads **Run felt rough · CHANGE**. CHANGE re-picks the
   word or edits the line on the same entry through `modifyDecisionJournalEntry`. That's a fix, so it shows the
   shared 8 s Undo (`FIX_UNDO_MS`, from GRAYSON-FIX-UNDO-001) if that has landed. Otherwise it changes in place
   with no undo, and the build PR notes that. The first save is a new log and stays quiet (his Oct 29 and Nov 24
   ruling).
5. **Skip:** **NOT NOW** hides it for this run. It's a UI flag in localStorage
   (`beyond:runDebriefSkipped:<runEnd>`), like `shiftHandoffSkips.ts`, so it writes no record.
6. **No follow-up nag:** the title isn't `SHIFT_DEBRIEF_TITLE`, so `followUpsDue` never turns it into a "how did
   it go?" the next day. Asking about "one thing for next run" at the next run's start is a later item, not this
   brief.
7. **Calm (principle 5):** no score, streak, chart or alert. Nothing here feeds the Engine or changes a
   recommendation.

## Design principles check (Vision, Nov 24)

1. Yours to change: CHANGE fixes the word and the line; NOT NOW skips it.
2. Fix, don't ask: the first save is quiet; a fix offers Undo, with no dialogs.
3. One tap for the usual: one tap is a whole debrief.
4. Built around your shift: shows on RUN OVER only, from the saved schedule.
5. Calm: once per run, no alert, no score.
6. Always says why: the context line names the run's dates and shifts.
7. Simple first: one question; the second line appears only after the first tap.
8. Tap or say it: Alfred's existing "Shift debrief: " starter is unchanged; a spoken run debrief is not in scope.

## Scope

- `src/application/reflect.ts`: `RUN_DEBRIEF_TITLE = "Run debrief"`, `recordRunDebrief({ felt, runEnd, label })`
  and `addRunDebriefNext(id, next)` through `createDecisionJournalEntry` and `modifyDecisionJournalEntry`.
  `runDebriefFor(entries, runEnd)` is pure and finds this run's entry by title and its exact context key. The
  existing exports stay unchanged.
- `src/persistence/runDebriefSkips.ts` (new): `isRunDebriefSkipped(runEnd)` and `skipRunDebrief(runEnd)`, the
  same shape as `shiftHandoffSkips.ts`.
- `src/ui/screens/today/RunDebrief.tsx` (new): the card. It reads the post-run report the same way
  `PostRunReportDisclosure` does (one read when shown) and the journal entry for this run.
- `src/ui/screens/today/TodayScreen.tsx`: render `<RunDebrief />` inside the existing RUN OVER section only.

## Excluded

Asking at the next run whether "one thing" happened; Weekly or Delta reading run debriefs (later LEARN rows);
voice; any change to the per-shift debrief, `closeShift`, `followUpsDue`, the post-run report or the recovery
contract; any alert; anything about calls or people at work.

## Files

- **In scope:** `reflect.ts` (additions only), the two new files above, the RUN OVER block of `TodayScreen.tsx`,
  CSS in the existing `today-life-state` styles, tests, `docs/decisions/GRAYSON-RUN-DEBRIEF.md`,
  `docs/agent/screenshots/GRAYSON-RUN-DEBRIEF-001/`.
- **Off limits:** `src/domain/**`, `src/engine/**`, `src/persistence/db.ts`, `journalCommands.ts`,
  `postRunReport.ts`, `recoveryContract.ts`, `lifeTransition.ts`, `ShiftHandoff.tsx`, `FollowUps.tsx`,
  `android/**`, `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** `SHIFT_FELT`, `createDecisionJournalEntry`, `modifyDecisionJournalEntry`, `getDecisionJournalEntries`,
  `getPostRunReport`, the RUN OVER section and its hiding rules, the `shiftHandoffSkips.ts` pattern, `FIX_UNDO_MS`
  and its Undo row if GRAYSON-FIX-UNDO-001 has landed.
- **OWN:** the run key, the card's two steps, the copy.
- **BUILD FROM SCRATCH:** nothing; no library.

## Acceptance

- `tests/runDebrief.test.ts` (pure and integration, in `TZ=UTC` and `TZ=America/Chicago`):
  - Tap 1 writes one journal entry with the run's dates, shift count and felt word, and SAVE adds "Next run: …"
    to that same entry.
  - `runDebriefFor` finds this run's entry and not an earlier run's. A second run gets its own entry.
  - `followUpsDue` ignores run debriefs. Skipped runs stay skipped, and the next run asks again.
  - A run whose last shift ended just before midnight Central keys to the right date.
  - Shift debriefs and `closeShift` behave as before.
- `tests/browser/RunDebrief.test.tsx`:
  - On RUN OVER, tap OK and the card reads "Run felt ok · CHANGE". Add a line, SAVE, and the journal shows both.
  - CHANGE to Rough updates the same entry, with Undo if FIX-UNDO-001 has landed.
  - NOT NOW hides the card for this run. It doesn't show outside RUN OVER, or with no post-run report.
  - A failed save shows "That didn't save. Nothing changed." and writes nothing.
  - Keyboard only; 320/360/412 px with no overflow; axe clean.
- Existing TODAY, RUN OVER, reflect, journal and follow-up tests stay green, and the new tests fail on master.
  Run `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both zones, and the full
  `TZ=UTC npm run verify`.
- **Screenshots** go in `docs/agent/screenshots/GRAYSON-RUN-DEBRIEF-001/` at 360 px, with the key ones also at
  320 and 412: the question, the optional line after a tap, and the saved line with CHANGE.
- **Device check (Gavin, Android):** on the first day off after a run, open TODAY and find the card under the
  post-run report. Tap a word, add one line, then CHANGE the word. Then KEEP / REFINE / RETHINK. Until a real
  RUN OVER comes round, the browser test is the check.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-RUN-DEBRIEF.md` (DEV-FLOW-002, 2026-11-23
amendment).

## Stop and ask Gavin if

- the work needs a new record kind, field, event or Dexie version, or a change to `journalCommands.ts`;
- it would change the per-shift debrief, follow-ups, the post-run report or the recovery contract;
- the run can't be identified once per run from the post-run report;
- the card would show outside RUN OVER or lead TODAY above the day's next step;
- any copy would ask about calls, patients or people at work.

## Risks and checks

- **Run key:** the context string carries the run's last work day, so a run whose report changes after a late log
  still keys to the same day. If the report's `to` can move, key on the saved schedule's run end instead and say
  so in the PR.
- **Journal clutter:** one entry per run, so a handful a month.
- **Size:** S.
- **Stale facts to recheck at build time:** line numbers above, `SHIFT_FELT`, the RUN OVER hiding rules, open PRs.
