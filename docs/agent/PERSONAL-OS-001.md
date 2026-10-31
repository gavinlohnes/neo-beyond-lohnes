# PERSONAL-OS-001 — connected personal understanding

Design/research proposal, 2026-10-31. Not production implementation authority.

## Brief and authority

Gavin clarified the references as MiLyfe/RealMiLyfe, Daniel Miessler's LifeOS and broader
personal-os/lifeos-app projects, approved research and design, then said “Begin.” Codex owns
this design, not Claude's existing Alfred or LOOP implementation. Starting master: `20743ae`.
Branch: `codex/personal-os-design`. Open-PR overlap remains unverified: GitHub API access
previously returned Forbidden; check again before implementation. No merge authority.
The earlier `codex/goals-projects-design` proposal at `2e6c502` is preserved but parked. It
is not the expansion backbone or approved contracts. This proposal changes no doctrine.

## Finding

Build a connected personal context layer, not another collection of modules. The reference
with the clearest transferable design is LifeOS's TELOS: current circumstances, desired
direction, constraints and strategies feed an assistant. BEYOND already has a stronger
fit for this operator's lived-day health, rotation and confirmed actions than a generic
agent harness. Keep those capabilities and connect them.

## Sources and observed limits

Research is repository inspection, not installed-app testing or a security audit. No
upstream installer, agent instruction, dependency or code was executed. Descriptions below
are limited to the files read; README claims are not verified product performance.
Snapshots were fetched on 2026-10-31. Links pin inspected source where possible.

### Daniel Miessler LifeOS — primary architectural reference

Snapshot `b7efec97d8c3885feee285bee468c35602fb0606`, root MIT LICENSE inspected.

- [Repository](https://github.com/danielmiessler/LifeOS/tree/b7efec97d8c3885feee285bee468c35602fb0606).
- `LifeOS/install/LIFEOS/DOCUMENTATION/Setup/Telos.md` and
  `LifeOS/install/USER/TELOS/TELOS.md`: unified personal source, current/ideal state,
  missions, problems, goals, challenges, strategies and projects; interview can stop/resume.
- `LifeOS/install/LIFEOS/TOOLS/GenerateTelosSummary.ts`: a derived compact summary,
  source precedence and filtering to avoid presenting sample templates as real context.
- `LifeOS/install/LIFEOS/DOCUMENTATION/Skills/ProgressiveContext.md`: section-specific
  context loading, live source pointers, hashes and explicit incomplete-source handling.
- `USER/TELOS/CURRENT_STATE/README.md`: dimension coverage percentages. Do not import those
  life scores, generic life dimensions, autonomous reconciliation or self-modifying agents.

Disposition: ADAPT UPSTREAM concepts of confirmed context, current/desired distinction,
resumable capture and source-aware context assembly. No wholesale harness install. The
summary tool relies on filesystem/Bun and Markdown parsing: direct transplant fits poorly
with BEYOND's structured Dexie/event records. Exact helper extraction remains optional;
no upstream source has been copied. MIT permits adaptation subject to notices; inspect
selected files and separate asset/dependency terms before any actual copy.

### MiLyfe — reference identity partially resolved

RealMiLyfe's public profile links `MiLyfe-Platform-OS`, `MiLyfe-Universal-OS`, `MiLyfe`
and `milyfebackup`. The first two READMEs currently describe civic/community infrastructure.
The latter two READMEs provide little evidence. This does not establish the exact personal
“World OS / realms” version the owner recalled. Do not invent that product's behavior.

Inspected Universal snapshot `32a8089d8dbd991f1ec828871a638317df4ccec1`:
[repository](https://github.com/RealMiLyfe/MiLyfe-Universal-OS/tree/32a8089d8dbd991f1ec828871a638317df4ccec1).
Root license declares AGPL-3.0-or-later. `src/lib/offline/db.ts` contains cached profile,
wallet, messages and an outbox; `src/app/api/mi/chat/route.ts` authenticates through Supabase
and hosts chat/tool execution. Thus “offline” in its README must not be treated as proof
of a server-free architecture. The attempted realmilyfe.com/milyfe.com hosts were denied
by environment policy; no bypass attempted, no live platform tested.

Disposition: study broad integrated navigation and visible operator ownership. DEFER code
reuse: hosted civic/auth/economy architecture is outside this campaign and copying AGPL
code requires a compatible licensing/distribution decision. AGPL is not a ban; compatibility
has not been established. No copied code/assets, no identity/account system proposed.

### PersonalOS — useful workflow contrast, restricted reuse

[amanaiproduct/personal-os](https://github.com/amanaiproduct/personal-os/tree/34aa5918ea59bafdb664cca097b30a61001ab57a),
snapshot `34aa5918ea59bafdb664cca097b30a61001ab57a`. Root LICENSE is CC BY-NC-SA 4.0,
not a permissive software license; do not call it unrestricted open-source code.
README, `core/templates/AGENTS.md` and `core/mcp/server.py` inspected. It connects GOALS.md,
a backlog and task files; server implements string-similarity candidate deduplication.
Its AI-driven priorities, automatic edits/pruning and instruction template do not define
BEYOND authority. Upstream instructions are research material only.

Disposition: STUDY the explicit direction-to-work connection and duplicate candidate review.
No source/template copying selected: license constraints and architecture offer no advantage
over our existing confirmed Capture/Obligation commands. Similarity cannot establish identity.

### LifeOsApp — practical domain organization

[mirconegri/LifeOsApp](https://github.com/mirconegri/LifeOsApp/tree/4f21727afec248b7d939131a894b1bca66bbf0e5),
snapshot `4f21727afec248b7d939131a894b1bca66bbf0e5`, root MIT LICENSE inspected.
README, `src/config/modules.js`, `src/data/storage.js`, `src/screens/GoalsScreen.js` inspected.
Optional modules are a small static registry; goals use editable numeric progress.
Storage is React Native AsyncStorage JSON with caught read/write errors, not BEYOND's
atomic/history model. This is one concrete broader-category example, not confirmed as the
owner's exact “lifeos-app” reference.

Disposition: ADAPT the small optional-area registry concept when needed; no module platform.
REJECT transplanting storage, generic numeric progress, habits streaks or the React Native
shell. Existing BEYOND React/Dexie components fit better. No dependency needed.

## BEYOND gap map — checked against current code

| Capability | Exists | Missing connection |
| --- | --- | --- |
| Current circumstances | lived-day ledger, Garmin, rotation, check-in, obligations | consistent freshness/availability and inspectable references in Alfred context |
| Durable direction | Missions, operator targets, weekly focus | absent from initial `buildAlfredContext` |
| Confirmed personal facts | MEMORY-001 revisions; separate Alfred memory table | no shared source-aware view; initial Alfred context omits MEMORY-001 |
| Reflection/learning | Journal, TRY, REMEMBER, Personal Understanding | useful source links are scattered; no explicit desired-life comparison |
| Assisted action | Alfred proposal cards and canonical commands | context refresh, provenance and duplicate/stale proposal behavior need bounded verification |
| Management/review | COMMAND, DATA Cave, Personal Understanding | one place to inspect what context Alfred uses and correct at its source |

`application/alfred/alfredContext.ts` currently reads health, schedule, tasks, notes and
`alfredMemories`, not Missions or MEMORY-001. `AlfredSheet.tsx` builds this context once when
creating an `AlfredSession`; reopening resets it, read tools may obtain fresher records,
but the initial context is not rebuilt on each turn. This is a connection gap, not evidence
that Alfred lacks all history or that every answer is wrong.
`alfredSearch.ts` returns textual hits; it is not a typed navigable citation contract.

`memory.ts` has confirmed-at, irrelevant/restore and causal revision guards. Alfred memory
has text/topic/savedAt and physical deletion. Intent has atomic current-state rows plus
historical events. “Everything is already purely event-sourced” would be false. Design
must preserve existing records and disclose exceptions, not invent a third memory database.

## Target architecture

1. Canonical records remain in their current owners: Intent, health, journal and memory.
2. A small application-layer context projection returns typed source references, revision,
   read time, availability and actual text/values. It owns no duplicate health/task records.
3. Operator-authored direction and constraints complement measurements. Measured history
   does not automatically become a preference, diagnosis or personality trait.
4. Context is assembled for the question: a bounded current summary plus relevant retrieval.
   Explicitly report exclusions, unavailable sections and truncated results.
5. Alfred interprets and proposes; application validates typed output, resolves references
   and runs existing commands only after confirmation. Evidence is not executable instruction.
6. Review shows selected actions and outcomes through the existing Journal/TRY loop.

No graph database, vector store, multi-agent framework, new backend or model dependency is
justified for the first experience. Start with explicit links and ordinary queries.

## Recommended first build — “Help me plan my next days off”

One complete vertical experience, tentatively PERSONAL-CONTEXT-001, PROTECTED where fact kinds,
command semantics and source contracts change. This remains a proposal awaiting approval.

### Operator journey

1. COMMAND → existing Personal Understanding gains a “What matters to me” workspace.
   It shows existing Missions (direction), selected relevant records, and confirmed context.
   Do not add another dashboard or TODAY block.
2. Optional short capture asks one question at a time: “What are you working toward?”,
   “What should a plan respect?”, “What would you like to be different?” Skip any question,
   save a single answer, stop/resume, or use the manual editor without Alfred.
3. Show existing matching facts before proposing new ones. A direction can link to an existing
   Mission; a constraint remains a confirmed statement. Never turn every answer into a task.
4. A preview shows the exact statements, source destinations and any proposed relationships.
   Operator confirms individually; no silent summarization becomes durable truth.
5. “PLAN MY NEXT DAYS OFF” opens Alfred with the current chosen context, schedule and existing
   commitments. A “Sources used” disclosure opens canonical records and their dates.
6. Alfred drafts a few practical options and names missing information. Choices remain draft
   until the operator selects one and confirms an existing note/Obligation proposal.
7. Review the result through the existing reflection path; saving a lasting lesson or changing
   personal context is another explicit operator choice.

Illustrative copy only, not findings about Gavin:

    WHAT MATTERS TO ME
    Direction: Have more energy for life outside work
    Respect: Keep the first morning after nights quiet
    From you · last confirmed Thu, Oct 29        INSPECT
    PLAN MY NEXT DAYS OFF

    ALFRED — DRAFT PLAN
    Your schedule shows these days off. You asked to keep the first morning quiet.
    We could leave that morning open and put your chosen home task on the following day.
    [Sources used]  [Review proposed commitment]

Alfred must not assert that a morning is free merely because no task is recorded, invent
shift times, claim packing caused better recovery, or displace an Engine workout suggestion.
Health/capacity facts are context, not a new recommendation arbitration rule. Where suggestion
versus Engine Recommendation is ambiguous, expose the boundary and obtain adjudication.

### Bounded data and trust contract

- Reuse MEMORY-001 causal/history behavior for any newly approved constraint/aspiration kinds;
  do not repurpose unrelated PREP kinds or silently migrate existing Alfred memories.
- Existing Alfred facts remain referenceable by store+ID in a combined read view. Provide
  correction at their existing source, or propose an approved edit command. Conversion between
  stores requires explicit confirmation, retained provenance and specified old-record handling.
- Never merge contradictory facts by recency alone. Show both, ask if needed, permit decline.
- Distinguish operator current-state assessment, desired direction, constraint and measured
  record. Source reference includes type/ID/revision, not just a date-shaped citation.
- New facts retain authored text, operator source, confirmation time, active/irrelevant status
  and revisions. Retention of old Alfred facts is unchanged until explicitly approved.
- Fresh context before each request and after confirmed writes; known read failure becomes
  unavailable, not “none recorded.” A corrected/irrelevant source cannot survive in a reused
  model context as active fact. Test actual request assembly, not only visible UI.
- Irrelevant is not erasure. For Forget, explain local history/backup behavior; never claim an
  earlier Anthropic request can be recalled. Changing retained context may require a fresh
  conversation, and the UI must say so rather than silently claiming transcript deletion.
- “What Alfred can use” shows the data categories/records sent to the approved provider.
  New sensitive personal context gets an explicit inclusion choice; offline inspection/editing
  stays available. Context excluded from Alfred must also be excluded from search/read tools.
- Snapshot exclusions and budget limits are explicit; no full-store scan or full-history upload
  by default. Retrieval rules, caps and source navigation are part of the implementation brief.

## Acceptance for that first build

1. Capture one context fact, inspect source/date, correct it, mark irrelevant and inspect history;
   neither health records nor Engine output changes.
2. Link existing direction rather than create duplicate Mission/task. Skipping capture is valid.
3. Plan from a synthetic overnight rotation, chosen constraint and an existing commitment;
   every factual reference opens its actual record; unknown availability stays unknown.
4. Confirm one proposed action exactly once; retry/double tap, stale day, old revision and failed
   write cannot claim success or apply an outdated action. Existing cards use canonical commands.
5. Correct/exclude/forget context mid-session and inspect the next API payload, including read
   tools and transcript reuse. It must not reintroduce excluded facts as current context.
6. Offline capture/inspect/correction, retained drafts, backup round-trip and old-backup restore;
   online planning explains unavailability without blocking the local journey.
7. Contradictory sources, failed reads, empty data, truncated context and sample starter text
   have distinct tests. Prompt-like text in records cannot grant tool/write authority.
8. 360px, focus/back navigation, bounded lists, axe and reduced motion; no TODAY addition,
   recommendation priority or deterministic Engine behavior change.

No production tests run during this research-only step. Implementation requires bounded
Protected approval, exact contracts, full appropriate verification, independent exact-head
review and Gavin's merge approval. No live-API quality/cost claims from mocked tests alone:
use consented synthetic live trials with recorded latency, usage and source correctness.

## REUSE / OWN / BUILD FROM SCRATCH

- REUSE: TELOS current/desired-context pattern; BEYOND Missions, Personal Understanding,
  MEMORY-001, existing Alfred read/card flow, canonical commands, Journal/TRY and backup.
- OWN: source-preserving projection, context selection/freshness, typed source navigation and
  mapping operator-confirmed context into the planning experience.
- BUILD FROM SCRATCH: only missing context contracts and UI composition; donor harnesses and
  foreign stores cannot preserve BEYOND's existing record truth/command authority as-is.
- No donor code copied, runtime dependency added, product UI changed or external account created.

## Campaign after the first demonstrated loop

Direction/goals/projects then become structured context and action relationships; relationships,
career, routines and home extend the same inspectable model when approved. Each area must prove
one useful cross-domain journey before receiving a separate dashboard. Finance, learning tracker,
sync, autonomous priorities, inferred personality and a configurable module platform stay out.

## Owner decision

Approve or revise PERSONAL-CONTEXT-001's bounded journey and explicit new-context/Alfred boundaries.
This is the next implementation decision, not a request to design the architecture yourself.
The exact MiLyfe reference can refine later research without blocking the evidenced first design.
