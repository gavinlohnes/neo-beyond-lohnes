# GRAYSON build order — the one queue each builder works from

- **Authorization:** Gavin, 2026-11-24. 07:02 CT: "first the hard pieces that other features plug into." 07:07 CT:
  "Yes. put this order into the briefs and write the TODAY split brief."
- **Rule:** build the hard pieces other features plug into first, then the quick ones that plug into them. Keep **one
  big TODAY change open at a time**, and **one Health Bridge (Android) change open at a time**.
- **This file wins** over any older "Order" line in a brief. Each queued brief's Order line now points here. When a
  brief is built, its row moves to "Done" with the PR number. The research and planning lead keeps this file; Gavin
  changes the order whenever he likes.
- Master at the time of writing: `2d575d0b`. Codex is offline; its TRAIN rows are with Claude Code.

## Delta-track Claude Code session `ccr-380c4225` (TODAY, sleep, home; Grok Bot's queue)

Grok Bot ran out of usage on 2026-11-24 at about 8:35 PM CT. Gavin gave its unstarted briefs to the Delta-track session
(2026-11-25, his pick "1"). Its rows 1 to 5 (TODAY-SPLIT-003, TODAY-CALM-001, PLAN-FRESH-001, DICTATE-001,
WORK-RECORD-001) are built and listed under Done. If the session is already partway into C6.6 (the earned challenge
ladder), it finishes that first. Every row gets a fresh-context reviewer; a FEATURE row may self-merge with green CI
and that reviewer's PASS; Gavin merges every PROTECTED row. Still one TODAY PR open at a time across both sessions.

| # | Brief | Row | Why here | Lane |
|---|---|---|---|---|
| 1 | [GRAYSON-CARRY-001](GRAYSON-CARRY-001.md) | B6 | Quick: plugs into the close that TODAY-CALM orders. | PROTECTED |
| 2 | [GRAYSON-SHIFTDOWN-TAPS-001](GRAYSON-SHIFTDOWN-TAPS-001.md) | C2.2 | Quick: "First at home" is a TODAY-CALM quiet line. | FEATURE |
| 3 | [GRAYSON-FLIP-PLAN-001](GRAYSON-FLIP-PLAN-001.md) | C2.4 | Sleep-plan cards; its flip days reach the phone through PLAN-FRESH's hand-off. | PROTECTED |
| 4 | [GRAYSON-HOME-LASTDONE-001](GRAYSON-HOME-LASTDONE-001.md) | C3.1 | Quick: a read of records already kept. | FEATURE |
| 5 | [GRAYSON-RUN-DEBRIEF-001](GRAYSON-RUN-DEBRIEF-001.md) | C2.5 | Quick: a journal entry through existing commands. | FEATURE |
| 6 | [GRAYSON-WINDOW-REVIEW-001](GRAYSON-WINDOW-REVIEW-001.md) | C4.8c | The smart eating window. | PROTECTED |
| 7 | [GRAYSON-BRISK-001](GRAYSON-BRISK-001.md) | NHS Active 10 | Brisk minutes from Garmin steps. The only open Health Bridge change; slice B after his phone check of slice A. WEEKLY-ACTION's brisk option plugs in. | PROTECTED |
| 8 | [GRAYSON-QUIT-BREATHE-001](GRAYSON-QUIT-BREATHE-001.md) | NHS Quit Smoking | Quick: a breathing guide inside the quit tracker. No shared files with BRISK, so build it while BRISK waits on the phone check. | PROTECTED |
| 9 | [GRAYSON-HABIT-EDIT-001](GRAYSON-HABIT-EDIT-001.md) | E5 | Rename a habit, change its schedule without rewriting old days, bring one back, remove a wrong clean day. After STARTER-HABITS if that's open (same panel). | PROTECTED |
| 10 | [GRAYSON-HOME-PEOPLE-EDIT-001](GRAYSON-HOME-PEOPLE-EDIT-001.md) | E6 | Edit or remove home jobs, people's dates and facts where he sees them, with undo. After HOME-LASTDONE (same panel). | PROTECTED |
| 11 | [GRAYSON-SLEEP-WRONG-001](GRAYSON-SLEEP-WRONG-001.md) | E7 | Set aside a wrong Garmin night, or use his own times for it, everywhere that night is read. After FLIP-PLAN (both touch `shiftSleepPlan.ts`). | PROTECTED |
| 12 | [GRAYSON-COMING-UP-001](GRAYSON-COMING-UP-001.md) | C3.2 | A task, home job or date can show up days before it's due, by its own lead time; the Engine's arbitration is unchanged. C7.3's lead-time alert plugs in. A TODAY change. After HOME-PEOPLE-EDIT (same forms). | PROTECTED |
| 13 | [GRAYSON-ALERT-KINDS-001](GRAYSON-ALERT-KINDS-001.md) | C7.3 | Two new phone alerts: something coming up (on by default) and the caffeine cut-off (off by default), inside the 3-a-day cap. No Health Bridge change. After COMING-UP (it reads the lead time). | PROTECTED |
| 14 | [GRAYSON-ALERT-QUIET-001](GRAYSON-ALERT-QUIET-001.md) | E14 | Quiet hours that follow his sleep after shifts and on days off, and one buzz for alerts that land together. After ALERT-KINDS (same files). | PROTECTED |
| 15 | [GRAYSON-DAY-OFF-SHAPE-001](GRAYSON-DAY-OFF-SHAPE-001.md) | C3.3 | One Shape today? card on a day off: recovery, one house thing, the next workout, an optional person, and the open time left. Nothing written until KEEP THIS. On RUN OVER it carries the recovery contract. A TODAY change. B17 plugs in. | PROTECTED |

## Claude Code (TRAIN, then DATA)

| # | Brief | Row | Why here | Lane |
|---|---|---|---|---|
| 1 | [GRAYSON-TRAIN-EDIT-001](GRAYSON-TRAIN-EDIT-001.md) | E1 | Already open as #675. Every later set (lock screen, notes) can then be corrected. | PROTECTED |
| 2 | [GRAYSON-TRAIN-RUN-CUES-001](GRAYSON-TRAIN-RUN-CUES-001.md) | B3 | The hardest TRAIN piece: an Android foreground service. First Health Bridge change; PLAN-FRESH-001 rebases on it. | PROTECTED |
| 3 | [GRAYSON-TRAIN-STANDARDS-001](GRAYSON-TRAIN-STANDARDS-001.md) | B4 | One new event for all three standards tests. | PROTECTED |
| 4 | [GRAYSON-TRAIN-LOCKSCREEN-001](GRAYSON-TRAIN-LOCKSCREEN-001.md) | C7.5 | Two-way notification into a logged set; after TRAIN-EDIT so those sets can be fixed. | PROTECTED |
| 5 | [GRAYSON-YOUR-NUMBERS-001](GRAYSON-YOUR-NUMBERS-001.md) | E9 | One page and one store for the numbers GRAYSON judges him by. E10 and every later rule read their numbers here. Two slices. | PROTECTED |
| 6 | [GRAYSON-ONE-MEMORY-001](GRAYSON-ONE-MEMORY-001.md) (**built by the Delta-track session as #704; skip it**) | C6.7 | One memory store with where each memory came from. Corrections (E8, E10) and what Delta may read (C5.5) plug in. | PROTECTED |
| 7 | [GRAYSON-TRAIN-NOTES-001](GRAYSON-TRAIN-NOTES-001.md) | B10 | Quick: after HOWTO. | FEATURE |
| 8 | [GRAYSON-TRAIN-BODYMAP-001](GRAYSON-TRAIN-BODYMAP-001.md) | B7 | Quick: after HOWTO. | FEATURE |
| 9 | [GRAYSON-WHAT-MOVES-001](GRAYSON-WHAT-MOVES-001.md) | C6.3 | DATA, read only. | FEATURE |
| 10 | [GRAYSON-ASKS-COUNT-001](GRAYSON-ASKS-COUNT-001.md) | B15 | Open as #694. WORK-RECORD-001 (#706) merged first with Dexie v28, so #694 moves to v29 (and `CURRENT_SCHEMA_VERSION` in its migration test) and gets a fresh-context review. | PROTECTED |
| 11 | [GRAYSON-NOT-RIGHT-001](GRAYSON-NOT-RIGHT-001.md) | E8 | "That's not right" on every Why, saved into ONE-MEMORY's store. E10 reads these corrections. ONE-MEMORY merged (#704), so it can start. | PROTECTED |
| 12 | [GRAYSON-DELTA-READS-001](GRAYSON-DELTA-READS-001.md) | C5.5 | What Delta may read, per kind of record, with today's behaviour as the default; then which private kinds stay out of the Drive backup. Two slices. Doesn't need ONE-MEMORY, so build it first if NOT-RIGHT is still waiting. | PROTECTED |
| 13 | [GRAYSON-TEACH-DEFAULTS-001](GRAYSON-TEACH-DEFAULTS-001.md) | E10 | After the same fix three times, Delta offers to change the number behind it, on his tap. Needs YOUR-NUMBERS and NOT-RIGHT. | PROTECTED |
| 14 | [GRAYSON-MISSION-REVIEW-001](GRAYSON-MISSION-REVIEW-001.md) | C4.5 | Two slices: "Not fully logged" days leave the burn estimate, then one monthly Mission panel with at most one change. Slice B after ASKS-COUNT (#694). | PROTECTED |
| 15 | [GRAYSON-EXPORT-ALL-001](GRAYSON-EXPORT-ALL-001.md) | C8.3 | Read-only CSV areas for sleep, check-ins, journal, notes, home, people and work record. Shares no files with the rows above, so build it whenever the next one waits on a merge. | FEATURE |
| 16 | [GRAYSON-WEEKLY-ACTION-001](GRAYSON-WEEKLY-ACTION-001.md) | NHS Weight Loss Plan | One suggested weekly focus tied to his targets, in the Mission review's order. After MISSION-REVIEW-001; changes REVIEW-001's "no recommendation" rule for the focus only. | PROTECTED |
| 17 | [GRAYSON-STARTER-HABITS-001](GRAYSON-STARTER-HABITS-001.md) | NHS Drink Free Days | Quick: one-tap starters in Add a habit, including drink-free days. Shares no files with the rows above. | FEATURE |
| 18 | [GRAYSON-MONTH-PATTERNS-001](GRAYSON-MONTH-PATTERNS-001.md) | C5.4 | Energy, mood and stress by shift-week position, short sleep and training over 28 days; floors of 5 a side; Delta only with personal opt-in. After DELTA-READS. | PROTECTED |
| 19 | [GRAYSON-EDITED-MARK-001](GRAYSON-EDITED-MARK-001.md) | E4 | Quick: one "edited" mark on every fixed value, with what it was a tap away. Display only. | FEATURE |
| 20 | [GRAYSON-TRAIN-ORDER-001](GRAYSON-TRAIN-ORDER-001.md) | B9 | KEEP THIS ORDER at the end of a workout done in a different order. Rebases on any open TRAIN PR. | PROTECTED |
| 21 | [GRAYSON-CAFFEINE-LOG-001](GRAYSON-CAFFEINE-LOG-001.md) | C4.3 | One-tap caffeine log, log only (Gavin's "Yes", 2026-11-25). After HABIT-EDIT if open (both add a removal type). | PROTECTED |
| 22 | [GRAYSON-TELL-DELTA-FIX-001](GRAYSON-TELL-DELTA-FIX-001.md) | E11 | Fix sleep, weight, check-ins and sets from the last 7 days by telling Delta, through the existing correction commands, each on a card he confirms. | PROTECTED |
| 23 | [GRAYSON-RESTORE-DRILL-001](GRAYSON-RESTORE-DRILL-001.md) | C8.2 | A full trial restore into a scratch copy that's then deleted; his data is never written. Shares no files with the rows above. | PROTECTED |
| 24 | [GRAYSON-CHECKIN-WORDS-001](GRAYSON-CHECKIN-WORDS-001.md) | C5.1, C5.2 | Optional feeling word and what's behind it, then how Delta should help today. Never read by capacity or the Engine. Two slices. After TELL-DELTA-FIX (both touch check-in corrections and Delta). | PROTECTED |

LOCKSCREEN-001 used to be last in Claude Code's TRAIN queue, after NOTES-001. It now comes before the quick content
briefs. It still needs TRAIN-EDIT-001 first; it and NOTES-001 both touch `TrainScreen.tsx`, so whichever is second
rebases. YOUR-NUMBERS-001 shares `progression.ts`, `coachCards.ts` and `restMemory.ts` with the TRAIN rows; it
rebases on whatever merged first.

## Next to brief

Written: E9 (YOUR-NUMBERS-001), C6.7 (ONE-MEMORY-001), B16 (WORK-RECORD-001) on 2026-11-24; E8 (NOT-RIGHT-001),
C5.5 (DELTA-READS-001), E10 (TEACH-DEFAULTS-001), C4.5 (MISSION-REVIEW-001) and C8.3 (EXPORT-ALL-001) on 2026-11-25.
From Gavin's NHS apps go-ahead (2026-11-25): BRISK-001, WEEKLY-ACTION-001, STARTER-HABITS-001 and QUIT-BREATHE-001.
Then E5 (HABIT-EDIT-001), E6 (HOME-PEOPLE-EDIT-001) and C5.4 (MONTH-PATTERNS-001) on 2026-11-25, and E7
(SLEEP-WRONG-001), E4 (EDITED-MARK-001), B9 (TRAIN-ORDER-001) and C4.3 (CAFFEINE-LOG-001, log only) the same night.
Then C3.2 (COMING-UP-001), E11 (TELL-DELTA-FIX-001) and C8.2 (RESTORE-DRILL-001). Then C7.3 (ALERT-KINDS-001, without "plan to confirm", which has nothing to alert about yet) and E14
(ALERT-QUIET-001). C7.2 was already built as PLAN-FRESH-001 (#698). Then C3.3 (DAY-OFF-SHAPE-001) and C5.1 with C5.2
(CHECKIN-WORDS-001).

**Reviewers (2026-11-25):** Grok Bot is out of usage and Codex is offline, so every PR from either Claude Code
session gets a fresh-context reviewer, never the session that built it.

## Done

Built and merged on 2026-11-24: TRAIN-RUN-001 (#666), TRAIN-REST-001 (#668), CLOSE-GAPS-001 (#667), LOG-NUDGE-001
(#664), WINDOW-ALERT-001 (#672), CHECKIN-EDIT-001 (#651), FIX-UNDO-001 slice 1 (#653), WEIGHT-TREND-001 (#652), TRAIN-HOWTO-001 (#681), master fix for REST-001's select (#682), TRAIN-EDIT-001 (#675), TRAIN-RUN-CUES-001 (#683),
TODAY-SPLIT-003 slices A to D3 (through #696), TRAIN-STANDARDS-001 (#686), TRAIN-BODYMAP-001 (#691),
TODAY-CALM-001 (#697), PLAN-FRESH-001 (#698), DICTATE-001 (#699), C6.5 override as evidence (#701),
TRAIN-NOTES-001 (#689), WHAT-MOVES-001 (#693), TRAIN-LOCKSCREEN-001 (#688), WORK-RECORD-001 (#706), ONE-MEMORY-001 (#704).
