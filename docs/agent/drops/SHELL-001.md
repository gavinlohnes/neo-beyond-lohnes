---
id: SHELL-001
baseline: 591c1b5be3dfad3b5a52500ac48b5c4b4aa6c6d0
risk_tier: ROUTINE
---

# SHELL-001 // SUIT SYSTEM CONSOLIDATION

## Mission

Consolidate the application shell so TODAY, TRAIN, BODY, and MORE feel like one coherent Batman
Beyond suit system — connected through navigation, system identity, glyph language, shared
geometry, and typography — rather than three newly-FIELD-migrated screens sitting inside a
generic mobile-app frame. Not a redesign of TODAY/TRAIN/BODY/MORE; the shared-system pass around
work already done in TODAY-006 and FIELD-001.

## Approved baseline

`origin/master` at `591c1b5be3dfad3b5a52500ac48b5c4b4aa6c6d0`, independently verified via
`git fetch origin master && git rev-parse origin/master` before worktree creation.

## Risk classification

ROUTINE. Bounded UI/presentation and test change to the application shell (navigation, header
identity, icon documentation) reusing existing primitives. No Engine, domain, persistence,
recommendation, or dependency changes.

## Visual convergence target

The owner-approved six-phone BEYOND FIELD reference remains the primary visual convergence
target, specifically its shell/system traits: near-black field, alignment rails, sharp cuts,
restrained red, coherent glyph treatment, stable bottom navigation, and distinct Field vs. System
information layers.

## Authorized scope

- Application shell/root (`src/app/App.tsx`): bottom navigation, shared shell chrome.
- Icon/glyph implementation (`src/ui/icons/Icon.tsx`): audit and documentation consolidation,
  reusing the existing locked pilot family — no new glyphs invented.
- Shared FIELD/system styles (`src/ui/styles/global.css`): a named shell-navigation primitive
  extracted from inline styles; no change to any TODAY-006/FIELD-001-scoped rule.
- Narrowly necessary MORE integration: the same `.field-header` identity treatment
  TODAY/TRAIN/BODY already carry, applied to MORE's own top-level MENU header only — no MORE
  information-architecture, operational-zone, or Restore/Backup/Evidence/System behavior change.
- Shell/navigation/glyph/accessibility tests.
- Factory Drop artifacts required by repository procedure.

## Explicit exclusions

- No Engine, recommendation-priority, command/event contract, persistence, schema, or
  correction/history-semantic changes; `attentionPolicy.ts` untouched.
- No redesign of TODAY, TRAIN, BODY, or MORE's own compositions/information architecture.
- No new dependency, backend/account system, dashboard framework, or generalized UI platform.
- No routing-architecture rewrite (current routing is not blocking the authorized visual target).
- No decorative Batman imagery, gradients/glassmorphism, glow effects, or red-as-generic-CTA/nav
  color.
- No removal of any text label where clarity requires it.
- No new haptics.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Emblem/glyph system-identity resolution (owner ruling, 2026-08-31 — supersedes original framing)

**Correction:** this section originally claimed the diamond motif shared by the locked pilot icon
family was itself "BEYOND's one stable system-identity glyph." Direct owner ruling, 2026-08-31,
retires that framing. It is corrected here rather than silently rewritten to a new claim with no
trace of the change, per this repo's own "corrections supersede, they never overwrite" discipline
(`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`).

The Batman Beyond bat symbol / a future dedicated machine emblem is not introduced as new artwork
in this Drop, and never was. What changes is what the diamond is understood to be. The governing
split, going forward, tracks the constitutional doctrine's own framing
(`docs/OPERATOR_INTERFACE_DOCTRINE.md`, "The Bat identifies the machine. BEYOND's language
operates it."):

- **EMBLEM = THE MACHINE.** A single dedicated machine-identity mark is BEYOND's system identity.
  It does not exist yet. It is explicitly out of scope for this Drop and must not be invented,
  traced, approximated, or introduced as placeholder artwork here — no `Emblem.tsx`, no
  substitute diamond standing in for it, no new PWA emblem artwork.
- **GLYPHS = THE INSTRUMENTS.** The universal/core diamond is retired as BEYOND's system identity.
  TODAY/TRAIN/BODY/MORE's existing locked pilot icon family (`src/ui/icons/Icon.tsx`) remains
  exactly what it already is and stays the existing locked instrument family: destination
  glyphs, geometry frozen, not redesigned or reinterpreted by this correction. Each icon's own
  outer silhouette is what "the glyph system operates" through, applied consistently via every
  screen's own `.field-header` (each leading with exactly its own nav tab's icon) — one coherent
  instrument meaning, never a claim of machine identity, never decorative repetition.

This Drop leaves a clean, explicit future integration seam for the machine emblem — see "Deferred
to future machine-emblem integration" below — but adds no placeholder emblem and no substitute
diamond in its place. See `docs/UX_DECISIONS.md` ("System identity — EMBLEM vs. GLYPHS split")
for the durable Decision Register entry.

## Deferred to future machine-emblem integration

Not part of this Drop; recorded here so a future emblem Drop has an exact, minimal seam instead
of having to re-derive one:

- `src/ui/icons/Icon.tsx` and the `TAB_ICON` map in `src/app/App.tsx` are destination-glyph-only
  and are not where a machine emblem belongs — do not repurpose them.
- A future emblem Drop's own task contract must name its exact placement (e.g. a splash/identity
  surface distinct from the four destination tabs) as a locked product decision before
  implementation — this Drop does not pre-select one.
- `vite.config.ts`'s `VitePWA` manifest `icons` array and `public/icons/icon-192.png` /
  `icon-512.png` are the current placeholder PWA install icons; regenerating them from the
  approved emblem source (once one exists) is that future Drop's first mechanical step.
- `index.html`'s `<link rel="icon">` only needs updating if the favicon itself (not just PWA
  install icons) is meant to carry the emblem.
- No shell/global.css class in this Drop reserves visual space for an emblem — none should be
  added until the emblem and its placement are both approved, so this correction introduces no
  placeholder geometry a real emblem would later have to fight or replace.

## Relevant authority / references

- Direct owner assignment: `SHELL-001 // SUIT SYSTEM CONSOLIDATION`, 2026-08-30, plus the same
  approved six-phone BEYOND FIELD prototype reference image used for TODAY-006/FIELD-001.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`, `docs/OPERATOR_INTERFACE_DOCTRINE.md`,
  `docs/UX_DECISIONS.md`.
- `docs/agent/drops/TODAY-006.md` and `docs/agent/drops/FIELD-001.md` — presentation context only.
- Current `src/app/App.tsx`, `src/ui/icons/Icon.tsx`, `src/ui/styles/global.css`, and current
  TODAY/TRAIN/BODY/MORE screens as needed to understand shell behavior.

## Required invariants

- Existing Engine/recommendation/attentionPolicy authority unchanged.
- Navigation remains predictable: stable tab order, no dynamic reordering, no hiding of normal
  navigation.
- Red remains scarce/earned (active-tab indication only — an existing, already-locked semantic
  use, not a new generic decoration).
- WCAG AA contrast, visible focus, semantic navigation, touch target size (≥44px), keyboard
  operation, reduced-motion behavior, and 320px layout integrity preserved or improved; no
  opacity-based recession introduced.
- No fake telemetry, invented system state, or decorative Bat imagery.

## Acceptance criteria

1. The before/after shell difference is obvious at first glance — Gate 1.
2. Blur test (Gate 2): with text blurred, TODAY/TRAIN/BODY/MORE still read as four surfaces of
   one suit system via shared geometry, navigation, glyph placement, and hierarchy.
3. Identity test (Gate 3): the shell reads substantially closer to Batman Beyond suit software
   than a generic mobile-app frame, from system grammar, not decoration.
4. No TODAY-006/FIELD-001 regression from shared shell changes.
5. 320px usable with no horizontal clipping; accessibility/keyboard/focus/reduced-motion intact.
6. Nav remains muscle-memory stable: same four destinations, same order, same aria-current/touch
   target/selection-cue behavior already locked by `tests/browser/App.test.tsx`.

## Required verification

- `npm run check:risk 591c1b5be3dfad3b5a52500ac48b5c4b4aa6c6d0`.
- Focused shell/navigation/glyph/accessibility tests, then full `npm run verify`.
- `git diff --check`.
- Direct responsive browser inspection: navigation across all four tabs, MORE's header, TODAY/
  TRAIN/BODY regression spot-check, 320px, reduced motion.

## Builder expectations

- Work only in the isolated `claude/shell-001-suit-system-consolidation` branch/worktree cut from
  the exact baseline above.
- Implement only the authorized scope; stop on any required Engine, application-contract,
  persistence, fixture, dependency, or broader (TODAY/TRAIN/BODY/MORE redesign) change.
- Run all required verification, open one PR, persist an exact-head Builder handoff on that PR,
  and stop without self-reviewing, merging, closing the Drop, or starting another Drop.

## Reviewer expectations

- Review from this contract and the exact final diff in a separate read-only session.
- Verify the shell genuinely clears Gates 1/2/3, TODAY-006/FIELD-001 are unregressed, nav
  stability/accessibility hold, and the Bat/system-identity resolution is coherent (one meaning,
  no new decorative imagery).
- Persist exact-head-bound review evidence with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- Verify integration and deployment, then canonically close SHELL-001 with
  `node scripts/factory-drop.mjs close SHELL-001 --integration-sha <merge-commit-sha>` and commit
  the closure mutation. Do not begin another Drop.

## Stop / escalation conditions

- Stop if remote `master` moves from the approved baseline before activation, another Drop is
  active, or a Factory invariant fails.
- Stop if convergence requires Engine/recommendation semantics, application command/event
  contracts, persistence/schema/migrations, fixture compatibility, dependencies, invented domain
  truth, or any generalized framework excluded above.
- Stop on conflict between this contract and higher authority, or on ambiguity that would require
  inventing product behavior rather than adapting truthful, already-implemented shell grammar.
