# Current Checkpoint

Compact, replaceable operational handoff snapshot. This document is superseded wholesale at the
next checkpoint Drop—do not accrete edits onto it indefinitely. It reports repository state; it
does not authorize product work or replace `CLAUDE.md`, `docs/UX_DECISIONS.md`, `AGENTS.md`, or
the current Drop Contract.

**Supersedes** the checkpoint written at PR #55 (`origin/master` `e78a73a`), before the PR number
advanced to #94. That snapshot now misstates shipped capabilities, dependencies, schema, tests,
and next work.

## REMOTE VERIFIED

- Repository: `gavinlohnes/neo-beyond-lohnes`; default branch: `master`.
- Verified baseline: `origin/master` at
  `e066a24214a41eb49a84e18af52247527fbc171c` on 2026-09-15, fetched directly before this Drop.
- That commit is the JOURNAL-002 closure commit. Before CHECKPOINT-003 activation,
  `docs/agent/ACTIVE_DROP.md` directly read `id: JOURNAL-002`, `status: CLOSED`, integration SHA
  `a65f5ccfcbc56e75c7cc07f9ce6c9cd17291663a`.
- The baseline commit's GitHub `build` and `deploy` checks both completed successfully.
- From the prior checkpoint baseline through this baseline, first-parent history contains 32
  merged PRs: product capability, reliability, visual-system, dependency, and process work—not
  merely documentation churn.

## CURRENT PRODUCT

Confirmed by direct source inspection at the verified baseline:

- **Shell:** four primary territories remain TODAY / TRAIN / BODY / MORE. An active workout is
  restored into TRAIN on app launch. The app is still local-first/offline-capable with no account
  or backend; backup export and replace-only restore remain the portability boundary.
- **TODAY:** start/end day, state check-in, one primary Recommendation with WHY trace, RESET and
  SHIFT DOWN, work context, Commitments, active-workout continuity, Capture, minimum-day summary,
  and read-only Support-tier advisory notes. `TodayScreen.tsx` was decomposed into focused cards
  and sections (PR #61), although the orchestrator remains large (1,722 physical lines and 56
  `useState` references at this checkpoint).
- **Intelligence Spine:** advisory producers now cover eligible Obligations, TRAIN progression,
  and reviewed Decision Journal Lessons. Journal relevance matches current eligible Obligation
  titles plus active Mission titles (JOURNAL-001/002); these notes remain informational and never
  participate in Recommendation arbitration.
- **TRAIN:** built-in A/B/C and operator-created templates are selectable; personal exercises can
  be created/archived and substituted into a live workout. Prepared inputs, commit/undo flow,
  persistent rest timing, secured completion, recent history, and per-exercise progression are
  shipped. Progression increments now derive from equipment/muscle group rather than one flat
  5 lb placeholder (TRAIN-PROGRESSION-001).
- **BODY:** correctable sleep, water, protein, bodyweight, and meal logging; saved meal presets;
  configurable calorie/protein targets; and optional USDA FoodData Central search that only
  pre-fills the operator-reviewed meal form. Failed/absent lookup falls back to manual entry.
- **MORE:** History, Review, ranked fuzzy/prefix Personal Search, Missions & Obligations, Work
  Schedule, Decision Journal, Exercise Library, Custom Workout Templates, backup/restore, and
  System diagnostics. Search results navigate to the relevant Mission/Obligation management
  context or back to TODAY for Capture; the search index is disposable and rebuilt from Dexie.
- **Obligations:** Mission lifecycle filtering, relevance tiers, and RFC-5545-style recurring
  instances via `rrule.js` are shipped. Obligations still do not enter primary Engine arbitration.
- **Decision Journal:** Context → Options → Decision → Reasoning → Expectation → Outcome → Lesson
  records are shipped, including reviewed-Lesson advisory resurfacing described above.
- **Reminder:** an opt-in Web Notification check runs on app open/reload after the configured
  local hour when today's check-in is absent, at most once per day. It is on-device only, defaults
  off, and is not true background push (REMIND-001).

## ENGINE, DATA, AND DEPENDENCIES

- `src/engine/evaluate.ts` remains the sole primary recommendation arbiter with five kinds, in
  this order: STABILIZE → POST_SHIFT_TRANSITION → RECOVER → EXECUTE_PLANNED_WORK →
  NO_ACTION_REQUIRED. Its inputs remain check-in-derived Capacity plus `hasPlannedWork` and
  `hasUnresolvedPostShift`; RED still wins.
- `AdvisoryNote` is a separate INTERPRET-stage contract with no recommendation priority or
  command. Rated Outcome history is stored/read but is not an Engine input.
- Dexie schema is v11 with 16 declared tables. Since the stale v6 checkpoint it added saved
  meals (v7), Decision Journal entries (v8), personal exercises (v9), custom workout templates
  (v10), and nutrition targets (v11); migrations remain additive.
- Runtime dependencies now include MiniSearch, chrono-node, Compromise, and rrule.js. `fast-check`
  is present as a dev dependency. Lucide React is not installed.
- There are 112 source files and 106 test files, including 25 real-Chromium browser test files.
  The authoritative pass counts are the next successful `npm run verify`/CI run, not an old
  hand-maintained total.
- The root `README.md` is itself stale: it still reports schema v6 and an old 68-file/706-test
  baseline and omits several shipped screens/capabilities. Repairing README is not part of this
  checkpoint Drop and should be a separately authorized docs task.

## FACTORY / DELIVERY STATE

- Drop Contract + `ACTIVE_DROP.md` routing, exact-baseline worktrees, semantic risk tiers,
  required verification, exact-head independent review, separate integration, no self-merge,
  and post-merge closure remain the active delivery model.
- Further Factory-automation investment remains paused under the 2026-09-02 owner ruling;
  `FACTORY_PHASE_2.md` is not an active campaign.
- Live GitHub inspection on 2026-09-15 found zero open Dependabot alerts. Dependabot security
  updates and secret scanning are disabled; CodeQL returns “no analysis found.” No repository
  workflow/config currently enables CodeQL or Dependabot version updates.

## NEXT OPERATION — OWNER INPUT REQUIRED

No product Drop is sequenced by this checkpoint. Before starting any item below, re-confirm both
authorization and order with Gavin; older authorization records did not establish a durable
sequence, and this snapshot is not a substitute for a new Drop assignment.

**Open recommendation-priority decision—route to Gavin, do not infer:** Should currently eligible
OVERDUE/DUE_TODAY Obligations join `evaluate.ts` arbitration as a new Recommendation kind while
preserving RED/STABILIZE precedence, or should the deterministic five-kind Engine remain final
for now? This checkpoint records the fork without choosing either branch.

Other recorded but unbuilt or externally incomplete candidates requiring reconfirmation before
work begins:

- Rated Outcome history bias/tie-breaking in Recommendation selection (Architectural; prior
  authorization is recorded, implementation is absent, and Engine-priority semantics still
  require a fresh bounded contract).
- Lucide React adoption for a restrained shared icon grammar (dependency addition; the existing
  record says to re-evaluate against a concrete need, not install preemptively).
- GitHub security enablement: decide whether to enable Dependabot security updates, secret
  scanning/push protection, and CodeQL now that their live state is known. This checkpoint only
  verified state; it changed no repository setting.
- Any further TODAY decomposition or README/capability-document reconciliation should be scoped
  as explicit maintenance work rather than presumed as unfinished scope from the old checkpoint.

## KNOWN EXCLUSIONS / DO NOT BUILD

Still not authorized by this checkpoint: COMMAND desktop implementation; LINK/AI conversational
channel; a cloud/provider backend or account system; universal Entity/World State/knowledge-graph
architecture; generic dashboard work; broad OVERWATCH work; a proprietary food database; a
generic rules framework replacing BEYOND's Engine; or further Factory automation beyond the
current mechanism.

## CHECKPOINT VERIFICATION

CHECKPOINT-003 is documentation-only: this replacement, its permanent Drop Contract, and the
Factory-generated `ACTIVE_DROP.md` routing update. Its Builder verification and PR/CI evidence
belong to CHECKPOINT-003's final commit and PR; do not project the baseline's successful deploy
onto this Drop's still-unmerged documentation.

## RECOVERY NOTES

- Always fetch and verify `origin/master` before relying on the SHA or counts above.
- Treat this file as replaceable in full at the next checkpoint—not an append-only history.
- Follow `docs/agent/ACTIVE_DROP.md` to the current Drop Contract before doing work.
- Current code and Git/GitHub evidence outrank stale narrative summaries. If repository truth
  conflicts with higher product authority, stop and escalate rather than silently reconcile it.
