# HOME-001 — keep the house running

- **Authority:** Gavin, 2026-10-31: "Go home?", in reply to the HOME-001 proposal (fact + repeating
  reminder in one card, a Home list in Personal Understanding, no database/Engine/TODAY change).
- **Builder:** Claude Code. **Lane:** Feature. **Start:** stacked on RELATIONSHIPS-001 (#355, `57f0db9`),
  whose pattern it reuses. Branch `claude/home-001`. Merge #355 first.

## Journey

Tell Alfred "furnace filter is 16x25x1, change it every 3 months, next one Nov 15." One card: SAVE keeps
the fact (Home) and a reminder "Home: Furnace filter" that repeats every 3 months. At the store, ask
Alfred "what size filter?" and he answers from your records. MORE → REVIEW → PERSONAL UNDERSTANDING →
**Home** shows what's coming round and what BEYOND knows about the house; you can add things there too.

## Scope

- `application/homeCommands.ts`: `addHomeItem` saves a HOME fact and/or an anchored repeating
  Obligation (every N weeks, months or years) in one transaction; `getHomeView` reads open "Home: "
  commitments and HOME facts. The visible "Home: " title is how the view finds jobs again, including
  each next occurrence (recurrence copies the title). Renaming a job away from "Home: " removes it from
  the view, nothing else.
- Alfred `home_item` card. A repeat needs a stated next due date; Alfred asks rather than guesses.

## Exclusions

Appliance/asset records, costs, vendors as records, maintenance scores, overdue alarms, notifications
beyond the existing due-this-week, schema changes.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** RELATIONSHIPS-001's fact + repeating-commitment pattern, ALFRED-004 memory (HOME topic),
  Intent Obligations with rrule recurrence, Personal Understanding, Alfred cards.
- **OWN:** the home-item mapping and the Home view.
- **BUILD FROM SCRATCH:** none beyond that mapping.

## Acceptance

`tests/integration/home.test.ts`: fact + job together, next occurrence on schedule, fact-only and
job-only, validation, rollback, weekday stability, Alfred card. `tests/browser/Home.test.tsx`: by-hand
add at 360px with axe and no overflow; plain fact without a job. Full verify, review, green CI; Gavin merges.

## Includes review notes from #355 (RELATIONSHIPS-001, PASS)

Yearly "Home: " jobs stay out of People; Alfred's repeat rules must produce a real date (not just
parse); a person card isn't offered for a date that doesn't exist.

## Review of #360

Fixed (blocking): an impossible date (Feb 30) was accepted from Alfred and the first repeat skipped a
month. Every date Alfred proposes (reminders, project steps, new task dates, home jobs) must now be a
real calendar date; Home's own check reads the date back. Known, not changed: a monthly job anchored
on the 29th–31st skips months without that day (RFC 5545 behavior); pick the 28th or earlier for now.
