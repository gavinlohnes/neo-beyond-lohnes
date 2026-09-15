---
id: INTENT-002
baseline: 58e60656065c4017c8e0d586897c947cd98c6761
risk_tier: ARCHITECTURAL
---

# INTENT-002 // Recurring Obligations (rrule.js)

## Mission

Owner asked to build recurring commitments tonight (session-wide "no brakes, keep pushing"
delegation). Mid-implementation, a genuine authority conflict surfaced: `src/domain/intent/
types.ts` (Drop 01, approved 2026-08-22) explicitly locks "do not implement a custom recurrence
engine," "do not introduce RRULE/rrule.js" — while `docs/agent/CAPABILITY_MAP.md`'s SEARCH-
adjacent Reuse Register separately pre-approves rrule.js as the standard "once recurrence is
actually wanted as a feature." Per CLAUDE.md's authority-order doctrine ("do not silently
reconcile a genuine conflict... surface it"), this was put to the owner directly rather than
guessed either way. Direct owner ruling: use rrule.js. This Drop is that decision, executed.

## Approved baseline

`origin/master` at `58e60656065c4017c8e0d586897c947cd98c6761`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ARCHITECTURAL. Trigger: new runtime dependency (`rrule`), plus a direct-owner doctrine reversal
of Drop 01's explicit recurrence-engine restriction. Not HIGH-RISK via schema: `RecurrenceRule`
was already a field on the persisted `Obligation` record (dormant, `{freq, interval}` shape,
never written by any real UI or command call) — changing its internal shape to `{rrule: string}`
requires no Dexie `.stores()` version bump and touches zero real historical data, since nothing
has ever populated it.

## Authorized scope

- **Domain** (`src/domain/intent/types.ts`): `RecurrenceRule` becomes `{ rrule: string }` — a
  full two-line RFC 5545 `DTSTART:...\nRRULE:...` string, produced only by
  `engine/recurrence.ts`. Reversal recorded in the type's own doc comment, dated, with the
  prior restriction's text kept for history (not deleted).
- **Engine** (`src/engine/recurrence.ts`, new, pure, no I/O): `buildRecurrenceRule` (friendly
  freq/interval/byDay/anchor → RRULE string, via rrule.js's own `RRule` class, never
  hand-formatted), `deriveNextOccurrenceDate` (next occurrence strictly after a given date, or
  `null`), `parseRecurrencePreset` (inverse of build, for re-populating an edit form),
  `describeRecurrence` (plain-language summary via rrule.js's own `toText()`).
- **Persistence** (`src/persistence/intentValidation.ts`): `recurrenceRuleSchema` updated to
  `{ rrule: z.string().min(1) }`.
- **Application** (`src/application/intentCommands.ts`): `satisfyObligation` now materializes
  the next occurrence as a new Obligation (same title/description/missionId/recurrence,
  `dueAt` = the derived next date) when the satisfied instance carries a `recurrence` rule and
  the rule has a further occurrence. The satisfied instance itself is never reopened — Drop 01's
  "there is no reopen action" is unchanged; this is a new record, not a resurrection of the old
  one. `releaseObligation` does **not** materialize a next occurrence (see Explicit exclusions).
- **UI** (`src/ui/screens/more/IntentScreen.tsx`): a "Repeats" picker (Does not repeat / Daily /
  Weekly + weekday chips / Monthly, plus an interval) added to both the CREATE OBLIGATION form
  and the obligation EDIT form (pre-populated from the stored rule via `parseRecurrencePreset`).
  The read-only detail view shows "Repeats: <plain-language summary>" when present.

## Explicit exclusions

- `releaseObligation` does not create a next occurrence — "no longer required" is read as
  stopping the standing commitment, not just skipping one instance. Only `satisfyObligation`
  continues the schedule (the operator already authorized it by setting the recurrence rule;
  satisfying an instance carries that out, not a new creation-authority event).
- The edit form's picker cannot yet clear an existing recurrence back to "does not repeat" —
  `modifyObligation`'s own `undefined` = "leave unchanged" convention has no clear-to-unset path
  for *any* field yet (dueAt/plannedAt/description have the identical limitation already); this
  Drop does not introduce a new gap, and does not attempt to close the pre-existing one either.
- No frequencies beyond DAILY/WEEKLY/MONTHLY are exposed in the picker, and no RFC 5545 features
  beyond BYDAY (for WEEKLY) are offered — rrule.js supports far more (BYMONTHDAY, BYSETPOS,
  COUNT, UNTIL, etc.); `parseRecurrencePreset` returns `null` for anything outside this set
  rather than guessing, so a hand-authored or future-Drop-authored richer rule degrades to
  "no recurrence shown in the picker," never a wrong or corrupted display.
- No calendar/agenda view of upcoming recurring occurrences — this Drop is the create/edit/
  execute mechanism only.

## Relevant authority / references

- Direct owner ruling in chat, 2026-09-15, resolving the Drop 01 vs. CAPABILITY_MAP.md conflict
  (quoted in Mission above).
- `src/domain/intent/types.ts`'s own updated doc comment — records the reversal in place.
- `docs/agent/CAPABILITY_MAP.md`'s pre-existing rrule.js sign-off (2026-08-22 audit /
  2026-09-02 ruling) — the authorization this Drop exercises, not a new one.
- rrule.js's actual behavior was verified empirically (a throwaway script, not committed)
  before any real code was written — in particular, that an `RRule` without an explicit
  `dtstart` silently anchors to its own construction time rather than to a stable schedule
  date, which `buildRecurrenceRule`'s mandatory `anchor` parameter exists specifically to
  prevent. See `tests/engine/recurrence.test.ts`'s own "anchored to dtstart, not to whenever
  it happens to be evaluated" test, which proves this holds for the shipped code.

## Required invariants

- `deriveNextOccurrenceDate` is deterministic given the same `(rrule, afterDate)` pair,
  regardless of when it is actually called — never dependent on "now".
- `satisfyObligation` never reopens the satisfied instance; a next occurrence, if any, is
  always a distinct new Obligation record with its own id and its own history.
- A bounded recurrence rule that has run its course materializes nothing on its final
  satisfaction — never a guessed or fabricated next date.
- The old dormant `{freq, interval}` shape is rejected by `parseObligation`/`parseObligations`
  as invalid (excluded from query results, never silently coerced) — no legacy-shape
  compatibility path, since nothing real was ever stored in it.

## Acceptance criteria

- Creating an Obligation with a WEEKLY recurrence and specific weekdays, then satisfying it,
  produces a new OPEN Obligation with the same title, mission, and recurrence rule, due on the
  correct next occurrence date.
- The plain-language "Repeats: ..." summary shown in the UI matches what was actually configured.
- Editing an existing recurring Obligation's schedule re-populates the picker correctly from the
  stored rule.
- `releaseObligation` on a recurring Obligation creates nothing.
- A recurring Obligation's `recurrence` field survives a real native backup export/import cycle.
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build). Given the ARCHITECTURAL new-dependency + doctrine-reversal
trigger: `tests/engine/recurrence.test.ts` proves rrule.js's actual behavior directly (not
just that BEYOND's wrapper compiles), per `docs/agent/CAPABILITY_MAP.md`'s own caveat that
rrule.js's behavior should never be trusted unquestioned.

## Builder expectations

- Work only in `../beyond-worktrees/claude-intent-002` on branch
  `claude/intent-002-recurring-obligations`, cut from the baseline above.
- Implement exactly the authorized scope; any temptation toward a richer recurrence picker,
  a calendar view, or reopening a satisfied instance is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm the Drop 01 vs. CAPABILITY_MAP.md conflict and its resolution
  are accurately represented (re-read both source documents directly, don't trust the PR's
  summary); confirm `deriveNextOccurrenceDate` is genuinely anchor-based, not "now"-based, by
  tracing the dtstart handling directly; confirm `satisfyObligation`'s materialization never
  reopens the original instance; confirm `releaseObligation` genuinely does not materialize.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close INTENT-002 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to expand the picker beyond DAILY/WEEKLY/MONTHLY+BYDAY, add a calendar/agenda
  view, or change `releaseObligation`'s no-materialization behavior is a scope-expansion STOP.
- A genuine conflict between this contract and higher repository authority not already resolved
  by the direct owner ruling cited above.
