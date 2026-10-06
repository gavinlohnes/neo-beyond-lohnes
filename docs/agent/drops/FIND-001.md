---
id: FIND-001
baseline: SET-AT-ACTIVATION
risk_tier: ROUTINE
---

# FIND-001 // SEARCH EVERYTHING

## Mission

Owner brief 2026-10-05, item 7. One search box across lifts, PRs, notes, meals and History.
Example: "chest" returns every chest PR, note and session; tapping one jumps to it.

## Approved baseline

Set at activation to fresh `origin/master`.

## Risk classification

ROUTINE: read-only. Extends the existing Personal Search (`application/searchQueries.ts`,
MiniSearch already a dependency) with more domains.

## Authorized scope

- Search covers: missions/obligations/notes (as now), plus lifts (sessions that included them),
  PRs, meals, journal entries and History days.
- Reached from MORE (as now) and a search icon in the top bar of each primary screen.
- Tapping a result opens where it lives (TRAIN → RECORDS for a PR, History for a day or session,
  BODY meals for a meal, MORE for notes and commitments).
- Sealed time capsules stay hidden until opened.

## Explicit exclusions

No writes; no new dependency; no fifth tab.

## Relevant authority / references

Owner brief 2026-10-05; Personal Search 1.0; NOTES-CAPSULE-001 (sealed text hidden).

## Required invariants

Read only; sealed capsule text never appears.

## Acceptance criteria

1. "chest" finds chest PRs, notes and sessions (test).
2. Each result kind opens its home (test).
3. The top-bar icon opens search on every primary screen (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks coverage, jump targets and that sealed capsules stay hidden.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if indexing needs a stored index or schema change.
