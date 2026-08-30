---
id: TODAY-006
baseline: 4fd9c2412df473ace7d2953de0d1970fa6fb40f9
risk_tier: ROUTINE
---

# TODAY-006 // SUIT FIELD CONSOLIDATION

## Mission

Make the real TODAY screen take a large, unmistakable visual step toward the approved BEYOND
FIELD prototype reference (Batman Beyond suit software) while preserving the operational truth
and FIELD loop proven by TODAY-005 (QUIET → EARNED OPERATION → TRUTHFUL ACTION → MECHANICAL
CONFIRMATION → RECEDE → QUIET). This is a large, ambitious visual-convergence Drop, not another
small polish pass — the before/after difference should be obvious without reading the changelog.

## Approved baseline

`origin/master` at `4fd9c2412df473ace7d2953de0d1970fa6fb40f9`, independently verified via
`git fetch origin master && git rev-parse origin/master` before worktree creation.

## Risk classification

ROUTINE. Bounded UI/presentation and test change reusing existing application commands,
semantic primitives, attention policy, and motion tokens. No Engine, domain, persistence,
recommendation, or dependency changes. None of the Architectural or High-Risk triggers apply.

## Visual convergence target

The owner supplied one approved reference image (a set of mobile mockup frames) as the primary
visual convergence target — not loose inspiration. Its strongest qualities to preserve: near-black
operational field; sharp restrained geometry; strong large-type hierarchy; deliberate negative
space; structural rails/seams/cuts and instrument regions rather than stacks of cards; scarce
earned red; clear ORIENT → OPERATE → SUPPORT composition; one obvious field owner; compact
context; mechanically quiet (non-celebratory) confirmations; resolved information physically
receding; stable mobile navigation; meaningful Batman Beyond identity; a coherent BEYOND glyph
language; dense technical depth only when explicitly opened.

Explicitly avoid: generic SaaS/mobile-app styling; dashboard-card soup; cyberpunk HUD clutter;
fake telemetry; decorative coordinates; gratuitous hex grids/scan lines; gradients/glassmorphism;
glowing gamer UI; decorative bats; red as a generic CTA color; animation whose only purpose is
decoration. The Bat symbol/iconography may appear only where it has stable semantic meaning.
Where the prototype shows information current BEYOND truth does not actually possess, the visual
idea is adapted to truthful available data rather than manufactured.

## Authorized scope

- Substantially recompose TODAY's presentation: hierarchy, spacing, section structure,
  typography scale, rails/seams/cuts, semantic instrument regions, status/identity presentation,
  subordinate Support presentation, existing semantic surface styling, bottom-of-screen rhythm
  where TODAY owns it, meaningful icon/glyph treatment, mechanical state transition presentation.
- Evolve existing reusable UI primitives where doing so clearly creates a reusable FIELD visual
  grammar for subsequent TRAIN/BODY migration (not part of this Drop). Prefer recomposition and
  reuse over parallel components.
- Build on TODAY-005's quiet-field structure, subordinate Support treatment, `FieldDisclosure`,
  hydration quick actions, and canonical FIELD recession behavior — do not reimplement or bypass
  it.
- Aggressively apply progressive disclosure ("preserve the capability, remove the obligation")
  to Support so it no longer looks equally important merely because the capability exists.
- Reduce explanatory prose in the ordinary FIELD posture where the interface already communicates
  meaning, without deleting necessary safety/consequence/uncertainty language or altering
  underlying product semantics.
- Targeted TODAY/UI/browser test updates; narrow shell/global CSS styling only where genuinely
  required for TODAY convergence.

## Explicit exclusions

- No Engine, recommendation-priority, command/event contract, persistence, schema/migration,
  correction/history-semantic, domain-truth, fixture-compatibility, or dependency changes.
- No second prioritization system, generalized ActiveOperation framework, Situation Assembly,
  new persisted state machine, scoring/ranking layer, or AI recommendation authority. Existing
  `attentionPolicy.ts` remains TODAY's single presentation authority.
- No synthetic state manufactured merely to reproduce a screenshot; no fake telemetry.
- No broad TRAIN/BODY visual migration in this Drop — this Drop establishes visual grammar those
  screens can inherit next, but does not touch them.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner assignment: `TODAY-006 // SUIT FIELD CONSOLIDATION`, 2026-08-29, plus one attached
  approved BEYOND FIELD prototype reference image (primary visual convergence target).
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`, `docs/UX_DECISIONS.md`.
- `docs/agent/drops/TODAY-005.md` — the FIELD quiet loop this Drop builds visual grammar around.
- Current `src/ui/screens/today/TodayScreen.tsx`, `attentionPolicy.ts`, semantic UI primitives
  under `src/ui/components`, icon/glyph implementation, `src/ui/styles/tokens.css` and
  `global.css`, and existing TODAY browser/UI tests.

## Required invariants

- Existing attention policy remains TODAY's single presentation authority; active operations
  continue to outrank passive attention; TODAY-005's quiet/earned-hydration/recession semantics
  remain intact and behaviorally unchanged (visual presentation may change substantially).
- The Engine remains the sole recommendation authority; prediction never becomes recorded fact
  without an operator action.
- No hidden gesture, auto-log, guilt, or celebratory completion behavior. Resolution de-energizes
  and surrenders the field mechanically, within existing motion and reduced-motion conventions.
- Existing navigation, offline/local-first behavior, accessibility, keyboard/focus behavior, and
  320px mobile usability remain intact.
- Every existing capability remains reachable (progressive disclosure moves things one layer
  deeper; it does not delete them).
- No visual change depends on invented domain truth.

## Acceptance criteria

1. TODAY looks substantially different from baseline at first glance; the before/after difference
   is obvious without reading the changelog.
2. The result is materially closer to the approved prototype in hierarchy, geometry, density,
   visual authority, and interaction posture (not pixel parity).
3. TODAY reads as FIELD equipment, not a dark-themed app dashboard.
4. ORIENT → OPERATE → SUPPORT is immediately legible.
5. Quiet has deliberate negative space and is not filled with low-value content.
6. One earned operation can physically own the field; Support remains available but visibly
   recedes.
7. Existing capabilities are not deleted merely to simplify appearance.
8. Red is scarce and semantic, not a generic primary-action color.
9. No fake telemetry or decorative Batman clutter is introduced.
10. TODAY-005 quiet/hydration/recession semantics remain intact; Engine/application/persistence
    authority unchanged; 320px remains usable; accessibility/focus/reduced-motion intact.
11. If the visual improvement requires an explanation when looking at before/after screenshots,
    the Drop is not ambitious enough.

## Required verification

- `npm run check:risk 4fd9c2412df473ace7d2953de0d1970fa6fb40f9`.
- Focused TODAY/UI/browser tests, then full `npm run verify`.
- `git diff --check`.
- Direct responsive browser inspection: quiet state, one earned-operation state, support/depth
  disclosure, 320px (quiet and active), resolved/recession state, reduced motion where supported.
- Reproducible before/after evidence: baseline master vs. TODAY-006 candidate vs. approved
  prototype.

## Builder expectations

- Work only in the isolated `claude/today-006-suit-field-consolidation` branch/worktree cut from
  the exact baseline above.
- Optimize for the largest safe perceptual convergence this bounded TODAY presentation Drop can
  carry, not the smallest diff.
- Implement only the authorized scope; stop on any required Engine, application-contract,
  persistence, fixture, dependency, or broader (TRAIN/BODY) product change.
- Run all required verification, open one PR, persist an exact-head Builder handoff on that PR
  (baseline, final head SHA, branch, PR, changed files, verification results, visual inspection
  evidence, known residuals, explicit statement that the Builder did not review/approve/merge its
  own work), and stop without self-reviewing, merging, closing the Drop, or starting another Drop.

## Reviewer expectations

- Review from this contract and the exact final diff in a separate read-only session.
- Verify the attention policy remains authoritative, no synthetic/invented domain truth was
  introduced, TODAY-005's loop semantics are unchanged, and the visual result genuinely converges
  toward the approved prototype rather than merely claiming to.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- Verify integration and deployment, then canonically close TODAY-006 with
  `node scripts/factory-drop.mjs close TODAY-006 --integration-sha <merge-commit-sha>` and commit
  the closure mutation. Do not begin another Drop.

## Residual findings carried from TODAY-005 (not opportunistically absorbed)

- TODAY-R01: day-transition stale-state residual (`handleStartDay` doesn't call `refresh()`,
  letting prior-day UI state bleed into a newly started day until reload).
- TODAY-R02: theoretical sub-frame double-submit race shared by several handlers' `busy` guard
  (not human-triggerable).

Report unchanged for later follow-up unless either proves severe enough to threaten data truth or
this Drop's own correctness, in which case stop and escalate.

## Stop / escalation conditions

- Stop if remote `master` moves from the approved baseline before activation, another Drop is
  active, or a Factory invariant fails.
- Stop if convergence requires Engine/recommendation semantics, application command/event
  contracts, persistence/schema/migrations, fixture compatibility, dependencies, invented domain
  truth, or any generalized framework excluded above.
- Stop on conflict between this contract and higher authority, or on ambiguity that would require
  inventing product behavior rather than adapting the prototype's visual idea to truthful data.
