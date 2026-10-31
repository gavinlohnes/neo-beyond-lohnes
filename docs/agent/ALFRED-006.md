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

## Memory, Bills and People (ideas 14 and 15 in full)

BEYOND already had MEMORY-001 (MORE → MEMORY: the owner's own prep and recovery notes, kept as
events). ALFRED-004 gave Alfred a separate fact list without joining the two; this joins them:
- MORE → MEMORY now also shows **ALFRED REMEMBERS**, grouped People, Money and bills, Health, Home,
  Work, Other, where a fact can be added directly (no Alfred needed) or forgotten.
- Alfred's records now include MEMORY-001's active notes ("WHAT WORKS FOR HIM").

## ALFRED-007 — "Ask Alfred" in more places

ASK ALFRED in the Garmin sheets TODAY's numbers open (sleep, steps, resting HR, calories; the sheet
closes so Alfred's opens) and on TRAIN's workout summary ("I just finished a Push workout: 14 sets,
8,240 lb volume, 1 new PR. How does it compare…"). TODAY's own layout is unchanged.

## Tests

`tests/browser/Alfred006.test.tsx`: the week turns at Monday 16:30; one review written, shown, read,
dismissed (axe) and never asked for twice; MONTH lists it; MORE → MEMORY adds, groups and forgets
facts (axe) and Alfred reads MEMORY-001's notes. `Garmin004.test.tsx`: ASK ALFRED in a Garmin sheet
opens Alfred with the question. Schema migration tests cover v17.
