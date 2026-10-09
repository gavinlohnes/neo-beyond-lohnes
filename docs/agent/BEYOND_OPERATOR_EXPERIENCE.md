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
`codex/operator-shell-primitives`; PR pending.

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
