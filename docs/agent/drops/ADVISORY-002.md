---
id: ADVISORY-002
baseline: SET-AT-ACTIVATION
risk_tier: ROUTINE
---

# ADVISORY-002 // ADVISORY CLEANUP

## Mission

Owner brief 2026-10-05, item 1. TODAY's ADVISORY tool reads as a pile of notes. Make it three
short rows, grouped by kind, with the WHY one tap down. Example: four "— EASE BACK IN" lines become
one row, "Easing back in · 4 lifts"; tapping it lists the four lifts, each with its plain WHY.

## Approved baseline

Set at activation to fresh `origin/master`.

## Risk classification

ROUTINE: presentation only. The Advisory producers (`engine/advisory.ts`, `application/advisoryQueries.ts`)
and the Engine's own strings are unchanged; grouping and wording happen in the UI.

## Authorized scope

- **Group same-kind notes:** one row per kind (e.g. progression EASE BACK IN / INCREASE / REDUCE),
  labeled in plain words with a count ("Easing back in · 4 lifts"). A tap lists the items, each
  with its WHY in plain words (TRAIN's existing reason display map).
- **To-dos go to Commitments:** obligation notes (e.g. "Blood work — OVERDUE") leave ADVISORY.
  The COMMITMENT card lists the other due/overdue commitments by name when opened.
- **Cut the vague lines:** TODAY shows the actual commitment instead of the Engine title "An
  obligation needs attention" (e.g. "Blood work · overdue"); History's label for that kind reads
  "A commitment was due". The "Background context, not a recommendation…" explainer is removed.
- **Three rows max;** WHY lives inside the tap, not under every row. A fourth kind and beyond fold
  into the third row ("More · 3 notes").

## Explicit exclusions

No producer, threshold, Engine or recommendation change; the OBLIGATION_DUE rule still fires as
before. No new TODAY row (ADVISORY stays in TOOLS).

## Relevant authority / references

Owner brief 2026-10-05; plain-words ruling 2026-10-04; CLEANUP-003 reason display map
(`trainCopy.ts`); Command Center Rules (row caps).

## Required invariants

Every note's information stays reachable (grouped, not dropped); PROTECT (INTERRUPT) notes still
sort first with their quick actions; obligation information stays reachable in COMMITMENT.

## Acceptance criteria

1. Four EASE BACK IN notes render as one row "Easing back in · 4 lifts"; a tap lists four lifts with WHY.
2. No obligation note renders under ADVISORY; COMMITMENT lists the other due ones.
3. TODAY never shows "An obligation needs attention" or the "Background context" line.
4. ADVISORY never renders more than three rows.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with phone-size screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks each item and that no Engine output or producer changed.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if grouping needs a producer or Engine change.
