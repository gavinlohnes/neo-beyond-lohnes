# ALFRED-006 — the weekly review writes itself; Memory, Bills and People

- **Authority:** Gavin, 2026-10-31: the fifteen ideas ("Make it so"), then "What do we do now?…
  we have until 0800". The weekly review idea was "Saved in your history so you can compare weeks";
  bills and people were ideas 14 and 15, built light earlier the same night.
- **Builder / lane:** Claude Code; Protected within the owner's go (one more additive table, schema
  v17 `alfredReviews`; TODAY composition). Branch `ccr-0be4f40f-16m0ja`.

## Weekly review

Once a Monday–Sunday week's last lived day is over (Monday 16:30), the first time TODAY opens with a
Claude key Alfred writes that week's review on the everyday model (about a cent). He reads the week
and the one before (`get_days` lines), headlines it, and gives one thing to try. TODAY shows "ALFRED ·
YOUR WEEK" under the brief with READ and GOT IT. Every review stays in DATA → MONTH under "Weekly
reviews", in backups.

## Tests

`tests/browser/Alfred006.test.tsx`: the week turns at Monday 16:30; one review written, shown, read,
dismissed (axe) and never asked for twice; MONTH lists it. Schema migration tests cover v17.
