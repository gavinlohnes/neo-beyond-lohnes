# GRAYSON build order — the one queue each builder works from

- **Authorization:** Gavin, 2026-11-24. 07:02 CT: "first the hard pieces that other features plug into." 07:07 CT:
  "Yes. put this order into the briefs and write the TODAY split brief."
- **Rule:** build the hard pieces other features plug into first, then the quick ones that plug into them. Keep **one
  big TODAY change open at a time**, and **one Health Bridge (Android) change open at a time**.
- **This file wins** over any older "Order" line in a brief. Each queued brief's Order line now points here. When a
  brief is built, its row moves to "Done" with the PR number. The research and planning lead keeps this file; Gavin
  changes the order whenever he likes.
- Master at the time of writing: `2d575d0b`. Codex is offline; its TRAIN rows are with Claude Code.

## Grok Bot (TODAY, alerts, voice, home)

| # | Brief | Row | Why here | Lane |
|---|---|---|---|---|
| 1 | [GRAYSON-TODAY-SPLIT-003](GRAYSON-TODAY-SPLIT-003.md) | C9.1 | Every TODAY feature below edits `TodayScreen.tsx` (3,604 lines). After this they edit a section instead and stop colliding. | No visible change; Gavin merges |
| 2 | [GRAYSON-TODAY-CALM-001](GRAYSON-TODAY-CALM-001.md) | C9.6 | The quiet-line budget and one after-shift card at a time. Every new TODAY line plugs in here instead of adding a block. | PROTECTED |
| 3 | [GRAYSON-PLAN-FRESH-001](GRAYSON-PLAN-FRESH-001.md) | C7.2 | Phone alerts that stay current without a Garmin sync. New alert kinds (C7.3) and quiet times (E14) build on its plan hand-off. Health Bridge change: rebase on RUN-CUES-001 if that merges first. | PROTECTED |
| 4 | [GRAYSON-DICTATE-001](GRAYSON-DICTATE-001.md) | C7.1 | One shared voice hook and one confirm path. "Fix anything by talking" (E11) reuses both. | FEATURE |
| 5 | [GRAYSON-CARRY-001](GRAYSON-CARRY-001.md) | B6 | Quick: plugs into the close that TODAY-CALM orders. | PROTECTED |
| 6 | [GRAYSON-SHIFTDOWN-TAPS-001](GRAYSON-SHIFTDOWN-TAPS-001.md) | C2.2 | Quick: "First at home" is a TODAY-CALM quiet line. | FEATURE |
| 7 | [GRAYSON-FLIP-PLAN-001](GRAYSON-FLIP-PLAN-001.md) | C2.4 | Sleep-plan cards; its flip days reach the phone through PLAN-FRESH's hand-off. | PROTECTED |
| 8 | [GRAYSON-HOME-LASTDONE-001](GRAYSON-HOME-LASTDONE-001.md) | C3.1 | Quick: a read of records already kept. | FEATURE |
| 9 | [GRAYSON-RUN-DEBRIEF-001](GRAYSON-RUN-DEBRIEF-001.md) | C2.5 | Quick: a journal entry through existing commands. | FEATURE |
| 10 | [GRAYSON-WINDOW-REVIEW-001](GRAYSON-WINDOW-REVIEW-001.md) | C4.8c | The smart eating window. | PROTECTED |

## Claude Code (TRAIN, then DATA)

| # | Brief | Row | Why here | Lane |
|---|---|---|---|---|
| 1 | [GRAYSON-TRAIN-EDIT-001](GRAYSON-TRAIN-EDIT-001.md) | E1 | Already open as #675. Every later set (lock screen, notes) can then be corrected. | PROTECTED |
| 2 | [GRAYSON-TRAIN-RUN-CUES-001](GRAYSON-TRAIN-RUN-CUES-001.md) | B3 | The hardest TRAIN piece: an Android foreground service. First Health Bridge change; PLAN-FRESH-001 rebases on it. | PROTECTED |
| 3 | [GRAYSON-TRAIN-STANDARDS-001](GRAYSON-TRAIN-STANDARDS-001.md) | B4 | One new event for all three standards tests. | PROTECTED |
| 4 | [GRAYSON-TRAIN-LOCKSCREEN-001](GRAYSON-TRAIN-LOCKSCREEN-001.md) | C7.5 | Two-way notification into a logged set; after TRAIN-EDIT so those sets can be fixed. | PROTECTED |
| 5 | [GRAYSON-TRAIN-HOWTO-001](GRAYSON-TRAIN-HOWTO-001.md) | B5 | Quick: content. Adds the library map NOTES and BODYMAP use. Built early under the old order; open as #681. | FEATURE |
| 6 | [GRAYSON-TRAIN-NOTES-001](GRAYSON-TRAIN-NOTES-001.md) | B10 | Quick: after HOWTO. | FEATURE |
| 7 | [GRAYSON-TRAIN-BODYMAP-001](GRAYSON-TRAIN-BODYMAP-001.md) | B7 | Quick: after HOWTO. | FEATURE |
| 8 | [GRAYSON-WHAT-MOVES-001](GRAYSON-WHAT-MOVES-001.md) | C6.3 | DATA, read only. | FEATURE |
| 9 | [GRAYSON-ASKS-COUNT-001](GRAYSON-ASKS-COUNT-001.md) | B15 | After WHAT-MOVES. | PROTECTED |

LOCKSCREEN-001 used to be last in Claude Code's TRAIN queue, after NOTES-001. It now comes before the quick content
briefs. It still needs TRAIN-EDIT-001 first; it and NOTES-001 both touch `TrainScreen.tsx`, so whichever is second
rebases.

## Next to brief (hard pieces, not yet written)

1. **E9, your numbers:** one page and one store for every threshold GRAYSON uses about you (short sleep, short nights
   in a row, the 16:30 day turn, the flip rules), each with its default, your value and a reset. Later rules read
   their numbers from here, so "edit everything" is built in rather than added each time.
2. **C6.7, one memory store:** one place Delta remembers, with sources. Corrections (E8), corrections that teach
   defaults (E10) and the sensitive-data controls (C5.5) plug into it.
3. **B16, work record:** training hours, certifications, standards, court and training dates, beside swaps and OT.

## Done

Built and merged on 2026-11-24: TRAIN-RUN-001 (#666), TRAIN-REST-001 (#668), CLOSE-GAPS-001 (#667), LOG-NUDGE-001
(#664), WINDOW-ALERT-001 (#672), CHECKIN-EDIT-001 (#651), FIX-UNDO-001 slice 1 (#653), WEIGHT-TREND-001 (#652).
