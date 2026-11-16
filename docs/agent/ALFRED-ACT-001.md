# ALFRED-ACT-001 — low-risk logging runs immediately with UNDO

- **Authorization:** Gavin, 2026-11-15, 04:26 CT: "Yes, low-risk logging runs immediately with undo." Recorded then in
  the Decision Register as decided, not built; started 2026-11-15 evening as wave 2 of the overnight plan Gavin
  approved ("Approved. If you have anything you want to change ask me and I'll decide.").
- **Builder:** Grok Bot. Branch `codex/alfred-act-001` from fetched `origin/master` `4d74ac26`, then rebased onto
  `44a1c5b0` (#555 and #556 merged) before the first push. PR: [#560](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/560). Worked in its own worktree because other objectives ran in parallel.
- **Lane: PROTECTED** (consequential AI autonomy; amends Doctrine and BEYOND-4.0 decision 2). Independent exact-head
  review, green CI; Gavin merges. No schema, Engine, dependency, provider or notification change.

## The rule (what runs at once)

Each registry entry in `src/application/alfred/alfredTools.ts` now states `autonomy: "immediate-undo" | "confirm"`.
A card runs at once (through the same `confirmContextProposal` transaction and guards SAVE uses) only when **all** hold:

1. its kind is `immediate-undo`: **`log_water`, `log_meal`, `log_protein`, `log_weight`, `habit_done`, `log_set`**;
2. the whole message was understood (the free helper left no clause unknown);
3. the same card isn't repeated word for word in that message (a double log is more likely a slip);
4. the kind's own `clear` rule says it is clear:
   - water 1–64 oz, protein 1–100 g, with **no time given** (a named time is placed by BEYOND in the lived day; he
     checks it on the card);
   - a meal: only one of his **saved meals** (0.25–3 servings). **Alfred's own macro estimate keeps its card**, so he
     sees the guess before it counts; a new food with numbers he typed also keeps its card, so SAVE + REMEMBER MEAL
     stays on offer (FREE-HELPER-002);
   - weight within **10 lb of his last weigh-in** (a first weigh-in, or a bigger jump that may be a typo, keeps its card);
   - a habit BEYOND found by name, active, and **not already done today**;
   - a set into the workout **still in progress**.

Everything else keeps the one-tap confirm card: sleep, shift/work marks and corrections, today WORK/OFF, schedule
changes and swaps, tasks, reminders, notes, memory, collections, handoff notes, routines and ticks, projects, check-in,
urges and clean days, `correct_log`, `remove_log` and `fix_entry`. Engine decisions are never Alfred's. Alfred (Claude)
and the free helper follow the same rule (the `source` is passed so a future rule can differ; today it only changes the
reason text for a meal that keeps its card). If the records changed since
they were read (`CONTEXT_CHANGED`) or the command refuses, that card and the rest simply stay cards.

## UNDO

- `ACT_UNDO_MS` = 10 s (`src/application/alfred/alfredAct.ts`). UNDO runs the record's existing append-only reversal
  (CARD-UNDO-001): `WATER/PROTEIN/BODYWEIGHT_LOG_VOIDED`, `MEAL_LOG_VOIDED`; a habit tick appends `HABIT_SET` with the
  answer it had before (so NOT_DONE stays NOT_DONE), only while the tick is still the effective answer; a set uses TRAIN's
  own `SET_UNDONE`, only while that set is still the last one. No new event types; nothing is deleted. Backups carry the
  events, so an undone log stays undone after export and restore.
- After the window the entry stays and the card reads "Logged. To change it, use LOG or HISTORY." (the normal correct and
  remove paths). `undoAct` refuses an expired window, not only the UI.
- The confirmation is a real button (`Undo: <card line>`), never focused for him; the countdown is visual only
  (`aria-hidden`) so a screen reader hears "Logged." once; the window **holds while UNDO is hovered or focused** and
  resumes with the time that was left (WCAG 2.2.1). BEYOND had no pausing toast, so this is the first.
- Alfred is told on his next turn that it was saved at once and kept, or that he tapped UNDO. His persona says BEYOND
  saves some clear low-risk logs itself, so he never claims a card is already saved.

## Deferred (and why)

- **Drive mode** (`DriveHome.tsx`) keeps its spoken "save or skip" readback: a 10-second on-screen UNDO isn't usable
  while driving.
- **Sleep** stays a card: not in Gavin's low-risk list, and it feeds the Engine's sleep rules.
- **Timed logs** stay cards; a later objective could make a clearly-placed time immediate.
- **Routine ticks** stay cards (not in the approved list).
- The UNDO window closes when the sheet closes; the entry stays, editable from LOG or HISTORY.

## Leverage gate

- **REUSE:** the registry (ALFRED-TOOLS-001), `confirmContextProposal`'s transaction and guards, CARD-UNDO-001's voids,
  `setHabitAnswer`/`HABIT_SET`, TRAIN's `undoLastSet`/`SET_UNDONE`, the existing confirm-card UI; the undo-snackbar
  pattern of Gmail and Material ("action done · UNDO") with WCAG 2.2.1's pause rule.
- **OWN:** the per-kind clarity rules, the 10 s window with hold, and the Alfred/helper wiring.
- **BUILD FROM SCRATCH:** none (the small hold-on-focus window is new only because BEYOND's receipts don't pause).

## Tests and evidence

- `tests/integration/alfredAct.test.ts` (TZ=UTC and TZ=America/Chicago): registry flags (exactly the six immediate
  kinds; every kind states one); confirm kinds never run at once; water, protein, saved meals (Alfred and helper), weight, habit
  (prior answer restored) and set each run at once and UNDO leaves day totals and projections as before; an expired
  window refuses UNDO and keeps the entry; the hold/resume arithmetic; each fallback reason (time, amount, estimate,
  unknown saved meal, remember, first/far weigh-in, habit already done, no match, no workout); a partly understood free
  message and a repeated card; stale context runs nothing; backup export/restore keeps the undo.
- `tests/browser/AlfredAct001.test.tsx` at 320 px, axe clean: Alfred's water log saves at once, UNDO isn't focused for
  him, UNDO reverses it and Alfred is told; after 10 s UNDO is gone and the entry stays; keyboard focus holds the window
  and Enter undoes it (free helper, keyless); sleep, a timed water and an estimated meal still wait for SAVE.
- **Existing tests changed only where they used a clear water log as the vehicle for confirm-card mechanics**, which
  is now the intended immediate behavior: Alfred001, OperatorContext, PersonalContext (stale proposal, lived-day bound
  card) and PersonalFacts now use a sleep card (still confirm-first) for the same guard; FreeHelper's CARD-UNDO-001 check
  uses sleep; its stale saved-meal check uses 4 servings (outside the immediate range); CommandBar, FreeHelper's first
  test and PersonalContext's sibling-card test now assert the water saves at once. No assertion was weakened.

## Review response and master merge (2026-11-16)

- Independent review of `365d2a45` was PASS with three non-blocking notes. `origin/master` `17f6bc8e` (#557, #558
  FOLLOWUPS-001, #562 REMIND-AT-001) was then merged in normally, so that review is stale and a renewed exact-head review
  is required.
- Merge conflicts: `CURRENT_CHECKPOINT.md` (all sections kept) and the `add_reminder` registry entry, resolved as
  `autonomy: "confirm"` plus master's REMIND-AT description (a HH:MM `when_note` with a due date sets the alert time).
  A reminder, timed or not, stays a confirm card; the six immediate kinds are unchanged.
- Note 1 fixed: the `alfredAct.ts` header now says only one of his SAVED meals may run at once; a typed new food or
  Alfred's estimate keeps SAVE + REMEMBER MEAL. Comment only.
- Note 3 fixed: in `AlfredSheet`'s `act()`, only `immediateCards` / `runImmediate` failures fall back to cards. Once
  entries are written, a throwing haptic or `onSaved` refresh no longer turns them back into SAVE cards (which could
  write a second time). New browser test (fails on the old code, passes now): a throwing `onSaved` still shows
  "Logged." with UNDO, no SAVE, and exactly one 20 oz entry.
- Note 2 left as designed: set UNDO is last-set only (TRAIN's `SET_UNDONE` with the expected set id); an UNDO on an
  earlier set says to use LOG or HISTORY.
