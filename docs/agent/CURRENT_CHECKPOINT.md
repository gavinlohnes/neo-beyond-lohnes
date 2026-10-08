# Current checkpoint

## Current objective — Command Console production milestone 1

Gavin authorized this bounded Protected milestone and explicitly amended the placement rule for
persistent WATER/MEAL/SYSTEM controls (UX Decision Register, 2026-10-08). Builder: Codex, sole
Lead Builder; branch `codex/command-console-m1`; active PR linked from this branch in GitHub.
Starting fresh master: `db5bae3267ddd82e15f3038f65dc7ba3412893ff`; PR #206 is integrated with
its reviewed head and green CI. PR #204 remains the sole overlapping open prototype PR, untouched.

Scope: compact production TODAY composition, one canonical RecommendationCard retaining existing
dominant/attention/support authority, existing work context/System Status, visible workout resume,
canonical BODY water/meal entry, and a native SYSTEM chooser over existing workspaces/TODAY Tools.
The four tabs and all capabilities stay. Contextual phase rows retain their four-row cap, semantics
and timing; time-sensitive work controls keep precedence. No Engine, commands, persistence, schema,
backup, dependency, fixture, identity-asset or prototype changes. VCC-001 remains paused and is not
implemented; complete searchable launcher/Milestone 2 is deferred. BUILD OWNED composition over
existing components/commands; USE PLATFORM native dialog with explicit focus containment/return.

Evidence: 16 new real-browser console cases; 47 console/phase/visual/motion cases passed,
with all 16 console cases repeated after final native-close focus ordering and fixture correction.
The full local run passed 2,166 tests with one existing skip; two old selector assumptions failed,
were corrected without weakening their assertions, and passed targeted verification. Final
TypeScript/build, architecture and whitespace pass. Actual synthetic-fixture screenshots at
320/360/412 px, status/evidence, logging, SYSTEM and resume are in
`docs/screenshots/command-console-m1/`. Exact head, final offline evidence and required full CI
are recorded in the linked PR. Built PWA checks pass offline save/log, cold reload, meal return,
SYSTEM navigation, water logging/undo, canonical totals and keyboard focus return.
Independent exact-head review and Gavin's final merge approval
remain required. Chromium automation is not physical-device/Safari or screen-reader testing;
memory-only meal drafts, existing undo windows and the existing bundle-size warning remain.
No merge or deployment is authorized. Next: independent review, then owner review.

## Historical objective — post-merge meal recovery focus correction

Updated 2026-10-08 by Codex. Gavin authorized a bounded accessibility follow-up to merged
PR #205. Fresh master is `22fa8c5af134088bdb0c9391914cea4282fa6a61`; open PRs #201 and
#204 are untouched. Builder: Codex; branch `codex/meal-recovery-focus`; corrective PR linked
from this branch's GitHub PR. Risk: ROUTINE accessibility repair, with independent exact-head
review explicitly requested before owner approval. BUILD OWNED: complete the existing native
focus handoff; no dependency, navigation, command, Engine, schema or persistence changes.

The delayed-read regression reproduced focus loss on master. BODY now completes the return-control
handoff after automatic recovery enables it, without stealing focus from a chosen visible control.
Deterministic gated-read tests also preserve the draft, canonical totals/history, correction access
and exactly one log. Verification: 99 browser tests passed across meal/App/BODY; both final focus
variants passed separately (21 unselected cases skipped). Architecture, TypeScript/production
build and whitespace passed. Built PWA passed offline save/log, offline cold reload, and offline
TODAY meal return with refreshed totals. Existing memory-only drafts and five-second undo remain.
Browser verification used Chromium. Required CI and exact head are recorded in the corrective PR.

Next: independent review of the exact corrective head, then Gavin's merge decision. No merge or
deployment authorized. VCC-001 remains paused. The prior milestone handoff below is historical;
its pending-merge pointers are superseded by PR #205's verified merge.

## Historical milestone 1 handoff

Updated 2026-10-08 by Codex, Lead Builder for Product Unification milestone 1.
This is a handoff, not merge authorization. Exact head and CI are recorded in the linked PR.

## Current objective — complete the meal-logging round trip

- **Authorization:** Gavin explicitly approved this bounded implementation following the Unified
  Product Blueprint. Product Unification takes priority; VCC-001 is paused, not canceled or
  superseded. No State Rail implementation or PR #204 integration is authorized.
- **Risk:** FEATURE UI handoff; conservative PROTECTED review lane because the roadmap records
  Gavin's explicit priority instruction (no workflow/authority rules changed). Independent exact-head
  review is required before merge. No primary navigation,
  doctrine, Engine, application commands, schemas, persistence, backups, dependencies or identity
  assets changed. BUILD OWNED: small React presentation state over existing canonical meal commands;
  native confirmation/focus/scroll behavior, no new infrastructure.
- **Starting state:** fresh `origin/master` = `8035dfbc0011bed03fb668e100aa8794cda4a8e7`;
  PR #203 is merged and DEV-FLOW-002 adopted. Open PRs #201 and #204 remain untouched.
- **Builder / branch:** Codex; `codex/unify-meal-round-trip`. Active PR: [#205](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/205).
- **Scope:** existing TODAY meal entry -> real BODY workflow -> explicit return with TODAY
  disclosures/position/focus retained; in-memory draft preservation; busy/discard guards; canonical
  confirmation, undo/correction and totals; near-control errors and duplicate-tap latch.
- **Exclusions:** new logger/persistence path, Engine/data/backup changes, navigation redesign,
  VCC-001, prototype changes, deployment and merges.
- **Acceptance evidence:** 115 targeted browser tests passed across seven files; follow-up
  browser/canonical nutrition/correction tests: 69 passed, one existing skip across six files
  (includes the 13 new round-trip cases again). Final repeated-return refinement: all 13
  round-trip cases pass; architecture, TypeScript/build and whitespace pass.
  Browser tests reuse installed Chromium through the existing temporary onboarding config, with
  no assertion or tracked configuration changes. Required full CI will be recorded in the PR.
- **Screenshots:** `docs/screenshots/unify-meal-round-trip/`, running app at 320/360/412 px,
  success/undo and returned TODAY; synthetic fixtures only, reduced-motion browser context.
- **Limitations:** drafts are session memory, not saved records; a supported browser warns on
  reload/close, but OS termination cannot preserve them. Existing five-second undo window is
  unchanged; later correction remains in TODAY'S MEALS. Primary tab navigation keeps its existing
  reset semantics after any needed discard confirmation. Only the existing TODAY meal entry
  gains this round trip; no new phase action is introduced.
- **Offline evidence:** built PWA passed offline preset save, canonical logging, TODAY -> BODY
  -> explicit return with updated totals, and service-worker cold reload with the meal retained.
- **Next:** confirm green required CI at the final head, obtain independent exact-head review,
  then owner review. No merge or deployment authorized. No unapproved product boundary is crossed.

## Independent review corrections — PR #205

- Owner supplied a BLOCK review of `16cff0feb46bc80b9b0e8da7e5e5dbfe6a7b7ac7`:
  P2 same-tick navigation could abandon a pending meal write; P2 post-commit read failures
  did not recover through explicit return/reopen. The reviewer reported a Forbidden review POST;
  no GitHub review existed. This handoff records the findings, not a Builder-issued review verdict.
- Fixes: synchronous BODY in-flight reporting and shell guards; synchronous existing BODY action
  guards; failed read continuations retried on reopen or through RETRY READINGS. Retry runs only
  reads, including duplicate/same-food checks, preserving drafts, confirmation and undo.
- Evidence: three new assertions fail on the blocked head. Fixed tree: 122 browser tests pass
  across seven files, plus one additional duplicate-check recovery case (21 round-trip cases total);
  immediate LOG -> all navigation paths,
  committed-preset/log recovery and explicit retry preserving another draft. Architecture,
  TypeScript/production build and whitespace pass. Built PWA offline save/log/return and cold
  reload pass again. Required CI at the new head is pending.
- The prior BLOCK is not cleared by Builder verification. Next: green exact-head CI and renewed
  independent review; owner merge approval remains required. No merge or deployment authorized.

## Historical adoption handoff

The following checkpoint is preserved as historical evidence. Its pending-adoption/merge pointers
are superseded by the verified state above.

# Current checkpoint

Updated 2026-10-08 by Codex, assigned Primary Builder for DEV-FLOW-002 only.
This is a handoff, not implementation or merge authorization. Read the approved objective brief;
verify branch/PR/head/CI from Git and GitHub rather than assuming this checkpoint is live state.

## Verified starting state

- Fresh `origin/master` and starting checkout both matched
  `9cf48c07b4b4e1ff807983dbc845d06a2de6eedb` with a clean working tree.
- PR [#200](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/200) merged at that SHA;
  both Git history and the public PR page confirm it. The former pending-review pointer is stale.
- PR [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199) remains the historical
  standalone-activation prerequisite. Its implementation and evidence are preserved.
- PR [#201](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/201) is still open on GitHub;
  this objective does not modify or close it. PR #200 already contains the AutoBackup selector repair.
- `ACTIVE_DROP.md` still records WEEKAHEAD-001 as CLOSED and is untouched historical Factory state.
  It does not assign this adoption objective or authorize VCC-001 implementation.

## DEV-FLOW-002 adoption

- **Authorization / risk:** explicit bounded owner approval, 2026-10-08; PROTECTED governance.
- **Brief:** [`DEV-FLOW-002.md`](DEV-FLOW-002.md), including scope and hard exclusions.
- **Branch:** `codex/dev-flow-002-adoption`. Exact head is derived with `git rev-parse HEAD` and
  will be bound in the PR description/review; do not use a self-referential checkpoint hash.
- **PR:** [#203](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/203),
  `DEV-FLOW-002 — Simplify BEYOND Development Workflow`; opened, not merged.
- **Done:** central workflow charter; reconciled procedural instructions; preserved historical
  Drop skill with a supersession notice; Protected governance risk guidance and 25 CLI regression
  cases; VCC-001 procedural transfer retaining all product scope, acceptance evidence, six
  screenshots, and independent exact-head review. State Rail remains unimplemented/unstarted.
- **Local verification:** 206 files passed; 2,129 tests passed, one skipped. Architecture checks,
  TypeScript/production build, syntax and whitespace checks passed. Committed-diff risk guidance
  reports PROTECTED. Consistency checks confirm unchanged product doctrine, VCC scope/invariants/
  acceptance/review, historical skill body, Factory pointer, CI workflows, and dependency files.
  Browser tests used the ignored onboarding config selecting installed `/usr/bin/chromium`;
  no tests, assertions, or tracked browser configuration were bypassed or weakened.
- **Remaining:** confirm exact-head required PR Verification, obtain independent Protected review,
  and wait for Gavin's merge approval. No PR merge is authorized in this session.
- **Environment:** initial GitHub API requests were denied by the egress policy. Added only
  `api.github.com` to the cloud environment draft, preserving presets and setup instructions.
  PR creation and subsequent read-only API checks now succeed using the existing binding; no
  new token was requested. Draft publication is not claimed.
- **Next action:** inspect required CI on the final PR head, then assign an independent Protected
  Reviewer to that exact head and resolve any findings. Wait for Gavin's explicit merge approval.
  Do not modify PR #201, start VCC-001, activate Factory Phase 2, or integrate anything.
- **Authority conflicts:** none unresolved within the approved adoption scope. Historical procedure
  is explicitly superseded for new work only after this adoption merges with owner approval.

## DECISIONS FOR GAVIN

None. Independent Protected review and owner merge approval remain separate steps.
