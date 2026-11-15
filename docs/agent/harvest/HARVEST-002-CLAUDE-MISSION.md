# Claude mission — finish the existing week planner

Status: proposed handoff for Gavin to assign. This document is not permission to expand scope, purchase tools, modify safeguards or merge. The underlying week-planner objective already has bounded owner approval in its existing brief. Verify current ownership before editing; Gavin's assignment is the Builder handoff. If another Builder is active, coordinate rather than create competing work.

## Objective

Make the already-built week planner reviewable and ready for Gavin's merge. Do not build another planner or start another capability. Finish one useful end-to-end weekly-planning journey that connects existing shifts, workout assignments, commitments and saved calendar context while leaving decisions with the operator.

Repository: https://github.com/gavinlohnes/neo-beyond-lohnes
Existing PR: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529
Title: WEEK-PLANNER-002: make room for your week
Existing branch: `codex/week-planner-001`
Last inspected PR head: `32fb0f969d45dd790abb57ff5817baccbc8eba4c`
Research master: `5d78a5dd95bc566fcb8aada0ea7ed0b131d43143`
Observed state: OPEN, draft, conflicting with master. Those observations are a starting point, not current truth at launch.

## Why this mission

The discovery compared Drafts, Things, Todoist, Sunsama, Super Productivity and Vikunja against actual BEYOND capture/planning, with a broader inventory of training, nutrition, recovery, habits, shifts, review and Alfred. Most fundamental capture/planning capabilities already exist. The strongest immediate value is shipping the existing integrated week, not duplicating capture, Notes Sweep, Saved sorting or task lists. See [HARVEST-002](HARVEST-002.md) for sources, classification, ranking and limits.

## Establish truth first

1. Read AGENTS.md, docs/agent/DEV-FLOW-002.md, the engineering contract, operator doctrine, relevant locked UX decisions, current checkpoint, and the existing `docs/agent/WEEK-PLANNER-002.md` from the PR branch.
2. Fetch current master and the existing PR branch. Inspect working-tree ownership, open PRs, the exact live head, review evidence and CI. Preserve recoverable work.
3. Confirm which conflicts exist and whether any newer changes already resolve this objective. Do not assume old checkpoint or green historical CI means integrated readiness.
4. Continue the same branch/PR safely. Do not create a competing branch/PR or move unrelated work onto it.

## Recover and complete, without expanding

Integrate fresh master into the existing PR using repository practice. Resolve conflicts while preserving both the bounded planner and current upstream work—including raw-first capture and the speed pack. Never merge the PR into master yourself.

The approved planner behavior remains:

- Seven local dates in the existing Plan Today area, directly reachable from existing Week Ahead.
- Recorded/confirmed/predicted/unknown work context stays explicit. Preserve the existing precedence and 16:30 lived-day boundary; tasks/calendar retain calendar dates.
- Operator-assigned workouts are distinct from suggestions. Missing context or an unavailable template is not silently treated as a known day or prescription.
- Planned attention and due dates remain separate. A task move changes plannedAt only through existing canonical intent writes; preserve deadline, recurrence, status, mission eligibility and history.
- Calendar context is the existing read-only saved snapshot, with freshness. Known item counts are not hours available or a capacity verdict.
- Existing task detail still handles completion/release. Keep original task views, return navigation, keyboard access and phone/tablet use.
- Draft intended dates survive midnight without silent retargeting. Open-sheet retry keeps its selected day. Stale/closed/archived tasks, duplicate actions and invalid post-acquisition dates cannot silently overwrite plans. A successful save stays reported as saved if its follow-up read fails.

Fix real regressions or review findings needed to deliver this behavior. Reuse existing queries, commands, context resolution, programme selection, calendar cache and UI primitives. Do not reinterpret schemas, recommendation rules, recurrence or history to make a test pass.

## Explicit exclusions

No auto scheduling, duration/free-time estimates, recovery/workload scores, new recommendation authority, per-date workout overrides, calendar account/write integrations, new notes/inbox system, AI sorting, Alfred write tools, habit quota feature, micronutrient expansion, family-share work, evidence-engine expansion, broad navigation or visual redesign, schema/migration/dependency/provider changes, or feature opportunism.

The discovery's other opportunities are backlog observations, not extra scope. Do not add capture-promotion parity, native launcher actions or a second mission to this PR.

## Verification and review

Use the current engineering doctrine and the existing planner acceptance tests. At minimum substantiate:

- Queries write nothing; work provenance and assignment-versus-suggestion labels remain honest.
- Explicit add/move, unchanged deadlines/recurrence, canonical eligibility, same-tick and concurrent/stale handling.
- Midnight and DST boundaries, including date validation after transaction acquisition.
- Calendar timezone overlap and exclusive all-day ends; no invented freshness.
- Draft retention, close/reopen, interrupted read/write, in-form retry and post-commit read failure without duplicate writes.
- Native backup round-trip/provenance and existing task/shift/training/capture compatibility.
- Actual Plan Today → planner and Week Ahead → planner → return journeys, 320–1024 widths, touch targets, 16px inputs, focus, keyboard/Escape and axe.

Run relevant focused real-Chromium regressions, appropriate Node checks, architecture, typecheck and production/PWA build; preserve required full CI. Broaden checks when integration changes or failures justify it. Do not weaken safety assertions or protected fixtures; update an expectation only for a specifically authorized interaction change and retain the underlying invariant.

Obtain independent review from a qualified separate agent/session against the final exact head. Persist its SHA, evidence, findings and explicit PASS/BLOCK in GitHub. Address findings and renew review after head changes. A shared GitHub account is not evidence of reviewer independence, and Builder self-review does not replace it.

With all required CI green and independent exact-head PASS, mark the existing PR ready for Gavin's normal final review and merge decision. Do not merge, auto-merge, bypass protections or start the next improvement.

## Handoff

Maintain the existing objective brief/checkpoint and PR description so the final result is reviewable. Report:

- The concrete experience now ready and what Gavin should try on his phone.
- Current branch/PR and exact final head.
- What integration/fixes were needed, tests/CI and durable independent review evidence.
- Any remaining blocker or owner decision.

If the next action needs a genuinely new owner decision, stop only that dependent work and explain the boundary. Do not ask Gavin to reapprove routine details already within the existing brief.

REUSE: existing week-planner implementation, Week Ahead, canonical intent/context/programme/calendar primitives and current foundation.
OWN: integration/conflict resolution and fixes necessary to preserve the approved journey.
BUILD FROM SCRATCH: none.
