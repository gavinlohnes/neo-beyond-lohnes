# GRAYSON-FIX-UNDO-001 — fix and remove logs without "are you sure", with undo

- **Authorization:** Gavin, 2026-11-24. His rule (01:26 CT): **"I should be able to edit and tweak or correct
  everything in this app."** He said yes to the eight design principles (01:36 CT), including "undo, don't
  ask". At 02:02 CT he chose option 1 of three: **undo shows only after a fix or a removal**, and routine logs
  stay quiet as OWNER-GO-001 left them (`docs/UX_DECISIONS.md`, 2026-10-29). This brief is backlog row **E3**,
  rescoped to that choice. Merging this brief is his approval of the defaults below; Grok Bot builds once it
  merges.
- **Lane: Protected.** It adds one event that takes back a removal, routes every reader of the six log voids
  through one filter, and edits `src/engine/dayLedger.ts` in its void lines. No Engine rule, Dexie version,
  table, dependency, provider, permission or navigation change. Independent exact-head review, green CI; Gavin
  merges. No Builder merge.
- **Starting commit:** `origin/master` `7e61e02`. Re-fetch before starting.
- **Builder:** Grok Bot, after GRAYSON-CHECKIN-EDIT-001 (#643). Branch `grok/grayson-fix-undo-001`.
  **Active PR:** pending.
- **Overlap check (2026-11-24):** #642 (set fixes) and #643 (check-in fixes) also add to `CORRECTION_TYPES` in
  `dayLedger.ts` and add event types in `src/domain/common/types.ts`, as does #639. Each keeps its additions in
  one block; whichever builds later rebases. While other PRs are open, leave the tracker and checkpoint to the
  oldest open PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

Removing a wrong log takes a second step today: TODAY's log entry sheet asks "Remove … ? KEEP IT"
(`LogEntrySheet.tsx:84`), and BODY makes him hold DELETE (`HoldButton` with "Hold to delete.", for example
`BodyScreen.tsx:1727` and `:1814`). Fixing an amount has no way back except fixing it again by hand. After
this, Remove works on one tap and shows **Undo**, and so does every amount fix. Nothing asks first, a slip
costs one tap, and the original stays in History as it does now.

## Recommended defaults (approved when Gavin merges this brief)

1. **Remove in one tap.** Meals, water, protein, sleep, bodyweight and measurements: Remove acts at once. No
   "Remove …?", no KEEP IT, no hold.
2. **Undo after a removal or a fix, for 8 seconds,** the same window as #642 and #643. After that the
   entry's own History detail offers **Put it back** for a removal (a fix is changed by fixing it again).
3. **Undo after a fix** returns the value from before the fix, as a correction in the same chain; History
   shows both.
4. **Routine logs stay quiet:** a new log's confirmation is still the message only, with no Undo
   (OWNER-GO-001).
5. **Holds stay where the 2026-09-30 ruling put them:** finishing a workout, ending the day, logging a clean
   day. A permanent delete that can't be undone keeps its hold too (progress photos, `ProgressPhotos.tsx:179`).
6. **History tells the truth:** "Meal removed", then "Meal put back", each with its time.
7. **Counts:** a put-back is a correction in the Day Ledger's burden, like the removal before it.

## Design principles check (Vision, Nov 24)

1. Yours to change: removals can be taken back, so nothing he removes is final.
2. Fix, don't ask (undo after a fix or removal only): this brief is that principle for logs.
3. One tap for the usual: removing is one tap, not a tap and a confirm or a hold.
4. Built around your shift: entries stay on their own lived day.
5. Calm: the Undo leaves by itself; nothing new on a routine log.
6. Always says why: History names each removal and put-back.
7. Simple first: the sheet loses its confirm step.
8. Tap or say it: fixing by talking to Delta is E11. Not in this PR.

## Scope

### Model (append-only)

- **One new event** in `src/domain/common/types.ts`, `USER`-sourced, under the entry's own `beyondDayId`:
  `LOG_VOID_UNDONE` `{ commandId, voidEventId, voidedType }`, where `voidedType` is one of `MEAL_LOG_VOIDED`,
  `PROTEIN_LOG_VOIDED`, `WATER_LOG_VOIDED`, `SLEEP_LOG_VOIDED`, `BODYWEIGHT_LOG_VOIDED`,
  `MEASUREMENT_LOG_VOIDED`. Undoing a removal that was already put back is a no-op; putting back a log whose
  void can't be found is refused.
- **One pure function** `activeVoids(events)` in `src/domain/logVoids.ts` (new): the void events that still
  count, minus those named by a `LOG_VOID_UNDONE`. `voidedLogIds` (`queries.ts:272`) uses it, and so does
  every other reader of those six void types: `bodyTrendQueries`, `commands`, `externalSleepQueries`,
  `garminSleep`, `measurementCommands`, `measurementQueries`, `nutritionCommands`, `nutritionQueries`,
  `searchQueries`, `wholePictureQueries`, `historyCopy` (13 files with `src/engine/dayLedger.ts`; recount at
  build time). The Builder lists any other reader found and routes it, or says in the PR why it must see raw
  voids.
- **Corrections after a put-back:** a put-back entry can be corrected again, and voided again, like any live
  entry. The "can't be corrected afterwards" rule (UNDO-001) applies only while the void stands.
- **Undo a fix:** no new event. It calls the same `correct*` command with the value before the fix,
  `correctSingleValueLog` (`commands.ts:1242`) for single values, `correctMealLog` for meals.
- **The one engine edit:** `src/engine/dayLedger.ts`, the void lines (around 345, 364 and 368) read through
  `activeVoids`, and `LOG_VOID_UNDONE` joins `CORRECTION_TYPES` (line 183). Nothing else under `src/engine/`.

### Commands

`undoLogVoid(beyondDayId, voidEventId)` in `src/application/logVoidCommands.ts` (new), in `writeAtomically`
with `DAY_WRITE_TABLES`. The existing void and correct commands stay as they are.

### Screens

- `LogEntrySheet.tsx`: REMOVE acts at once; the REMOVED state shows Undo for 8 s. SAVE AMOUNT shows Undo too.
- `BodyScreen.tsx`: each "Hold to delete" `HoldButton` for a log (meal, protein, water, sleep, bodyweight)
  becomes a plain Remove with Undo; each CORRECT save shows Undo.
- Measurements, wherever they're removed today: the same.
- History (`HistoryScreen.tsx`, `historyCopy.ts`): "… removed" and "… put back" rows; a removed entry's detail
  offers Put it back.
- One shared constant, `FIX_UNDO_MS = 8000`, in `src/ui/hooks/useUndoWindow.ts`, used here and by #642 and
  #643 (whichever builds first adds it). `UNDO_WINDOW_MS` and its current users are left alone.

## Excluded

Undo on a routine new log (OWNER-GO-001); changing a log's time (`LogTimeEditor`); progress-photo deletes,
saved-inbox and notes deletes, and archiving saved meals; holds on finishing a workout, ending the day and
clean days; Delta's own 10 s undo (`ACT_UNDO_MS`); any Engine rule; a Dexie version bump.

## Files

- **In scope:** `src/domain/logVoids.ts` (new); `src/domain/common/types.ts` (one event, one block);
  `src/application/logVoidCommands.ts` (new); the void readers above (routing only); `src/engine/dayLedger.ts`
  (void lines and `CORRECTION_TYPES` only); `LogEntrySheet.tsx`, `BodyScreen.tsx` and `bodyScreenCopy.ts`, the
  measurement remove control, `HistoryScreen.tsx`, `historyCopy.ts`, `useUndoWindow.ts`; tests;
  `docs/agent/screenshots/GRAYSON-FIX-UNDO-001/`.
- **Off limits:** the rest of `src/engine/`; `HoldButton.tsx` itself; `ProgressPhotos.tsx`; `TrainScreen.tsx`;
  `src/persistence/db.ts`; `android/**`; `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** the six existing void events and commands; the `correct*` commands for undoing a fix; the
  supersede chain; `voidedLogIds` as the one filter; the History copy pattern; `feedback()`.
- **OWN:** `LOG_VOID_UNDONE`, `activeVoids`, the one-tap Remove and the Undo window.
- **BUILD FROM SCRATCH:** nothing; no library.

## Acceptance

- `tests/logVoids.test.ts` (pure): a void counts; a void then put back doesn't; put back twice is a no-op;
  void, put back, void again counts once; a day with no put-backs reads exactly as today.
- `tests/integration/logVoidUndo.test.ts` (UTC and America/Chicago): for each of the six kinds, remove → gone
  from every total, trend, search and the Day Ledger; Undo → back in all of them, with the correction count up
  by two; fix an amount → Undo returns the old amount; a put-back entry can be corrected again; Garmin sleep
  and external sleep read the put-back correctly; a lived day across midnight; a native backup round trip keeps
  every removal and put-back.
- `tests/browser/FixUndo.test.tsx`: Remove from TODAY's log sheet and from BODY in one tap, then Undo within
  8 s; Put it back from History later; no confirm step and no hold on a log removal; holds still on finishing a
  workout, ending the day and clean days; a new routine log shows no Undo; keyboard only; 320/360/412 px no
  overflow; axe clean.
- New tests fail on master. `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both
  zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-FIX-UNDO-001/` at 360 px (key ones also 320 and 412):
  TODAY's log sheet before and after Remove, BODY's meal row with Remove and with Undo, History with a removed
  and a put-back entry.
- **Device check (Gavin):** log a water and remove it from TODAY, then Undo; remove a meal in BODY and put it
  back from History; fix a protein amount, then Undo. Then KEEP / REFINE / RETHINK.

## Risks and checks

- **Readers:** any reader of a void type that skips `activeVoids` is a review blocker unless the PR says why.
- **Garmin sleep:** `garminSleep.ts` and `externalSleepQueries.ts` decide whether an imported night steps
  aside for a logged one; review checks that a put-back sleep log behaves like one that was never removed.
- **Doctrine:** UNDO-001 said an undone entry "can't be corrected afterwards". That holds while the void
  stands; the PR records the amendment in `docs/UX_DECISIONS.md` with Gavin's 02:02 CT choice.
- **Size:** M. If review would be slow, the Builder may ship Remove and Undo on TODAY's log sheet first and
  BODY second, and say so when asking Gavin to merge.
- **Stale facts to recheck at build time:** line numbers above, the reader count, and open PRs.
