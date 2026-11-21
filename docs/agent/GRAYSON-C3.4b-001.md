# GRAYSON-C3.4b-001 — Yearly repeats editable in Plans

- **Plan item:** [C3.4b](../GRAYSON_CAMPAIGN_PLAN.md#progress-tracker-and-how-to-use-this-plan), the
  follow-on to C3.4/C3.4a (PR #594, merged).
- **Authorization:** Gavin, 2026-11-20, after the gaps were put to him (Home jobs alerted only at 16:00;
  a yearly item can't be edited in Plans): "I'm fine with who ever would be most efficient at building
  this do the work." Bounded to letting Plans show and edit yearly repeats. No early warning (C3.2).
- **Lane:** PROTECTED by doubt. The change is in `src/engine/recurrence.ts`, so `check:risk` flags
  the Engine path and the owner merge delegation does not apply. Semantically it touches only the
  recurrence picker wrapper: no recommendation, arbitration, capacity, notification, schema, event or
  next-occurrence change. Waits for independent exact-head review, green CI and Gavin's merge.
- **Starting commit / Builder:** master `1ee25794`; Builder Claude Code; branch
  `claude/project-thread-s69muv`.

## Operator outcome

Plans' "Repeats" picker offers **Yearly** (every N year(s)). A yearly item already saved by Home
(smoke alarm batteries, vet checkup) or People (birthdays, anniversaries) opens as Yearly in its edit
form, and its repeat can be changed. Before, `parseRecurrencePreset` returned null for YEARLY, so the
picker showed "Does not repeat" and saving left the rule untouched with no way to change it.

## Scope and exclusions

- `engine/recurrence.ts`: `RecurrenceFreq` gains `YEARLY`; `buildRecurrenceRule` and
  `parseRecurrencePreset` map it. `deriveNextOccurrenceDate` and `describeRecurrence` are unchanged
  and already handled yearly rules.
- `IntentScreen.tsx`: the picker's Yearly option and "year(s)" unit.
- Excluded: lead time, notification rules, new fields, TRAIN files, any other picker change.

## Leverage gate

- **REUSE:** INTENT-002 recurrence picker and rrule.js `RRule.YEARLY`, the same yearly rule form
  `homeCommands.repeatRule` and `peopleCommands.yearlyRule` already write.
- **OWN:** the YEARLY mapping and its label.
- **BUILD FROM SCRATCH:** none.

## Acceptance

Engine test: a yearly rule (hand-built and built) round-trips and its next occurrence is correct; an
unsupported frequency (HOURLY) still returns null. Browser test: a yearly Home job opens as Yearly in
Plans, the interval changes to 2 and the summary reads "every 2 years", axe clean. Typecheck,
architecture and the Node suite locally; the browser test runs in required CI.
