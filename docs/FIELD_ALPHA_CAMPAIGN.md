# BEYOND FIELD ALPHA — Autonomous Implementation Campaign

Status: **ACTIVE**. Kicked off 2026-08-22. This document transcribes the owner's campaign
authority verbatim/faithfully — it is the reference for every phase of this campaign, not a
new product spec. See `CLAUDE.md` for the general authority order and architecture rules that
apply beyond this campaign.

## Mission

Advance the current BEYOND repository from its present functional prototype state into the
first coherent BEYOND FIELD ALPHA.

This is a large implementation campaign. Substantial implementation autonomy exists inside the
boundaries below. The objective is not maximum commits. The objective is a major, healthy,
operator-visible leap.

At campaign completion:

- TODAY should feel like COMMAND IN THE FIELD.
- TRAIN should feel like EXECUTION.
- BODY should feel like INSTRUMENTATION.
- MORE should feel like EXPOSED MACHINERY.

All four must feel like one BEYOND system.

FIELD should feel like: *"A quiet piece of equipment that knows far more than it is currently
showing."*

Do not begin COMMAND desktop implementation. Do not begin LINK/AI implementation. Do not
finalize the permanent BEYOND logo.

## Current repository

Current implementation truth is `gavinlohnes/neo-beyond-lohnes`. Inspect the repository
freshly before acting — do not infer current behavior from this document when the repository
can answer it. Reference HEAD at campaign planning time: `e220ac9`.

## Authority order

1. Direct owner decision.
2. BEYOND Product Constitution / Operator Doctrine.
3. Canonical Spec + later explicitly locked Decision Register entries.
4. This active FIELD ALPHA campaign.
5. Current repository implementation truth.
6. Current visual/interaction contracts.
7. R&D / North Star.
8. Historical build/recovery material.

Repository truth answers WHAT EXISTS. Higher product authority answers WHAT IT IS ALLOWED TO
MEAN. Do not silently reconcile a genuine conflict.

## Terminology

- **FIELD** = phone-first Suit interface.
- **COMMAND** = the deep-work / Batcomputer interface. COMMAND is NOT part of this campaign.
- **LINK** = future conversational Man-in-the-Chair channel. LINK is NOT part of this campaign.
- **UTILITY BELT** = capability-on-demand doctrine. Not automatically synonymous with the
  bottom nav.
- **OPERATOR** = the human and final decision authority.

## Product doctrine — constitutional

Protect:

- INFORM → INTERPRET → RECOMMEND → USER DECIDES.
- Deterministic Engine authority.
- One primary recommendation.
- NO ACTION REQUIRED is valid.
- Prediction is not fact.
- History/event truth is preserved.
- Corrections supersede; they do not silently erase history.
- Provenance matters.
- Manual operation remains available.
- Capability depth / surface calm.
- GLANCE → ACT → INSPECT → TRACE.
- FIELD compresses. COMMAND exposes.
- System reports. Advisor interprets.
- Silence is valid.
- User authority is absolute.
- Peak efficiency is not minimum code. It is minimum code that BEYOND is uniquely responsible
  for.

## Standing engineering question

Before consequential implementation ask: **IS BEYOND UNIQUELY RESPONSIBLE FOR SOLVING THIS
PROBLEM?**

Classify consequential decisions: `BUILD OWNED` · `USE DEPENDENCY` · `ADAPT UPSTREAM` ·
`INTEGRATE PROVIDER` · `STANDARDIZE` · `DEFER` · `REJECT`.

Do not add dependencies simply because they are convenient. Do not hand-build commodity
infrastructure merely for purity.

## Visual constitution

Preserve the approved Suit grammar: black-dominant negative space; sharp red directionality;
controlled asymmetry; lean silhouettes; minimal ornament; geometry that implies motion;
typography-led hierarchy; red authority must be earned; significance earns intensity;
capability depth / surface calm.

No: generic card-wall composition; universal BeyondCard abstraction; gradients; glassmorphism;
decorative HUD geometry; fake telemetry; cyberpunk clutter; tiny decorative technical text;
consumer-app pill language; excessive rounding; decorative looping animation; Batman
asset/logo imitation.

Accessibility outranks aesthetic purity.

## Implementation freedom

The current visual DOM/CSS structure is NOT sacred. You may materially recompose
presentation, replace obsolete presentation-only structures, reorganize components, change CSS
architecture, create semantic visual primitives, and abandon a prior implementation approach
for a better one.

**PRESERVE THE MACHINE. REBUILD THE COCKPIT.**

Do not change BEYOND doctrine simply because a different product design would be easier to
implement.

## Autonomy

Decide without asking: component structure; CSS organization; semantic primitive names;
spacing; responsive implementation; local presentation refactors; motion mechanics; testing
mechanics; focus/accessibility implementation; removal of obsolete presentation-only code;
routine documentation; whether a proposed implementation technique should be replaced with a
better one.

**Escalate before continuing** if work requires: Engine behavior change; recommendation-
priority change; command/event semantic change; new or destructive schema/migration;
correction-model change; historical fixture modification; backup-contract change; removing
user capability; changing TODAY/TRAIN/BODY/MORE primary information architecture; changing
Mission/Obligation semantics; a meaningful new runtime dependency; external provider/account/
backend introduction; paid infrastructure; a composition change that materially changes how
recommendation authority or user choice is experienced; or a genuine conflict between current
code and higher authority.

## Forbidden

Do not: add AI; add LINK; implement COMMAND; add cloud sync; add backend/accounts; add
Calendar/Gmail/Drive integration; add MONEY; add wearables; add Capacitor; finalize the logo;
invent telemetry; store behavioral UI exhaust; silently convert predictions into facts; bypass
application command/query boundaries; modify protected historical fixtures; delete capability
for visual cleanliness.

## Agent operating model

Begin with plan mode / read-only repository inspection. Use strategy-level planning rather
than asking approval for every routine action. Use checkpoints together with Git. Do not use
dangerously unrestricted permission bypass. Use subagents only for bounded, non-overlapping
work (repository inventory, test inventory, accessibility review, visual duplication
analysis) — never multiple agents rewriting the same UI simultaneously. Targeted tests during
iteration; full verification at phase boundaries.

## Phases

### Phase 0 — Runway + truth hygiene

Confirm current master + clean worktree. Inspect architecture, screens, Engine, commands/
queries, persistence/schema, tests, compatibility fixtures, CI, tokens/styles, existing visual
primitives. Create `CLAUDE.md` (navigation/guardrail, not a spec) and this campaign document.
Perform a truth-hygiene audit (known lead: BeyondDB reaches schema v6 while older diagnostics/
docs may still report earlier versions) — correct demonstrably stale current user-facing
diagnostics and materially misleading current documentation; do not clean every historical
comment simply because it's old. Record the exact baseline commit. Run baseline typecheck,
full tests, compatibility fixtures, and build — if not green, stop and report before campaign
work.

### Phase 1 — TODAY FIELD composition

Finish TODAY as the canonical FIELD reference surface — not merely restyle the existing
layout. TODAY must answer quickly: WHERE AM I? WHAT IS TRUE? WHAT MATTERS? WHAT CAN I DO? WHAT
MORE CAN I INSPECT? Primary posture: SYSTEM/STATE → PRIMARY DECISION or legitimate ALL CLEAR →
PRIMARY ACTION → earned ATTENTION → nearby capability → deeper tools/machinery on demand.
Reduce persistent machinery exposure. Do not delete: RESET; SHIFT DOWN; Capture; State
Check-In; Minimum Day; Work Context; END DAY; WHY; commitment attention; outcome behavior; or
any currently accepted capability. Re-evaluate repeated OPEN-button/application-row treatment
— where clear and accessible, make the semantic row/control itself the interaction rather than
adding generic rectangular OPEN buttons; preserve explicit labels when comprehension requires
them. Use black territory; protect one red center of gravity; ALL CLEAR genuinely quiet; state
input reads as an instrument, not a web form; secondary tools stay predictable without
permanently consuming equal territory. Do NOT implement a generalized priority framework — use
existing state, attention policy, and domain truth.

**Verify**: targeted tests during work; typecheck; full test suite; compat fixtures; browser/
accessibility tests; production build. Merge the known-good phase to master via the repo's
existing clean-merge pattern. Confirm CI/deploy. Then **STOP**.

**=== EXPERIENCE GATE A ===** Do not start TRAIN until the owner reviews the deployed TODAY on
the actual FIELD device. Request only: normal TODAY screenshot; action/recommendation
screenshot if available; ATTENTION state if available; short owner feedback. Ask the owner to
judge: one-second hierarchy; red authority; legibility; thumb access; 3-AM clarity; equipment
vs. web-app feeling; depth without capability loss. Fix and re-gate if corrections are
required.

### Phase 2 — TRAIN execution cockpit

Make TRAIN feel like operating equipment during an actual workout. Preserve all existing TRAIN
semantics — do not redesign A/B/C rotation; STANDARD/REDUCED/RECOVERY rules; progression;
PARTIAL/COMPLETED/ABANDONED; set truth; override semantics; substitution semantics.
Ready-state TRAIN should make the recommended/selected session understandable without
dashboard clutter. Once a workout begins, execution may materially change posture — during
active execution prioritize: current exercise; current set; current load; rep target; editable
input; LAST relevant performance; current deterministic progression evidence where useful; LOG
SET; clear next/stop behavior. Everything else recedes. Use existing last-set/progression
queries before inventing new data. Optimize for one-handed operation. No tiny controls. No
unnecessary navigation. No exercise-database expansion. No new training science.

**Verify** (same discipline). Merge known-good phase. Confirm CI/deploy. Then **STOP**.

**=== EXPERIENCE GATE B ===** Owner tests TRAIN on the actual phone, ideally through a real or
realistic workout flow. Ask only: Can I understand the current exercise/set immediately? Can I
adjust/log a set one-handed? Is LAST useful? Is target/progression clear without being noisy?
Can I stop/exit safely? Does this feel like execution equipment? Fix demonstrated problems
before continuing.

### Phase 3 — BODY instrumentation

Turn BODY from a tracker-card stack into a coherent instrument surface. Preserve: water;
protein; sleep; bodyweight; quick actions; manual fallback; corrections; undo/confirmation;
history; plausibility handling; effective-truth semantics. Primary measurements should become
visual objects. Prefer VALUE / UNIT / meaningful delta-or-context when already supportable /
DIRECT ACTION over label / form / button / card. Do not fabricate trends or baselines. Do not
add generic health scoring. Do not turn unknown into zero. History and corrections remain
available at deeper depth. Use commodity icons for commodity concepts — recognition beats
cleverness.

Run phase verification. Merge known-good phase. Continue without owner interruption unless a
product contradiction appears.

### Phase 4 — MORE / exposed machinery

Make MORE feel like deliberately opening BEYOND's machine room rather than entering a generic
settings page. Preserve: History; Missions; Obligations; work schedule; backup; archive/share;
restore; diagnostics; version/state information. Do NOT add new domains. Organize by operator
purpose and consequence. Ordinary machinery can be dense. Destructive operations must be
unmistakably separated. Restore keeps: preview-before-write; automatic pre-restore backup;
replace-only behavior; validation; historical compatibility. Missions/Obligations remain
dedicated deep management, not primary-nav clutter. Do not change Intent semantics. Correct
stale current diagnostics discovered by repository evidence.

Run phase verification. Merge known-good phase.

### Phase 5 — FIELD coherence

Inspect TODAY/TRAIN/BODY/MORE together. Goal: one system, different operating roles — TODAY =
command, TRAIN = execution, BODY = instrumentation, MORE = machinery. Reconcile: typography;
red-authority levels; navigation/Utility Belt; spacing; touch behavior; focus; motion; safe
areas; semantic control grammar; density. Extract/reuse only patterns proven across actual
screens. Do not force domain-specific surfaces into one universal component. Remove obsolete
presentation-only code when confidence is high and tests protect behavior.

Run complete verification. Merge. Confirm CI/deploy. Then **STOP**.

**=== EXPERIENCE GATE C ===** Owner reviews the whole FIELD device. Request screenshots of
TODAY, TRAIN, BODY, MORE. Ask: Does this feel like one machine? Does each screen have a
distinct job? Can common operations be found without explanation? Does anything still look
like generic card-stack React software? Is secondary information readable? Is red controlled
but unmistakably BEYOND? Does FIELD feel calmer despite retaining capability? Correct
demonstrated coherence issues before advancing.

### Phase 6 — Intelligence candidate audit (read-only)

Do not implement intelligence yet. Audit current repository AND actual available data support
for:

- **A. Outcome memory proof** — can a current recommendation truthfully show one prior
  decision/outcome relation without fuzzy similarity or invented confidence? (e.g. `PREVIOUS //
  REDUCED` / `OUTCOME // HELPFUL`, only if evidence exists.)
- **B. TRAIN memory-in-execution** — how much useful prior performance/progression context is
  already available vs. merely a presentation problem?
- **C. Commitment relevance proof** — can existing deterministic obligation relevance
  communicate one useful WHY-NOW fact without altering primary Engine arbitration?

A clearly superior fourth candidate may be proposed only if existing repository evidence
supports it. For each, return: operator value; exact data already available; new queries/logic
required; schema impact; determinism; explainability; sample/data sufficiency; implementation
cost; regression risk; visual integration; future leverage. Rank them. Then **STOP**.

**=== OWNER INTELLIGENCE SELECTION ===** Do not choose and build the intelligence feature
without the owner. Wait for explicit approval of exactly one candidate.

### Phase 7 — Selected intelligence win

After explicit selection, implement only that candidate. Constraints: no AI; no hidden score;
no silent policy mutation; no new source of canonical truth; no schema unless separately
escalated and approved; no invented similarity; no false confidence. If evidence is absent, the
UI must remain silent. The feature should make BEYOND more useful even if the operator never
reads an explanation. WHY/INSPECT must be able to explain it.

Run full verification.

### Phase 8 — FIELD Alpha hardening

Final audit: typecheck; full Vitest suite; real-browser suite; axe coverage; compatibility
fixtures; production build; CI; PWA/offline artifact verification; capability-preservation
audit; dependency audit; schema/backup audit. Capture or generate canonical test states
practical with current tooling — do not build a massive visual-regression platform solely for
this. Review production bundle changes; do not chase the existing chunk-size advisory unless
measured user impact justifies it. Reconcile current repository documentation and Capability
Board. Do not modify Product Constitution/Canonical Spec/Decision Register unless an explicitly
approved product decision changed during the campaign.

## FIELD Alpha definition of done

TODAY feels like command. TRAIN feels like execution. BODY feels like instrumentation. MORE
feels like machinery. The four screens feel like one BEYOND system without looking identical.
Every previously accepted capability remains reachable. One dominant recommendation doctrine
remains intact. NO ACTION REQUIRED remains intact. Historical fixtures remain intact. Backup/
restore remains safe. Offline-first behavior remains intact. Accessibility remains valid.
Common FIELD interactions are practical on the real phone. No fake telemetry exists. No AI
exists. No COMMAND or LINK implementation exists. No permanent logo decision was made.

## Final report

At campaign completion, return a BEYOND FIELD ALPHA — Campaign Completion Report covering:
baseline; phase commits; CI runs; exact files changed by phase; dependencies changed; CLAUDE.md/
runway changes; truth-drift corrections; capability-preservation matrix; TODAY/TRAIN/BODY/MORE
results; FIELD coherence result; selected intelligence feature and evidence; tests/counts;
compatibility status; schema/migration status; backup status; accessibility status; PWA/
offline status; known limitations; remaining technical debt; real-device acceptance results;
recommended next strategic move. Do not automatically begin COMMAND, LINK, AI, integrations,
MONEY, wearables, sync, or another large campaign. Stop at FIELD Alpha.

## Operating principle

Run hard between gates. Do not ask the owner to manage routine engineering. Escalate only when
the boundary actually requires human authority. The owner is the operator/test pilot; Claude
Code is the implementation engineer. Build the first convincing FIELD version of BEYOND.
Preserve the machine. Make the cockpit unmistakably BEYOND.
