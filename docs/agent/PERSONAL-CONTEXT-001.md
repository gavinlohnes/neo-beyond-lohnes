# PERSONAL-CONTEXT-001 — what matters, connected to planning

- Authority: Gavin approved the bounded first connected-context implementation with “Let's
  get after it”, following the explicit scope/approval gate. He also approved Delta-inspired
  calm precision, practical warmth and no guilt. Codex is Builder for this slice only.
- Starting master: `20743ae` (#351), freshly fetched. Branch `codex/personal-context-001`.
- Lane: PROTECTED, bounded additive confirmed-memory kinds and Alfred context/privacy contracts.
- Scope: inspect/correct local direction/constraints, existing Missions and memory; explicit
  personal-context inclusion for Alfred; source inspection; refreshed context, stale-context
  invalidation and confirmed existing-command actions; days-off planning starter and agreed voice.
- Reuse: MEMORY-001 revisions/editor/backup, Intent sources, Personal Understanding, Alfred
  cards/read tools, canonical commands, existing SDK. TELOS context distinctions inspire the
  mapping; no upstream code or library is needed (see PERSONAL-OS-001.md research).
- Own: typed context/source projection, privacy selection/freshness boundary and surface mapping.
- Build from scratch: only missing source/context composition; no donor app can preserve our
  canonical records and commands as-is.
- Contracts: DIRECTION and CONSTRAINT extend existing MEMORY_RECORDED kind validation; no new
  schema/table. They never appear as PREP or recovery facts. Existing facts/stores stay intact.
  Personal context is opt-in per conversation, not silently sent in TODAY's automatic brief.
  Removing/changing context starts a fresh model conversation; prior external requests cannot
  be recalled. Historical memory revisions are not returned as active facts by read tools.
- Exclusions: Engine, recommendation selection, TODAY composition, autonomous reminders,
  Goal/Project schema, memory-store migration, third-party accounts/dependencies and backup format.
- Acceptance: source inspection and correction, offline and backup, no-write reads, fresh request
  payloads after correction/exclusion, refusal/error honesty, overnight planning, duplicate/stale
  action protection, phone accessibility; full verify + independent exact-head review + green CI.
- Access: GitHub API returns Forbidden, blocking open PR discovery/creation/CI observation.
  Fresh master and branch refs remain accessible. No claim that Claude has no unpublished work;
  we do not edit his branch or take over his broader campaign. Recheck before review/integration.
- PR: pending. No merge authorized. Live results and review follow in checkpoint/PR.


## Mainline integration

Master #352 (`f001049`) landed during verification. Its weekly review, schema v17, shared
Alfred-memory manager and other entry points are preserved. This slice still introduces no
schema change relative to current master. Automatic brief/review retains #352's approved
prep/recovery memory context; new DIRECTION/CONSTRAINT kinds remain excluded. Conversation
planning uses the explicit opt-in catalog for all MEMORY-001 facts, avoiding a base-context
bypass. Integration regression covers both paths. Earlier #351-baseline research is historical.


## Release evidence and remaining gates

- Source `579ae55b21977240ad8d90eacf3ca32b5fd17cd4`: full verify exit0; architecture374 files,
  362 files passed/one skipped, 3226 tests passed/two skipped, TypeScript/build/PWA pass.
  Skips are existing compile-time nutrition guard and environment-gated visual audit.
- Independent exact-source PASS, reviewer node8/8; copied [record](reviews/PERSONAL-CONTEXT-001.md).
- Built four-size offline/reduced-motion/source acceptance: [artifacts](../screenshots/personal-context-001/README.md),
  source SHA in acceptance.json. API replies mocked; no live quality/cost/effectiveness claim.
- Full-gate history: earlier runs deliberately stopped for draft retention and master integration.
  Completed a809 run3225pass/one failed/two skipped: synchronous focus assertion raced the RAF.
  Corrected to await the same required focus under the default bounded polling assertion;
  no timeout/config/assertion weakened. Focused9/9 and subsequent entire gate green.
- GitHub PR creation attempted via gh with body file: GraphQL Forbidden; REST listing also
  Forbidden. Branch pushed. CI and native PR/review comments unavailable. Final docs-only
  commit does not change verified source; obtain exact-head reviewer confirmation.
- No merge/deployment authorized or performed. Live phone/Claude tuning follows a reviewed,
  green-CI owner-approved merge, not a new automatic feature campaign.


## Builder transfer

Gavin: “Wrap up. We are handing it over to Claude Code.” Codex stops implementation and
transfers the existing objective/branch to Claude Code. See the [handoff](PERSONAL-CONTEXT-001-HANDOFF.md)
for exact heads, completed verification, Git-note review evidence and PR/CI/merge gates.
This transfer changes no product scope and supplies no merge approval.


## Claude Code takeover

Gavin handed the slice to Claude Code on 2026-10-31. Codex's branch was merged unchanged into
`ccr-0be4f40f-16m0ja`; PR #353 carries it. No scope change; merge remains Gavin's.

Review at `3a356a2` (BLOCK) fixed: confirming Alfred's own "remember"/"forget" card no longer
refuses the reply's other cards or resets the conversation. The save returns the new context
version from inside its own transaction; outside changes still fail closed. A failed send now
says the next message starts fresh. Forward-compatibility note: a backup holding DIRECTION or
CONSTRAINT facts restored into a build older than this one makes that build's memory unavailable
(fails closed, nothing lost). Don't restore such a backup into an older build.
