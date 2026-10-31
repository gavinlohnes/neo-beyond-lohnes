# RELATIONSHIPS-001 — remember the people who matter

- **Authority:** Gavin, 2026-10-31: "Go relationships", on the proposal: one card for a person's
  date and fact, a People list in Personal Understanding, no database change, plus the repeat-rule fix.
- **Builder:** Claude Code. **Lane:** Feature (no schema, Engine, TODAY or dependency change; one new
  Alfred card that runs existing commands). **Start:** master `9ccd93a`. Branch `ccr-90736806-z9op9b`.

## Journey

Tell Alfred "Sam's birthday is March 14, she likes gardening." One card: SAVE keeps the fact (People)
and a reminder that repeats every year. It shows up when it's due this week, so you see it a week out,
and days-off planning sees it like any task. MORE → REVIEW → PERSONAL UNDERSTANDING → **People**
lists what's coming up, with ASK ALFRED for ideas, and what you've told Alfred about people. You can
add a date there by hand too.

## Scope

- `application/peopleCommands.ts`: `addPersonDate` writes a PERSON fact and a yearly Obligation in one
  transaction; `getPeopleView` reads unresolved yearly commitments and PERSON facts. Feb 29 waits for a
  leap year. Impossible dates are refused; nothing is saved.
- Alfred `person_date` card. **Fix:** Alfred's repeat rules were stored without a start date, so rules
  like "every week" counted from the moment they were read and could drift to the day a reminder was
  ticked. They're now anchored on the due date (or today), and an unreadable rule is refused.
- People view is read-only over existing records; edits stay in MEMORY and the commitment editor.

## Exclusions

Contacts as records, grouping facts by person, relationship types, contact cadence or "you haven't
called" nudges (no guilt), notifications beyond existing due-this-week, schema changes.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** ALFRED-004 memory (PERSON topic), Intent Obligations and INTENT-002 rrule recurrence,
  BRIDGE-MOMENTS-002 due-this-week, Personal Understanding, Alfred cards. rrule.js (already a dependency).
- **OWN:** the person-date mapping (fact + yearly commitment) and the People view.
- **BUILD FROM SCRATCH:** none beyond that mapping.

## Acceptance

`tests/integration/people.test.ts` (dates, leap day, atomic save and rollback, recurrence comes round,
Alfred card, anchored repeats don't drift). `tests/browser/People.test.tsx` (by-hand add at 360px, axe,
no overflow; impossible date saves nothing). Full verify, independent review, green CI; Gavin merges.
