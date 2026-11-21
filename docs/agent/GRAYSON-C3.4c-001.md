# GRAYSON-C3.4c-001 — Repeat edits keep their pattern and anchor

- **Plan item:** [C3.4c](../GRAYSON_CAMPAIGN_PLAN.md#progress-tracker-and-how-to-use-this-plan), the
  follow-on to C3.4b (PR #606). Both quirks were found by #606's independent review.
- **Authorization:** Gavin, 2026-11-21, after the two older quirks were put to him: "Fix those two next".
  Bounded to those two quirks in the Plans edit form.
- **Lane:** PROTECTED by doubt. The pattern guard is in `src/engine/recurrence.ts`
  (`parseRecurrencePreset`), so `check:risk` flags the Engine path and the owner merge delegation does
  not apply. Semantically it touches only the edit picker's read-back: no recommendation, arbitration,
  capacity, notification, schema, event or next-occurrence change. Waits for independent exact-head
  review, green CI and Gavin's merge.
- **Starting point / Builder:** built on #606's head `8c0d37db` (not yet merged when work began);
  Builder Claude Code; branch `claude/project-thread-s69muv`.

## Operator outcome

1. **Cleared due date:** clearing an item's due date in the edit form and saving left the stored due
   date in place but re-anchored the repeat on today, so a yearly birthday could move to today's month
   and day. Now the repeat anchors on the due date that stays. The rule is also only rebuilt when its
   repeat or its due date actually changed, so editing a title never re-anchors it.
2. **Patterns the picker can't show:** a monthly "first Monday" (or any rule with parts the picker
   can't express: month day, set position, nth weekday, end date, count, week start) opened as plain
   "every month", and saving flattened it. Now it opens as "Does not repeat" with the line "Keeps its
   repeat: every month on the 1st Monday. Pick a new repeat to replace it.", and saving keeps the
   stored rule. This generalises #606's yearly-only guard.

## Scope and exclusions

- `engine/recurrence.ts`: `parseRecurrencePreset` returns null for any rule with parts the picker
  can't express. `buildRecurrenceRule`, `deriveNextOccurrenceDate`, `describeRecurrence` unchanged.
- `IntentScreen.tsx`: edit save anchors on the kept due date and rebuilds only on a real change; the
  "Keeps its repeat" line.
- Excluded: a picker for nth-weekday patterns, lead time (C3.2), notification rules, new fields,
  schema, TRAIN files.

## Leverage gate

- **REUSE:** INTENT-002 recurrence picker; rrule.js `origOptions` (the parts the rule was written
  with) and `toText` for the kept-repeat line.
- **OWN:** which parts the picker can express, and when the edit form rebuilds a rule.
- **BUILD FROM SCRATCH:** none.

## Acceptance

Engine tests: monthly `1MO`, `-1FR`, `BYMONTHDAY`, `BYSETPOS`, weekly `+1MO`, `UNTIL`, `COUNT` and
`WKST` rules read as null; every rule the picker builds still round-trips byte-identical. Browser
tests: a first-Monday item keeps its exact rule after a title edit, with the kept-repeat line and axe
clean; clearing the due date while changing a yearly repeat to every 2 years anchors on the kept due
date. Typecheck, architecture and the Node suite locally; browser tests in required CI.
