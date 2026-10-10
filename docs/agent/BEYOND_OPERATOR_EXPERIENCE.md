# BEYOND-wide operator experience migration

Status: **ACTIVE DESIGN CONTRACT — no production behavior change in this objective**

## Authorization and outcome

On 2026-10-09 Gavin reviewed the BEYOND Insights Phase A prototype, agreed that its operator-console
experience should become BEYOND's system-wide direction rather than a BODY-only treatment, and
directed Codex to make it happen and start. BODY Daily Health Record landed first in PR #212.

This objective turns that direction into one reusable visual and interaction contract before later
production stages touch TODAY, TRAIN, or MORE. The outcome is a coherent BEYOND system that presents
current state first, immediate operation second, supporting evidence third, and machinery/history
only on deliberate inspection.

## Risk, baseline, ownership

- **Lane:** PROTECTED. This document defines a future primary-information-architecture migration,
  even though this first objective changes documentation only.
- **Starting commit:** `c0f0d3c1c171aa0aac301141e3ea4c1e5e7a2d47`, freshly verified master,
  the owner-approved merge of BODY Daily Health Record PR #212.
- **Builder:** Codex.
- **Branch:** `codex/beyond-design-system`.
- **Active PR:** [#213](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/213).
- **Overlap:** prototype PR #204 remains an isolated laboratory and is not modified or integrated.

## Experience contract

Every primary surface uses the smallest applicable sequence:

1. **IDENTIFY** — screen name and one plain-language purpose line.
2. **ORIENT** — date, phase, record state, or other authoritative operating context.
3. **KNOW** — the few facts that change understanding or the next decision.
4. **ACT** — the most common truthful operation, normally one deliberate interaction.
5. **INSPECT** — provenance, alternatives, trends, corrections, and history on demand.
6. **RETURN** — preserve context and return cleanly to the operating surface.

This is a hierarchy, not a mandatory stack of panels. Empty, unknown, loading, recovery, correction,
and resumed states follow the same truth order. No screen becomes a generic dashboard or card wall.

### Shared visual grammar

- Black-dominant negative space, typography-led hierarchy, one existing BEYOND red, sharp frame
  lines/cut corners, controlled asymmetry, and minimal ornament.
- Large screen identity; compact uppercase labels only where they improve scanning; readable body
  copy and values at phone sizes.
- Bordered metric pairs/matrices for a small set of related read-only facts. A metric cell is not a
  universal component and does not force unrelated domains into identical layouts.
- Explicit verbs such as `INSPECT`, `VIEW TREND`, `WHY`, `CORRECT`, and `RETURN`; stable
  vocabulary and supported SVG glyphs.
- Progressive disclosure is closed by default when content is supporting evidence. Required,
  safety-relevant, or frequently used operation is never hidden merely to make a screen look calm.
- Motion remains finite, restrained, 150–250 ms, interruption-safe, and instant under reduced
  motion. Haptics confirm meaningful state change, never ordinary touch.
- Existing four-tab navigation remains. Active-tab treatment may use the existing red directionality;
  operational RED illumination remains reserved for earned RED/critical state.

### Authority and truth

- The deterministic Engine remains the sole recommendation authority.
- Visual prominence never invents urgency, ranking, inference, completion, or a recommendation.
- Facts retain lived-day ownership, source, recency, uncertainty, correction routes, and provenance
  where applicable.
- Read-only summaries derive from canonical application queries. UI never creates a second history,
  score, event store, or direct persistence path.
- Missing data is stated honestly; it is not estimated to complete a visual composition.
- Gavin remains the final authority. No automatic merge, navigation replacement, or destructive
  migration follows from this contract.

## Preservation matrix

Every later implementation stage must prove that it preserves:

- local-first and offline-first operation, IndexedDB ownership, backups and historical restore;
- existing records, immutable event/correction semantics, undo windows, drafts, duplicate guards,
  exactly-once writes, recovery, resumption, and focus return;
- application/domain/Engine/persistence boundaries and existing recommendation/WHY provenance;
- TODAY / TRAIN / BODY / MORE navigation, Burden Meter, System Status, schedule/shift context,
  meals, hydration, sleep, weight, workouts, obligations, Weekly, search, findings and history;
- no-shame language, manual routes, accessible contrast, 44 px controls, keyboard/screen-reader
  semantics, reduced motion, and 320/360/412 px operation;
- owner merge authority, independent exact-head review for Protected work, and green required CI.

## Staged production sequence

1. **BODY Daily Health Record — complete in PR #212.** Use field experience to refine the grammar.
2. **Shared shell and primitives.** Extract only patterns proven by BODY; no behavior relocation.
3. **TODAY command surface.** Integrate the grammar with State Rail, one Engine recommendation,
   immediate action, context and inspectable intelligence. This is a separate Protected objective.
4. **TRAIN operating surface.** Prescription/action first; progress and history inspectable; preserve
   active-workout continuity and A/B/C authority.
5. **MORE and cross-system depth.** Group system/configuration/history tools without hiding recovery,
   correction, backup or manual control.
6. **Consolidation.** Remove genuinely superseded presentation code only after reachability,
   compatibility, phone use and field evidence pass.

Each production stage receives its own bounded brief and owner-approved Protected scope before code.
Do not treat this sequence as permission to implement all stages at once.

## Active stage 2 brief — shared shell and primitives

Gavin approved this bounded Protected objective on 2026-10-09 after PR #213 merged. Starting
commit: `61b27232881f246c3e0038c9a8b1492a76b3dace`. Builder: Codex; branch
`codex/operator-shell-primitives`; merged as PR #214.

Scope is presentation-only extraction of patterns already proven in BODY: one shared primary-
surface identity frame and a narrowly constrained read-only fact matrix. Existing primary screens
may adopt the identity frame only where it preserves their exact heading, glyph, focus behavior,
order and layout. BODY's canonical daily overview may adopt the fact matrix without changing its
queries, values, labels, state or disclosure behavior. BUILD OWNED the small connective React/CSS;
REUSE the locked pilot glyphs, typography and existing BODY grammar; add no dependency.

Excluded: redesigning TODAY, TRAIN or MORE; new navigation, context, facts, inference, ranking,
urgency or actions; generic cards or mandatory cross-domain layouts; behavior relocation; Engine,
application, domain, persistence, events, schemas, backup, fixtures, dependencies, CI, prototype
integration, deployment or merge. Later stages remain separately owner-approved Protected work.

Acceptance: exact presentation/accessible-name/focus parity at adopted call sites; long truthful
values at 320/360/412 px without horizontal overflow; accessible contrast and semantics; reduced
motion introduces no animation; BODY behavior regressions, architecture, TypeScript, production
build, risk/whitespace checks, green required CI and independent exact-head review. Gavin retains
final merge authority.

## Active stage 3 brief — TODAY-OPERATOR-001

Gavin explicitly approved this bounded Protected command-surface transformation on 2026-10-09.
Starting commit: `1d83756b2ba971144365714d7450fb1091b9f2dc`, freshly fetched master and
the verified merge of shared-primitives PR #214. Builder: Codex; branch
`codex/today-operator-001`; merged as PR #215. PR #204 remains an isolated prototype and supplies no
production architecture, records, sample values or behavioral authority.

Outcome: TODAY becomes BEYOND's primary operator command surface, answering what is happening,
what BEYOND truthfully knows, what its deterministic Engine recommends, what the operator can do
now and where supporting intelligence lives. Its conceptual order is IDENTIFY → ORIENT → KNOW →
ACT → INSPECT → RETURN, expressed as one responsive journey rather than six mandatory panels.

Scope: reorganize TODAY's existing presentation around current phase/context, System Status and
capacity, one canonical recommendation with existing WHY/provenance, foreground operation or most
useful existing action, earned Attention, phase rows and deliberate access to all other tools.
Reuse `OperatorHeader`, current components, canonical application reads and commands, existing
status/recommendation/attention rules and the approved black/charcoal/one-red grammar. BUILD OWNED
only the connective React/CSS and focused regression evidence; add no dependency or design system.

Protected exclusions: no Engine, priority, recommendation or command semantic change; no new
score, fact, inference, urgency, event, domain model, schema, persistence, backup or fixture; no
TODAY/TRAIN/BODY/MORE navigation change; no prototype integration; no removal of schedule/shift,
Burden Meter, check-in, recovery, Minimum Day, workout, obligation, capture, meal, hydration,
sleep, history, manual control, correction, undo, draft or failure-recovery access; no CI,
protection, deployment or merge. A capability may move in the visual reading order only when its
meaning, command, confirmation, focus/resumption and reachability remain intact.

Acceptance: truthful GREEN/AMBER/RED/NO READ and missing/stale/error states; NO ACTION REQUIRED;
active recommendation and WHY; foreground and manual actions with confirmation and duplicate
guards; loading/failure/retry; navigation/focus return; existing records and offline built-PWA
operation; accessible semantics/contrast, reduced motion and 320/360/412 px containment. Run
affected and full regression, architecture, TypeScript, production build, whitespace and risk
checks; capture synthetic mobile evidence; require green exact-head CI and an independent
exact-head PASS before Gavin's separate merge decision.

## Active stage 4 brief — TRAIN-OPERATOR-001

Gavin explicitly approved proceeding with this bounded Protected stage on 2026-10-10. Builder:
Codex, sole implementation Builder; branch `codex/train-operator-001`; [PR #216](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/216). Fresh starting
master: `173b9f930764e99b7d03d36d14d21aa4f3f57a49`, the verified merge of PR #215. The initial
working tree was clean. Public GitHub inspection showed only isolated prototype PR #204 open;
its code and synthetic data are excluded. GitHub API inspection initially failed with network
Forbidden; subsequent live API requests and PR creation succeeded after environment draft
network corrections. Required exact-head CI remains a separate verified delivery gate.

Outcome: a cohesive mobile-first TRAIN journey from preparation through recording, continuation,
completion, inspection and return. Prescription/action lead; canonical progress is immediately
understandable; progression, alternatives and history stay deliberately inspectable. Reuse
`OperatorHeader`, `CommandSurface`, `ReadoutGrid`, existing disclosure patterns and the approved
black/charcoal/one-red grammar. BUILD OWNED the small domain-specific presentation composition;
STANDARDIZE on native disclosures; add no dependency, design system or commodity infrastructure.

Scope: reorganize existing TRAIN presentation, small scoped styles, truthful read/loading/failure
feedback, focused regression evidence and actual synthetic mobile screenshots. Preserve A/B/C
authority, prescribed/performed sets, progression advisories, active workout/resumption, Gym Mode,
rest, substitution, manual controls, finish confirmation, undo/corrections, records and history.
Do not change Engine/recommendation or command semantics, domain/schema, persistence, backup,
events, primary navigation, dependencies, protected fixtures, CI/protections, prototype code or
deployment. No merge is authorized. Improvements crossing those boundaries require a separate
Gavin decision, not silent implementation.

Acceptance: normal/empty/active/interrupted/resumed/completed/partial/recovery and read/write
failure/retry states; canonical authority and exactly-once recording; keyboard/focus return,
accessible semantics/contrast, reduced motion, offline built-PWA resumption and recording, and
320/360/412 px containment. Run focused and full regression, architecture, TypeScript, production
build, whitespace and baseline risk checks. Capture actual mobile evidence. Delivery stops for
independent exact-head review, successful required CI and Gavin's separate merge decision.

## Active stage 5 brief — MORE-OPERATOR-001

Gavin approved this bounded Protected stage on 2026-10-10, without merge authorization.
Builder: Codex, sole implementation Builder; branch `codex/more-operator-001`; PR pending.
Starting freshly fetched master: `d3386f3d9901e0fa41a10f03e5dc4536578ebc96`, verified
PR #216 merge. Working tree was clean; only isolated prototype PR #204 was open, untouched.

Outcome/scope: a mobile control center over every existing MORE capability, with clear identity,
records/planning/training groups, direct recovery access, secondary configuration disclosure,
truthful diagnostics and retained menu context/focus on return. Reuse OperatorHeader, canonical
queries, existing destinations/settings and command paths. BUILD OWNED domain-specific composition;
STANDARDIZE native disclosure/focus; no dependency, generic card system or invented intelligence.

Exclusions: Engine/recommendations, application commands, events, domain/schema, persistence,
backup formats/restore semantics, primary navigation, protected decisions, dependencies, fixtures,
CI/protections, prototype integration, deployment or merge. No capability removal; recovery,
corrections/history, manual operation, workout continuity and offline ownership stay intact.

Acceptance: all destination/settings/recovery reachability; inspection/return/focus and local draft
continuity; missing/loading/error/read retry; backup/restore confirmations and records unchanged;
keyboard, WCAG AA, reduced motion, 320/360/412 px and production PWA offline operation.
Run focused/full regression, architecture, TypeScript/build, documentation links, whitespace and
baseline risk classification; capture actual synthetic mobile evidence. Delivery stops for green
required exact-head CI, independent review and Gavin's separate merge decision.

## Acceptance for this contract objective

- Doctrine, Product Direction, UX decisions, BODY PR #212, current screen architecture and prototype
  evidence are reconciled without silently changing locked behavior.
- The contract defines reusable hierarchy, visual semantics, preservation requirements, risks,
  rollout order and per-stage approval boundaries.
- No production source, Engine, domain, application, persistence, schema, backup, dependency,
  protected fixture, CI, repository protection, prototype or deployment changes.
- Documentation links resolve, whitespace is clean, risk classification is Protected, required CI
  is green, and an independent exact-head review records PASS before owner merge approval.

## Known risks to carry forward

Dense metric layouts must survive real values and large text; disclosure must not bury operation;
red must retain semantic authority; shared components must not erase domain differences; staged
visual work must not become behavioral migration by accident; prototype sample values and temporary
interactions must never enter canonical data or rules.
