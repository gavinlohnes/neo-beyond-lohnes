# C4.2a — owner-editable caffeine cutoff

- **Authorization:** original “Start it” recorded by Claude Code for PR #595; superseded in scope by Gavin’s explicit 2026-11-20 approval to narrow this PR to owner editing, source explanation, save and undo, removing all automated suggestion/confidence/suppression machinery without a larger experiment. This grants no authority to implement future experimentation or other plan numbers.
- **Lane:** PROTECTED: locked SHIFT-SLEEP-PLAN-001 amendment and a backed-up setting. Independent fresh exact-head review and Gavin’s merge approval required; no merge.
- **Builder/PR:** Codex takes over Claude Code’s existing `claude/project-thread-iopp5i`; [PR #595](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/595).
- **Starting commits:** original implementation `a857f285f273e2d4580ffbfb635aed995ee6d792`; narrowing begins at `f79c8f23839307770bf8c41f9b33878a08968e19`. Reconcile the exact approved master `2e53d10a7240a25e53d46c468bd2c4fc5052dbff`; only the checkpoint conflicts, preserving the original PR history and current master handoff.

## Outcome, retained scope and exclusions

The owner can inspect the cutoff’s origin on ROUTE, change it explicitly (3–12 whole hours, default 6), SAVE and UNDO. Owner provenance/timestamp, schedule-save preservation, native backup/restore validation and ROUTE/TODAY cutoff-time agreement remain. The source explanation describes a 400 mg study at 0/3/6 hours and its limitations; it makes no safe-threshold or personalized-benefit claim. No sleep evidence is read to choose or recommend a setting.

Remove `cutoffProposal.ts`, its count-based trigger/confidence/tests, the Delta-panel entry, approval branch, decline function/timestamp/quiet period, and DELTA setting provenance. No provider, dependency, notification, caffeine log, Engine arbitration, new schema version or other domain expansion. Ordinary schedule-row configuration remains owner-controlled; no history rewrite or protected fixture changes.

## Deferred direction — not started or authorized

A future, separately authorized objective may implement an explicit caffeine experiment using BEYOND’s existing experiment lifecycle, with exposure/adherence context, duration, outcome measures, stopping conditions, provenance and owner consent. Poor sleep alone cannot identify caffeine as its cause. This PR does not build an experiment, infer exposure or widen Delta authority.

## Reuse and acceptance

- **REUSE:** existing ROUTE caffeine card, schedule-row settings pattern, native backup/restore, explicit save and guarded undo. Existing experiment lifecycle is a future reuse boundary, not a new implementation.
- **OWN:** owner-only setting validation/provenance, source wording and consistent cutoff display.
- **BUILD FROM SCRATCH:** none.

Verify owner save/cancel/undo and later-change guard; default/owner provenance; range validation; native backup round trip and malformed input; schedule and key-moment setting preservation; ROUTE/TODAY agreement; no proposal/suppression surface. Run focused Node tests in UTC/Chicago, real-browser cutoff tests with phone-width/accessibility checks, architecture, TypeScript/build and appropriate broader regressions. Required CI and fresh independent review must use the new exact head. Record actual results in the PR/checkpoint; no physical-phone delivery or scientific causal validation claimed.

## Builder verification

Focused UTC Node checks pass 35/35 across settings, TODAY cutoff agreement, shift plan, schedule preservation and historical restore compatibility. Focused Chicago checks pass 18/18. Cutoff/shift-plan browser suites pass 3/3; actual 360 px [editor evidence](evidence/c4.2a/README.md) inspected. Architecture and production build (including TypeScript/PWA) pass; diff hygiene passes. No new full local suite or physical-phone check claimed. Required CI and new exact head will be recorded in the PR handoff, preserving that review candidate. Fresh independent review remains required; no PR merge.
