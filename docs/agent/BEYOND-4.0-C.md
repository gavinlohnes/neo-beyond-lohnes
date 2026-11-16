# BEYOND 4.0-c — work-run planning

**Owner authority:** Gavin selected work-run planning followed by the TODAY briefing preview, explicitly parking recovery coaching and end-of-run debrief for now ("Yes. 3 and 4."). This reorders the master brief's remaining work; it does not authorize a merge. Builder Codex, [active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/549), branch `codex/4c-work-run-plan`, from fetched master `2bbceb73` (coach card merged). No overlapping implementation PR found. Earlier read-only recovery comparison PR #548 remains ready and untouched, not a dependency. Protected conservative composition review; full required CI and independent exact-head review; Gavin alone merges.

## This delivery

Inside existing Plan Today → Week planner: DRAFT WORK RUN composes the first known work block and following days off within the existing seven-date horizon. An ongoing run may be partial; an unknown gap stops the draft, never becomes a day off or gets jumped. Nothing claims free capacity. Preserve recorded / confirmed / forecast provenance; assignments stay distinct from suggestions, planned task attention stays separate from deadlines, calendar remains cached/read-only with freshness.

Reuse existing seven-day saved-meal generation only when its work context is known, mapping shared Week planner context rather than the meal query's standing schedule. Meal names/servings are drafts, not consumed food or invented ingredients. Include the existing matching next-shift sleep preview with its basis/citations, not a new multi-day medical timetable; omit that standing-schedule preview when confirmed changes need reconciliation. Saved routines become unticked preparation text, not completion records.

The operator edits one plain-text draft, reviews it and explicitly CONFIRM SAVE PLAN NOTE. Save exactly that text through existing `captureItem`, like the existing meal grocery-note flow. It is an immutable snapshot in Capture, not a new live plan entity or a batch of silently scheduled tasks. Task dates, workouts, food logs, routine/preparation state and notifications remain unchanged. Refresh after changed information produces another draft only on request, warns before replacing edits and never rewrites a saved note. Keep unsaved edits across task lists; register them with the existing update/draft guard. Read/write failures preserve input; save is guarded against immediate duplicate submissions; saved confirmation never depends on a subsequent read. Existing Capture/search/backup paths own retrieval and portability.

## Boundaries

This is the complete bounded draft → edit → confirm → saved-note journey. It is not autonomous replanning, a new planner store, automatic task/calendar/workout scheduling, new sleep rules, a readiness/learning rule, notifications or Alfred tools. No schema, migration, dependency, provider or Engine change. TODAY preview is the next separate objective after this delivery is reviewed and Gavin integrates it; do not implement it in this PR. Recovery coaching and end-of-run debrief remain parked.

## Reuse disposition

- REUSE: Week planner/work context/programme/calendar composition; meal generator and saved meals/targets; existing next-shift sleep preview; saved routines; capture save and existing retrieval/native backup; existing Plan Today shell and session draft guard.
- OWN: bounded work/off block selection, explicit-source text composition and the review/save-note journey.
- BUILD FROM SCRATCH: none beyond this BEYOND mapping. No external library or new algorithm needed.

## Verification

Read-only composition, unknown/hypothetical gaps, block boundaries and horizon honesty; due/planned independence; shared meal context; confirmed-change sleep abstention; no read-side writes; no side effects until confirmation and only one raw note afterward; edits retained across lists, failed saves and cancelled regeneration; same-tick duplicate guard; phone width/axe and existing Week planner/navigation regressions. Architecture, TypeScript and production/PWA build; full required CI and independent exact-head review. Final results live on the PR to avoid invalidating review with a documentation-only head change.

Independent review recovery: recorded context can hide an originating confirmed exception. Sleep inclusion now requires explicit reconciliation of shift start/end and first/last-night assumptions against the shared recorded/confirmed/forecast context for the previous, shift and next lived dates. Missing validation defaults to omission; manual and exception-origin records are both checked. No sleep rule is changed. Renew exact-head review/CI after this fix.

Follow-up (2026-11-15): [WORK-RUN-REDRAFT-001](WORK-RUN-REDRAFT-001.md) offers a fresh draft in the same place when a covered date's work context changes or the existing two-short-sleeps guidance appears after the saved note; saving still needs the same confirm.
