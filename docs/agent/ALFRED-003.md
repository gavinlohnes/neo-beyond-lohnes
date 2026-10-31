# ALFRED-003 — cheap everyday Alfred, his brief on TODAY, and Alfred can do it

- **Authority:** Gavin, 2026-10-31: "go cheap + 1 and 2", answering three proposals: run Alfred on
  the cheaper model with a "Think harder" option; (#1) Alfred's brief at the top of TODAY; (#2) Alfred
  can do what the buttons do, as confirm cards.
- **Builder / lane:** Claude Code; Protected within the owner's go (TODAY composition; new Alfred
  actions over existing commands). Branch `ccr-0be4f40f-16m0ja`; follows ALFRED-002 (#348, merged).

## What it does

- **Go cheap.** Everyday Alfred runs on Claude Haiku 5.5 ($0.10 / $0.50 per MTok, about a fortieth of
  Opus). **THINK HARDER** sends that one question to Claude Opus 5.5 at effort high, with the
  server-side refusal fallback. Both read the same conversation; the API drops thinking blocks the
  receiving model can't read, so switching mid-conversation is safe. The cost line uses each model's price.
- **#1: the brief on TODAY.** The first thing under the hero: two to four sentences from the records
  on what matters now and next, with the time it was written. Tap it to talk to Alfred. It is written by
  the everyday model at effort low and kept on this phone. It is rewritten when the records change (at
  most every 10 minutes; the clock alone doesn't count) or after 3 hours, and not while offline. Without
  a key there is no brief. A brief costs about a twentieth of a cent.
- **#2: Alfred can do it.** New cards, each running BEYOND's own command on SAVE: check-in (all five
  scales; the Engine then makes its own recommendation), started work, work ended, task done, task to a
  new date, clean day, and OPEN TRAIN for today's workout. The records now carry task ids, today's work
  marks and today's check-in. When a card can't apply (an off day, no quit tracker, a closed task) it
  says why and nothing changes.

## Leverage

- **REUSE:** the Anthropic SDK and tool use; `submitCheckIn`, `markWorkStarted`, `markWorkEnded`,
  `satisfyObligation`, `modifyObligation`, `logCleanDay` and TRAIN's existing workout entry; the
  existing cards.
- **OWN:** the brief prompt, its refresh rule and placement; the tool definitions.
- **BUILD FROM SCRATCH:** none.

## Not changed

The Engine's recommendation card stays as it is: Alfred's brief sits above it and doesn't replace
Engine guidance. Starting a workout opens TRAIN; BEYOND picks the session there.

## Tests

`tests/browser/Alfred003.test.tsx`: everyday vs THINK HARDER requests (model, fallback), with axe;
check-in, task done and new date written through real commands; an off-day "work ended" explained
with nothing written; OPEN goes to TRAIN; the brief on TODAY (shown, stored, opens Alfred, axe),
absent without a key, kept while the records hold; the refresh rule. `Alfred001.test.tsx` updated for
the everyday model and the new tools.
