# TIMELINE-EDIT-001 — fix a meal or water entry where you see it

- **Authorization:** Gavin, 2026-11-15: "I also can't edit what time I ate my meals. We have that daily time line we
  made. It would be nice to make edits and corrections to it if needed." Plan approved: "Approved." (launch fix, then
  this, then ALFRED-FIX-001).
- **Builder:** Claude Code. Branch `ccr-88f5c085-timeline-edit`, from master after #535 (`9ef28e50`). Feature
  lane: no new semantics, no review required; Gavin merges.
- **What was true:** BEYOND could already move a log's time (LOG-TIME-001, `LOG_RETIMED`), correct its amount (the
  correction chains) and remove it (the VOIDED facts), but only from BODY's daily records, which is hard to find.

## What changes

- **TODAY's timeline:** in THE NIGHT SO FAR, each meal and water item has **EDIT ›**.
- **The food diary** (LOG → MEAL → TODAY'S FOOD): each row opens its entry.
- **One sheet** for the entry: what and how much, *Logged at 19:15 [CHANGE TIME]*, **EDIT AMOUNT** (calories, protein,
  carbs, fat for a meal; oz for water; grams for protein) and **REMOVE** (with a KEEP IT confirm). After a change it
  says so and that the original stays in HISTORY; TODAY's timeline and the diary follow.

## Rules

- Every fix is the existing append-only fact; nothing is overwritten and HISTORY keeps the original. An amount
  correction re-reads the entry first, so it always names the current head of its chain.
- A time stays inside its lived day (the existing rule). An amount of 0 or more for a meal; above 0 for water and
  protein (to take one out, REMOVE).
- No Engine, schema, command or event change.

## Leverage gate

- **REUSE:** `retimeLog` and `LogTimeEditor`, `correctMealLog` / `correctWater` / `correctProtein`, `voidMealLog` /
  `voidWaterLog` / `voidProteinLog`, `LogSheet`, the day map and the food diary.
- **OWN:** `application/logEntries.ts` (one entry, its three fixes) and `ui/components/LogEntrySheet.tsx`; the map
  marks and diary rows now carry their log's id.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/logEntries.test.ts` (move, two corrections in a row, remove; water and protein; every original fact kept) and
`tests/browser/TimelineEdit001.test.tsx` (Gavin's case from TODAY's timeline: 19:15 → 23:00, correct, remove, the
timeline follows; from the diary: KEEP IT removes nothing, a bad amount is refused; 320 px, 16 px text, axe).
