# GRAYSON-NOT-RIGHT-001 — "That's not right" on every Why, kept so Delta learns it once

- **Authorization:** Gavin, 2026-11-24. Backlog row **E8** (YOURS, LEARN, design principle 6 "always says why"):
  "'That's not right' on every Why and suggestion; Delta keeps it as a correction to learn from"
  (`/mnt/project-files/grayson/BACKLOG.md` row 8). 07:02 CT: **"first the hard pieces that other features plug
  into."** 07:56 CT: **"Lets knock out the hard ones. Do what's best."** 7:57 PM CT: **"Everyone is working. What's
  next?"** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this brief
  approves the defaults below.
- **Lane: PROTECTED** (Delta behaviour; one new memory kind and one optional payload field). No Engine input, no
  recommendation change, no new table or Dexie version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `4bc9a82b` or later, **after ONE-MEMORY-001 has merged** (it adds `via` and the
  one memory list this saves into; the Delta-track session is building it, Gavin 2026-11-25). Re-fetch before
  starting.
- **Builder:** Claude Code. Branch `claude/grayson-not-right-001`. **Reviewer:** a fresh-context reviewer (Grok Bot is
  saving its usage for building).
- **Order:** Claude Code **#11** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after ONE-MEMORY-001.
- **Next to it:** C6.5 (#701, merged) already asks "what did I miss?" when he declines a recommendation. This brief
  leaves that path exactly as it is and covers the Why panels C6.5 doesn't. **E10** (after the same correction three
  times, Delta offers to change the default) reads the corrections this saves.

## Objective and benefit
Every Delta line, coach card, learning and advisory note has **WHY THIS?** (C6.4): the rule and the facts it read.
When one is wrong, he has nowhere to say so. "You slept 4 h 10 m" when the watch missed half the night, or a deload
on a lift he just changed, stays wrong and comes back.

After this, every WHY THIS? ends with **THAT'S NOT RIGHT**. Two taps say what was wrong; a wrong fact opens the record
to fix it; anything else is kept as his correction. The next time the same rule shows, its Why says "You said this
doesn't fit you, Nov 24" so he knows Delta heard him.

**Benchmark (read 2026-11-24):** YouTube puts **Not interested** on every recommendation, then **Tell us why** with
"I've already watched the video" or "I don't like the video", and the feedback can be cleared later from My Activity
([YouTube Help, Manage your recommendations & search results](https://support.google.com/youtube/answer/6342839)).
**What we copy:** the button on every suggestion, a short "why" pick, and a way to take it back. **What we add:** a
wrong fact goes to the record so it gets fixed, not just hidden. **What we keep out:** silently hiding anything; a
correction changes no recommendation in this brief.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where it shows:** inside every `WhyTraceBody` (coach cards, Delta's line in Orientation, learning answers,
   advisory notes) and TRAIN's "Why this suggestion". Not on the recommendation card's decline, which stays C6.5's.
2. **What it asks:** **THAT'S NOT RIGHT** (44 px), then one row of chips:
   - **A fact is wrong** → the facts list becomes tappable; tapping one opens that record where the trace already
     has a records action (sleep, a set, a weigh-in, a meal) and otherwise saves which fact he flagged.
   - **Doesn't fit me** · **Already handled** · **Something else** → saved as a correction.
   - Optional words (280 characters), with TALK where DICTATE-001's voice hook is present.
   - **SAVE** writes it; nothing is saved by the chip alone.
3. **How it's kept:** a new memory kind `CORRECTION` in `domain/memory.ts`, saved through `recordMemory` on the active
   lived day, `via: "WHY"`, with an optional `about: { surface, key, rule, fact? }`:
   - `surface`: `COACH | DELTA_LINE | LEARNING | ADVISORY | TRAIN_SUGGESTION`.
   - `key`: the card's stable key (`CoachCard.key`), the learning id, the advisory source module, or the TRAIN
     suggestion kind. `WhyTrace` gains an optional `key` so every surface passes one.
   - `rule`: the rule text he saw. `fact`: the label he flagged.
   - The statement is his words, or the chip's words when he wrote none ("Doesn't fit me").
4. **What changes after:** the next trace with the same `surface` and `key` adds one line, "You said: doesn't fit me
   (Nov 24)", with **OPEN** to the correction. Nothing is hidden, re-ranked or suppressed.
5. **Where he sees them:** MORE · Memory under **Corrections**, each with what it was about and the date. Edit, stop
   and restore work like any memory. Stopping one removes the "You said" line.
6. **Delta:** corrections are personal (his words about his day), so they reach Alfred only with the personal opt-in,
   the same gate as C6.5's decline reasons (`deltaFacts.ts`).
7. **Taking it back:** no UNDO after SAVE, because a new save stays quiet (his Nov 24 undo pick: undo only after a
   fix or a removal). STOP in MORE · Memory takes it back, and stopping shows UNDO.

## Everything is his to change
Every correction's words, chip, stop and restore; whether THAT'S NOT RIGHT shows at all (one switch in MORE ·
Memory, on by default).

## Design principles check (Vision, Nov 24)
- **Always says why:** the Why now says what he told it. **Yours to change:** every correction. **Fix, don't ask:**
  a wrong fact goes straight to its record. **One tap for the usual:** chip, then SAVE. **Calm:** the link sits inside
  a closed WHY THIS?; nothing new on TODAY. **Simple first:** four chips.

## Scope
- `domain/memory.ts` (`CORRECTION`, labels), `application/memory.ts` (optional `about` in `snapshot`, kept on every
  revision), `domain/intelligence/types.ts` (`WhyTrace.key?`), `application/corrections.ts` (save, latest by
  surface and key), the trace builders (`coachCards.ts`, `orientation.ts`, `LearningAnswer.tsx`, `AdvisorySection.tsx`,
  TRAIN's suggestion) passing `key`.
- UI: `WhyTrace.tsx` (the link, chips, fact taps, "You said" line), `TrainScreen.tsx` suggestion panel,
  `MemoryPanel.tsx` (Corrections), the MORE · Memory switch.
- Settings: `beyond.notRight.v1` (`{ on }`), in `TRAVELLING_SETTINGS` as "That's not right".
- Tests: old memory events parse unchanged; a correction saves only on SAVE; every surface passes a key; the "You
  said" line matches surface and key only and disappears when stopped; fact taps open the record; corrections reach
  Alfred only with the opt-in; native backup round-trip; 320 px and axe on the open panel.

## Excluded
Changing any recommendation, rank or default (E10 asks first). The recommendation card's decline (C6.5). Corrections
from anything but a Why panel.

## Acceptance
- Phone check: open WHY THIS? on a coach card, tap THAT'S NOT RIGHT → Doesn't fit me → SAVE. Next time that card
  shows, its Why says "You said: doesn't fit me" with the date.
- On Delta's line, tap A fact is wrong, then the sleep fact: the sleep record opens.
- MORE · Memory → Corrections lists it; STOP removes the line.

## Decision record
- Saved as a memory, not a journal entry, so there is one place Delta remembers (ONE-MEMORY-001) and E10 reads one
  store.
- No suppression: a correction is shown back, never used to hide advice without his say.
- C6.5's decline path stays separate because it is already built and answers a different question ("why not do it").

## Stop and ask Gavin if
- A Why panel has no stable key to match on.
- A wrong fact's record can't be opened from where the trace sits.
- ONE-MEMORY-001 has not merged when this is ready to start.

## Risks
- **Schema:** a new kind and an optional field on a strict schema; the old-event parse test is the guard.
- **Clutter:** the link stays inside the closed disclosure, so nothing shows until he opens WHY THIS?.
