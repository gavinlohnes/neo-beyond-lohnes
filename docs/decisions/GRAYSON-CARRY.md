# GRAYSON-CARRY — what you didn't get to, at the close (owner go, 2026-11-24/25)

Gavin's merge of the [brief](../agent/GRAYSON-CARRY-001.md)'s PR approves these.

- **Show, don't move:** the close after SHIFT DOWN names open tasks planned on or before the closing lived day's first
  date (up to 7 days back), up to 5 rows, oldest first. Nothing rolls over by itself.
- **One tap each:** NEXT DAY (the second date of the closing lived day; due date and repeat untouched), NO DAY (clears
  the planned day; `plannedAt: null` uses the schema's "null removes" pattern), DONE (asks once, because completing
  can't be undone in BEYOND). NEXT DAY and NO DAY have UNDO until the close is finished. A task changed elsewhere is
  refused: "This task changed. Open PLANS to see it."
- **His switch:** "Show 'Didn't get to'" in the close's question chooser, on by default, travels with the backup.
- **PLANS never loses one:** Today gets "Planned earlier" for passed planned days up to 7 days back; older ones show
  under No date with their planned day. Nothing appears twice.
