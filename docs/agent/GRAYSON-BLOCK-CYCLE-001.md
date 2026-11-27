# GRAYSON-BLOCK-CYCLE-001 — 4 to 6 week training blocks, a lighter last week, and a block review he decides by tap

- **Authorization:** Gavin, 2026-11-25. 05:21 CT: **"So the plan is to do these work outs for 4 to 6 weeks. Like do a
  block and then Delta and I will review and see what needs to be changed."** 05:24 CT: **"Brief all of it."** His
  rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this brief approves the
  defaults below, including the amendment to TRAIN Intelligence §7 named under Scope.
- **Lane: PROTECTED** (programme dosage and a doctrine amendment). No new table and no Dexie version. Independent
  exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` with WEEK-PLAN-001 merged. Re-fetch before starting. Built from `3f07787a` (WEEK-PLAN-001 merged as #742).
- **Builder:** Claude Code. Branch `claude/grayson-block-cycle-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code, TRAIN basics **#5** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), last,
  because it reads the week plan and saves its changes through ROUTINE-EDIT-001.

## Objective and benefit
`docs/GRAYSON_TRAIN_INTELLIGENCE.md` §7 already sets 4 to 6 week emphasis blocks and a review at block end, but nothing
is built: TRAIN Progress says "No emphasis block set. Emphasis blocks come later, with your confirmation."
(`TrainProgress.tsx`). Stalls are found per exercise (`engine/stall.ts`, `deloadStall`), but nothing gathers a block's
worth of evidence into a decision.

After this, he starts a **block** from TRAIN: a length (4 to 6 weeks), an optional focus (0 to 3 muscle groups, §7),
and whether the last week is lighter. TRAIN shows "Block · week 3 of 5". At the end, Delta prepares one short **block
review**, and he accepts or skips each of 2 to 3 suggested changes by tap. Then the next block starts with what he
kept.

## Recommended defaults (approved when Gavin merges this brief)
1. **Starting a block:** **START A BLOCK** on TRAIN Progress. Length 5 weeks (4 to 6), starting the coming Monday of
   his schedule, focus none, lighter last week on. One event, `TRAINING_BLOCK_SET {commandId, startDate, weeks, focus,
   lightLastWeek}`, with UNDO. He can change the length, the focus or the light week at any time, and end a block early.
2. **The lighter last week:** the same exercises and weights, with about a third fewer working sets on each exercise
   (rounded down, never below 1). TRAIN says "Light week: same weights, fewer sets", with **NORMAL THIS WEEK** to turn
   it off. It changes the day's prescription only, never the saved routine, and progression doesn't count the light
   week as a stall or a miss.
3. **The block review** (opens on the last day of the block, and from TRAIN Progress after it): one screen, five lines
   at most, each with its number:
   - **Sessions:** done vs planned (from WEEK-PLAN-001's days).
   - **Main lifts:** each routine's first exercise, estimated 1RM at the start vs the end (labelled estimated, §7).
   - **Stalls:** exercises that `deloadStall` flags.
   - **Trend weight:** start vs end of the block, from the same weekly average `weeklyQueries.ts` uses, only when he
     has logged weight in both the first and the last week.
   - **Focus:** direct sets per week for each focus muscle, against §7's starting ranges.
4. **Suggested changes, 2 to 3, from fixed rules,** each with its reason in one line and **ACCEPT** or **SKIP**:
   - A stalled exercise: swap it for a same-muscle move (WORKOUT-CHANGES-001's ranker) or drop its weight by 10%.
   - Sessions done under 75% of planned: one fewer planned day a week (the day he skipped most).
   - All main lifts rising and sessions on plan: keep the routines as they are for the next block.
   - A focus muscle under its starting range: add one set to its first exercise.
   Ranked in that order; at most three. ACCEPT saves through ROUTINE-EDIT-001 or WEEK-PLAN-001, with UNDO. SKIP
   changes nothing. **NEXT BLOCK** starts the next block with the same settings, changed in one tap.
5. **Delta:** the review is offered as one Delta card on the last day ("Your block ends today. Review it?"). Delta
   never applies a change. No answer means nothing changes, and the plan carries on unchanged.
6. **Every threshold is his:** 75%, the 10%, a third fewer sets, and the ranges sit in a Block settings sheet, with a
   reset to these defaults.
7. **Tap bar:** start a block in 2 taps (START A BLOCK, START). Decide the review in 3 to 4 (one tap per suggestion,
   then NEXT BLOCK).

## Everything is his to change
The block's length, start, focus, light week, every threshold, every suggestion (accept or skip) and ending a block
early.

## Design principles check (Vision, Nov 24)
- **Always says why:** each suggestion shows its number. **Calm:** one review every 4 to 6 weeks, a card, never a nag.
  **Fix, don't ask:** ACCEPT saves with UNDO. **Yours to change:** every number in the sheet.

## Scope
- `domain/workout` (block, light-week prescription), `engine/` (`blockReview`, pure: inputs are sessions, the plan,
  stalls, the weekly weight average; output is lines and suggestions), `application/` (set, end, review queries,
  accept through the routine and plan commands), `TrainProgress.tsx` (the block line and START A BLOCK), a
  `BlockReview` view (+ css), one Delta card through the existing coach-card path, `historyCopy.ts`.
- Docs: TRAIN Intelligence §7 "Adaptation outcomes" says "no automatic calendar deload". Amend it to: "A lighter last
  week is planned only inside a block Gavin starts, shown before it begins and turned off in one tap (Gavin,
  2026-11-25)." Update §7's Training Emphasis Rule to point at this build.
- Tests: a block's weeks follow his schedule's Monday; the light week cuts sets by a third with a floor of 1 and leaves
  the saved routine as it is; the light week isn't a stall; NORMAL THIS WEEK restores full sets; the review lines from
  fixed data; trend weight hidden without weights in both weeks; each suggestion rule fires and ranks; at most three;
  ACCEPT saves with UNDO and SKIP saves nothing; no answer changes nothing; thresholds edited and reset; native backup
  round-trip and an older backup imports; 320 px and axe on the review.

## Excluded
Changes applied without his tap. Food or calorie changes from the review (later, with the cut work). Running blocks.
Charts beyond the review's numbers (the e1RM and volume charts are a later TRAIN row).

## Acceptance
- Phone check: START A BLOCK, 5 weeks. TRAIN shows "Block · week 1 of 5". In week 5 your workouts show fewer sets at
  the same weights. On the last day, Delta offers the review: sessions, main lifts, stalls and weight on one screen, with
  two or three changes. Accept one: the routine changes, and UNDO puts it back. NEXT BLOCK starts block two.

## Decision record
- Suggestions come from fixed rules with their numbers, because he and Delta decide together and he needs to see why.
- The light week changes the day, not the routine, so the next block starts from the full routine.
- §7 is amended, not ignored: the lighter week exists only inside a block he started.

## Stop and ask Gavin if
- A suggestion would rest on a single poor session (§7's evidence floor says HOLD).

## Risks
- **Too many suggestions:** capped at three, fixed rules only, with tests.
