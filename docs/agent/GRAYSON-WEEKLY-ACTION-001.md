# GRAYSON-WEEKLY-ACTION-001 — one action a week for his goal, suggested, his to pick

- **Authorization:** Gavin, 2026-11-25. At 8:41 PM CT: **"I was just looking at the NHS apps. I think they have a lot
  of good things we could add to the Project... Weight loss, stop smoking, getting active and the stop drinking
  app."** Then: **"Those are all fantastic ideas. I think they are all worth using."** At 8:48 PM CT he said **"Yes"**
  to four briefs, this one second. His goal, Nov 24: **"I'm trying to be healthy, lose weight but keep muscle... I'd
  like to get to 165 or 170."** His rule: **"I should be able to edit and tweak or correct everything in this app."**
  Merging this brief approves the defaults below, including the change to REVIEW-001's rule named under "A rule this
  changes".
- **Lane: PROTECTED** (`engine/weeklyReview.ts` and the `WEEKLY_REVIEW_SAVED` payload schema). No new table, event or
  Dexie version. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `f8762f93` or later. Re-fetch before starting. If MISSION-REVIEW-001 slice B is
  open, rebase on it once it merges (both read the same order of changes).
- **Builder:** Claude Code. Branch `claude/grayson-weekly-action-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#16** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after MISSION-REVIEW-001.
  The brisk option (default 5) waits for BRISK-001 slice B and stays hidden until brisk data exists.

## Objective and benefit
The weekly review already asks for a focus for next week (`WeeklyReviewPanel.tsx`): "No focus chosen", one of three
counts restating last week ("Log weight on 5 days", "Record protein on 6 days", "Train 3 times";
`engine/weeklyReview.ts` `weeklyFocusOptions`) or his own words. Next week it reports the count. None of the options
is tied to his goal: "Train 3 times" is whatever he did last week, even if his plan says 4, and "Record protein" counts
days he typed protein, not days he reached his target.

After this, the focus list offers options tied to his goal and his own targets, one marked **Suggested for your goal**
with one line on why, and the REVIEW tab shows how this week's focus is going so far. He still picks, and the default
is still "No focus chosen".

**Benchmark (read 2026-11-25):** NHS Weight Loss Plan: "Follow 12 informative weekly NHS guides", and "Each weekly
guide has actions, hints and tips for reaching your goal"
([App Store, NHS Weight Loss Plan](https://apps.apple.com/gb/app/nhs-weight-loss-plan/id1519208548), version 3.7.2).
**What we copy:** one action each week aimed at the goal. **What we add:** the action comes from his own week and
targets, says why, and he can change its number. **What we keep out:** the NHS's guide content (copy features, not
assets), a fixed 12-week course, grades, streaks, and anything chosen for him.

## A rule this changes
REVIEW-001 (Oct 2026) says Review "does not recommend anything" and the focus options "only restate logging or
consistency facts from the week". This brief adds one suggested option, still a logging or consistency count, picked
by the same order the Mission review uses for its one change (which Gavin approved by merging #709). Merging this brief
approves that change for the weekly focus only. Program changes stay write-in only, as REVIEW-001 says.

## Recommended defaults (approved when Gavin merges this brief)
1. **Options tied to his targets** (`weeklyFocusOptions`):
   - **Train:** "Train N times", where N is his `strengthSessionsTargetPerWeek` when set, otherwise last week's count as
     today.
   - **Protein target:** a new kind `PROTEIN_TARGET_DAYS`, "Reach your protein target on N days", counting lived days
     whose protein reached the same target the food diary shows (`getEffectiveProteinTargetG`). Default N: 5.
   - **Weigh-ins:** "Log weight on N days" as today. Default N: 4, since the weight trend needs 8 weigh-ins over 14
     days.
   - **Brisk minutes** (after BRISK-001): a new kind `BRISK_DAYS`, "Reach brisk 10 on N days", with his own daily goal
     in place of 10. Default N: 5. Hidden until any brisk data exists.
   - The existing "Record protein on N days" stays, so old focuses still read.
2. **His number on each:** every count option has a stepper before saving (1 to 7 days; 1 to 14 sessions). The
   saved focus keeps the number he chose.
3. **One suggestion, in the Mission order:** at most one option is marked **Suggested for your goal**, with one line
   on why, checked in this order against the week just reviewed:
   - Weigh-ins under 4: "Log weight on 4 days. Your weight trend needs 8 weigh-ins over 14 days."
   - Sessions under his target: "Train 4 times. Your plan is 4 a week; you did 2."
   - Protein target days under 5 of 7: "Reach your protein target on 5 days. You reached it on 3. It helps keep muscle
     while you lose weight." (This line names his own goal, as he wrote it in targets or missions; with no goal set it
     says only the count.)
   - Brisk 10 days under 5 (after BRISK-001): "Reach brisk 10 on 5 days. You reached it on 2."
   - Otherwise no suggestion.
   - On the monthly week, when the Mission review's one change is coverage or training, the suggestion is the same
     one, so he never sees two different asks.
4. **He picks:** the suggestion is not preselected. **USE THIS** fills the form with it; SAVE WEEKLY REVIEW saves as
   today. "No focus chosen" stays the default. The receipt keeps "Your focus is your choice, not a recommendation."
   with one change: "This one was suggested for your goal" when he saved the suggested one, so the record is honest.
5. **How it's going:** the top of REVIEW shows "This week's focus: Train 4 times. 2 so far." from the same count the
   review uses next week. A written focus shows only its words. Nothing on TODAY, no alert, no verdict ("on track",
   "behind" never appear).
6. **Next week:** the existing previous-focus line keeps reporting a count, now against his chosen number:
   "3 recorded; you chose 4."

## Everything is his to change
Which focus, its number, or none; the saved focus, by revising the week's review as today; whether the suggestion
shows (one switch on the review form, on by default).

## Design principles check (Vision, Nov 24)
- **Always says why:** the suggestion's line names the count and the target behind it. **Yours to change:** every
  option's number; picking none. **Calm:** inside the review he already opens, plus one line on REVIEW. **One tap for
  the usual:** USE THIS. **Simple first:** one suggestion at most, from a short fixed order.

## Scope
- `domain/review/types.ts` (`WeeklyFocus` gains `PROTEIN_TARGET_DAYS` and `BRISK_DAYS`, and a `suggested?: true`
  marker), `application/weeklyReviewQueries.ts` (`weeklyFocusSchema` union grows; old records parse),
  `engine/weeklyReview.ts` (`weeklyFocusOptions` takes his targets, `suggestWeeklyFocus` pure, `countWeeklyFocus` for
  the new kinds), `reviewOverview` rows gain `proteinTargetMet` per lived day (and brisk once BRISK-001 lands).
- UI: `WeeklyReviewPanel.tsx` (steppers, the suggestion and USE THIS, receipt line), the REVIEW header line.
- Tests: every saved review from before parses and counts as today; each option's target source; the suggestion order,
  one at a time, none when all are met; the monthly week matches the Mission change; nothing is preselected; the
  stepper bounds; the so-far count equals next week's count for the same days; marked "not fully logged" days (C4.5)
  don't count as protein days; native backup round-trip; 320 px and axe on the form.

## Excluded
Training-plan or calorie advice (write-in only; the calorie proposal stays the only food change). The NHS guide text.
A 12-week course. Anything on TODAY. A score, grade or streak. Changing his targets from the review.

## Acceptance
- Phone check: open this week's review. The focus list shows "Train N times" with his plan number, "Reach your
  protein target on 5 days", and one option marked Suggested for your goal with its why.
- USE THIS, change the number to 4, SAVE: the receipt says it was suggested; REVIEW's top line shows "2 so far" during
  the week.
- With all counts met last week: no suggestion shows.

## Decision record
- The suggestion is a count, never advice, so it stays inside REVIEW-001's "logging or consistency" kind.
- Same order as the Mission review, so the weekly and monthly asks never disagree.
- Not preselected, because a preselected suggestion is a choice made for him.

## Stop and ask Gavin if
- His session target isn't set and last week had no sessions (the training option then has no number).
- Protein target days can't be counted per lived day from stored data.

## Risks
- **Feeling nagged:** at most one suggestion, a switch to hide it, and nothing outside REVIEW.
- **Old records:** the parse test on saved reviews is the guard.
