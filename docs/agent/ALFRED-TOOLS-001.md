# ALFRED-TOOLS-001 — one typed tool registry, and Alfred proposes what BEYOND can already do

- **Authorization:** Gavin, 2026-11-15, after his screenshot ("Im still working till 0600. Fix my log" — Alfred said he
  couldn't) and "How do we super charge him and give him more capabilities and the ability to follow commands". He
  approved the plan by card at 04:26 CT: "Start with missions 1 and 2 (tool registry + shift correction)." This is
  mission 1. Mission 2 is [SHIFT-CORRECT-001](SHIFT-CORRECT-001.md), built on this branch.
- **Builder:** Grok Bot. Branch `codex/alfred-tools-001` from fetched `origin/master` `1c74307a`. PR: pending.
- **Lane: Protected.** Alfred gains new write proposals (consequential AI autonomy, as ALFRED-001/003/004/FIX-001).
  Independent exact-head review, green CI; Gavin merges. No schema, Engine, dependency or provider change.

## What changes

- **One registry** (`src/application/alfred/alfredTools.ts`). Each card kind has, side by side: the tool Claude sees
  (absent for free-helper-only kinds), how its input is checked into a proposal, how BEYOND fills it from the records
  before it shows (`resolve`), its card line, the guard re-checked inside the confirm transaction, the existing command
  SAVE runs, and its UNDO. A mapped type makes a kind without an entry a compile error. `alfredActions.ts` keeps the
  proposal type and the names the rest of BEYOND imports; `contextActions.ts` runs each kind's own guard; the client
  resolves every card the same way (ALFRED-FIX-001's fill-from-record, generalised).
- **New confirm-first tools for commands BEYOND already had:**
  - `log_protein` (grams), and an optional `time` (`HH:MM`) on `log_meal`, `log_water` and `log_protein`, placed in
    the current lived day by LOG-TIME-001's rule. The card says *· at 03:10*. UNDO now covers protein too.
  - `correct_log` (today's latest water, sleep or weight, through its correction chain; was free-helper only) and
    `remove_log` (today's latest sleep or weight, its existing void). BEYOND fills which log and its value.
  - `set_work_context` (today WORK/OFF, the same MANUAL declaration as TODAY's switch), `schedule_change` (overtime or
    time off on one future day) and `schedule_swap`, via SCHEDULE-EXCEPTIONS-001's own commands and refusals.
  - `handoff_note` (NOTES-HANDOFF-001), only on a day whose shift is marked ended.
  - `task_release` (no longer needed) and `task_waiting`, under the same task guard as done/move/plan.
  - `habit_done` and `collection_add` (were free-helper only), found **by name by BEYOND** (the free helper's own
    `matchOne`); no match or two matches goes back to Alfred, never a guess.
- **When he can't:** the persona now says to name in one sentence what BEYOND can't do yet, offer the nearest thing a
  tool can do, and offer to keep the request as a note. An unusable tool call is answered to Alfred as a read result
  instead of being left as a phantom "pending" card.
- Alfred's context now says he may *propose* a schedule change as a card; he still can't change it himself.

## Deferred (and why)

- `start_workout`: TRAIN picks the template and needs the RED-override confirmation; `open_training` stays.
- Shift Down start/complete: a timed two-step flow on TODAY, not a one-line card.
- Sleep with bed and wake times: the sleep fact stores a duration only (schema change).
- Timed reminders ("ping me at 14:00"): no time-of-day alert exists; belongs with the notification contract.
- Engine recommendation accept/decline: Engine authority; not Alfred's.
- Correcting a recorded shift start/end: no command existed — [SHIFT-CORRECT-001](SHIFT-CORRECT-001.md).
- Running low-risk logs without a card (Gavin approved, "low-risk logging runs immediately with undo"): recorded as
  ALFRED-ACT-001 in the Decision Register, **not built here**.

## Leverage gate

- **REUSE:** every command is BEYOND's existing one (`logProtein`, `logWater`/`logMeal` `at`, correction chains and
  voids, `setWorkContext`, `confirmScheduleException`/`confirmShiftSwap`, `noteShiftHandoff`, `releaseObligation`,
  `markObligationWaiting`, `setHabitDone`, `addCollectionItem`); the confirm transaction and guards of
  `confirmContextProposal`; ALFRED-FIX-001's resolve-before-card; the free helper's `matchOne`; the Anthropic tool-use
  schema already in use.
- **OWN:** the registry shape and each kind's BEYOND-specific checks and card lines.
- **BUILD FROM SCRATCH:** none.

## Tests and evidence

- `tests/integration/alfredTools.test.ts`: registry completeness (every tool has a parser; helper-only kinds stay off),
  existing card lines unchanged, timed protein/meal/water with UNDO, an impossible time refused, sleep correction and
  weight removal (history kept, stale card refused), WORK/OFF, overtime and swap with the command's own refusal in plain
  words, handoff only after a shift end, release/waiting under the task guard, habit and list found by name.
- `tests/browser/AlfredTools001.test.tsx`: Alfred's timed protein card at 320 px (axe clean), SAVE then UNDO; his tool
  list and the "say what BEYOND can't do" line are sent; an unusable call is answered to him, not shown.
- Existing Alfred, free-helper, corrections, habits, collections, schedule-exception and today-picture suites unchanged
  except the two context-line assertions that now say "himself; he may only propose a card", and Alfred001's pinned
  tool list, which now lists the registry's tools (new ones marked).
