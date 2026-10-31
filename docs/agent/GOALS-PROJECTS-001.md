# GOALS-PROJECTS-001 — design proposal, not implementation authority

## Authority and status

Gavin approved expansion design and reuse assessment on 2026-10-31. Codex owns this
design only; production implementation and Protected contract changes await approval.
Baseline: origin/master `20743ae`. Branch: `codex/goals-projects-design`.
No changes to Engine, schema, commands, product UI, existing ownership or doctrine.
PR pending; GitHub API currently denies access, so overlapping open work is unverified.

## Repository findings

- `domain/intent/types.ts`: Mission is durable direction, ACTIVE/ARCHIVED, deliberately
  no deadline or completion. Obligation is actionable, optionally mission-linked, with
  OPEN/WAITING/SATISFIED/RELEASED states. Due/planned dates differ from occurrence instants.
- `application/intentCommands.ts`: atomic canonical updates plus historical events;
  reuse command boundaries, not a parallel task store. This is not pure event replay.
- `application/intentQueries.ts`: archived Missions preserve links but remove their
  unresolved Obligations from current-attention eligibility. Management still finds them.
  Project parking must not silently copy that attention behavior.
- `IntentScreen.tsx`: existing management, recurrence, history and draft patterns.
- Personal Understanding already composes Missions, explicit targets and lessons.
- Alfred already proposes confirmed Obligation writes. Goals/Projects are not yet tools.
- Existing TRY/REMEMBER are complete; do not rebuild them or take over LOOP.

## Recommended model

Keep Mission as ongoing direction. Add Goal (desired outcome) and Project (finite effort)
only after approval. Calling a finite Project a Mission would change locked semantics.

- Goal: id, title, optional description/success statement, optional missionId,
  ACTIVE/PAUSED/ACHIEVED/CLOSED, created/updated timestamps and event provenance.
  ACHIEVED is the operator's assessment; CLOSED means stopped without asserting success.
- Project: id, title, optional finish statement, optional goalId and optional missionId,
  ACTIVE/PAUSED/COMPLETED/CLOSED, timestamps and event provenance.
- A Project's mission context is its explicit missionId. A linked Goal's Mission is
  separately displayed, never silently copied or changed. UI warns about differing context.
- An Obligation gains at most one optional projectId. Existing missionId retains its exact
  meaning and eligibility semantics. No forced propagation between the two links.
- Standalone Goals, Projects and Obligations remain valid. No nested projects in slice one.
- History records link changes and status changes atomically. Live grouping uses current
  links; historical activity names context as recorded at the action, when available.
  No reconstructed historical context may be presented as recorded fact.
- Project detail can create or attach an existing Obligation by ID. No cloned task rows.
- One current link per relationship keeps scope bounded. Many-to-many links are deferred.

Before implementation, pin exact event payloads, validators, additive migration and backup
round-trip in a bounded Protected brief. Proposed fields here are not approved contracts.

## Lifecycle and safety

Pause, close or complete affects only the selected Goal/Project. Its commitments retain
their state, dates and existing eligibility. Show the unresolved count before confirming;
offer their existing management screen. Never silently reschedule or resolve them.
Resume/reopen is explicit. Existing Mission archive behavior remains unchanged and explained.
Reject new links to inactive destinations; preserve existing links for inspection.
Corrections and reopening retain history; no hard deletion in the first slice.
Status changes and retries need atomic/idempotent guards and stale-edit rejection.
Missing/invalid links show unavailable context, not fabricated names or auto-repair.

Optional target dates for Goals/Projects are deferred. Obligations keep existing calendar
due/planned dates, with actual actions timestamped. No new scheduling or recurrence rules.

## UI and example

COMMAND gets one management destination, GOALS & PROJECTS, reusing existing navigation.
Missions and Obligations keep their canonical editors. Existing Personal Understanding
links into the same records instead of introducing another dashboard.

Phone outline:

    GOALS & PROJECTS                  BACK TO COMMAND
    ACTIVE | PARKED | CLOSED
    Be ready to apply for a new role
      Application ready · Active
      1 of 3 commitments satisfied
    ADD GOAL                     ADD PROJECT

    APPLICATION READY                BACK TO GOALS & PROJECTS
    Finish: résumé ready and application submitted
    Goal: Be ready to apply for a new role
    NEXT COMMITMENT (operator-selected, optional)
      Update résumé                  OPEN RECORD
    COMMITMENTS · 1 satisfied / 3 linked
      SHOW MORE
    HISTORY | EDIT | PAUSE | COMPLETE

No automatic ranking: NEXT is explicitly chosen by the operator and can be cleared.
The next link cannot point outside the Project or to an already resolved commitment;
resolved selection becomes “Choose another when ready,” never auto-selects a successor.
No new TODAY row or global navigation tab. Sheets CLOSE, screens BACK TO destination.
Lists bounded; human dates; calm empty/error states; retain drafts on interruption.

Example: create Goal, create Project, attach an existing résumé Obligation, complete it
in the original editor, inspect its history, explicitly complete Project, then assess Goal.
All steps work offline without Alfred and without creating every hierarchy level.

## Progress and Alfred

Show linked commitment states with counts, including WAITING and RELEASED separately.
“1 of 3 satisfied” is task accounting, not “33% of your goal achieved.” No universal score.
Goal progress initially consists of linked Project states plus dated operator assessments;
health charts stay in their canonical views. Evidence attachments/automatic metrics deferred.

Alfred integration follows a dependable manual journey: read exact records, propose a
Goal/Project/link or status change as an explicit card, then call canonical commands after
confirmation. Preview all fields and affected IDs. Stale/deleted records require a fresh
proposal; failed/duplicate saves never claim success. No automatic scheduling or Engine input.
Context and read-tool additions must disclose what is sent to Anthropic and respect off mode.

## Reuse disposition and outside assessment

- REUSE: Intent commands/history/atomic guards, existing Obligation management, recurrence,
  Personal Understanding routes, Alfred cards, draft/accessibility patterns, backup path.
- OWN: Goal/Project meanings, relationship history and operator-assessed outcomes.
- BUILD FROM SCRATCH: the missing Goal/Project contracts and projection; existing Missions
  intentionally cannot represent finite completion without changing their meaning.
- STANDARDIZE: existing recurrence remains RFC 5545/rrule; no new date arithmetic.
- External candidate: [Super Productivity](https://github.com/super-productivity/super-productivity).
  README and root MIT LICENSE inspected 2026-10-31 via raw.githubusercontent.com. It documents
  offline-first project/task organization and planning. Study project detail/task reuse;
  do not import its app/store or scheduler into BEYOND. No source adaptation selected yet:
  inspect exact files, pinned revision, tests and separate notices before copying; preserve
  MIT attribution for adapted code. README/license review alone proves no code suitability.
- REJECT for this slice: Todoist API SDK integration. Its root MIT LICENSE was verified,
  but an external account/task backend duplicates our offline commands and is out of scope.
- Vikunja license lookup on the attempted main/LICENSE URL returned 404. No license conclusion
  or copying authorization follows; defer until the canonical repository/license is verified.

## Proposed implementation and acceptance

First approved objective: manual Goal/Project lifecycle, explicit links to existing
Obligations, management and honest progress/history, including backup/restore. Alfred tools
are a subsequent bounded objective sharing these commands; no new library is proposed.

Tests must cover:
1. Create/edit/link/unlink/reopen with exact source/history and no duplicate Obligations.
2. Pause/complete/close never changes commitments, Engine output or TODAY composition.
3. Archived Mission eligibility remains identical, including mixed historical links.
4. Atomic rollback, retry/no-op, stale edits and missing destination handling.
5. Resolved selected next commitment clears actionable presentation without choosing another.
6. Old backups still restore; new records/links/history round-trip; invalid input rejected.
7. Offline create-to-review, interrupted draft, bounded lists, keyboard/focus, 360px axe and
   reduced-motion; distinguish empty data from failed reads.

Full verify, current-head CI and independent exact-head review for Protected implementation;
Gavin approves merge. Design-only changes need proportionate documentation checks.

Deferred: areas/module builder, habits/relationships, finance, collaboration, sync, nested
projects, dependency graphs, automatic scheduling, goal scoring and new Engine inputs.

Next: Gavin reviews the model and first manual scope. No production implementation yet.
