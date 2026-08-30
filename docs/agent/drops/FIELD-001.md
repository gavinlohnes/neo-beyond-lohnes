---
id: FIELD-001
baseline: f4251cf0ef9763343a7da845c2ebec3072910244
risk_tier: ROUTINE
---

# FIELD-001 // TRAIN + BODY FIELD MIGRATION

## Mission

Migrate TRAIN and BODY into the same FIELD/suit-software visual and interaction system TODAY-006
established, so TODAY, TRAIN, and BODY read as three operational surfaces of the same machine —
TODAY owns attention, TRAIN owns execution, BODY owns evidence — while preserving each domain's
truthful capabilities and authority. One substantial bounded visual migration, not two cosmetic
passes; not a redesign from scratch.

## Approved baseline

`origin/master` at `f4251cf0ef9763343a7da845c2ebec3072910244`, independently verified via
`git fetch origin master && git rev-parse origin/master` before worktree creation. This baseline
was independently confirmed Factory-closed after TODAY-006, built, and deployed live before this
Drop began.

## Risk classification

ROUTINE. Bounded UI/presentation and test change reusing existing application commands, queries,
semantic primitives, and the TODAY-006 presentation grammar. No Engine, domain, persistence,
recommendation, or dependency changes.

## Visual convergence target

The owner-approved six-phone BEYOND FIELD reference image is the primary visual convergence
target, not loose inspiration — specifically its TRAIN (lower-middle) and BODY (lower-right)
frames. Truthful production state governs composition: no fake numbers, trends, recovery state,
planned meals, invented workout state, or telemetry. Where the reference depicts information the
real application cannot truthfully establish (e.g. a 30-day recovery trend — explicitly out of
scope per `docs/UX_DECISIONS.md`), the visual idea is adapted to what BEYOND actually knows
rather than manufactured.

## Authorized scope

- TRAIN production UI (`src/ui/screens/train/TrainScreen.tsx`) and directly associated tests.
- BODY production UI (`src/ui/screens/body/BodyScreen.tsx`) and directly associated tests.
- Existing shared FIELD/UI primitives and shared styles where necessary (`src/ui/styles/global.css`),
  scoped per-screen so TODAY-006 and MORE are unaffected.
- Narrowly necessary glyph/icon presentation (reusing the existing locked pilot Icon family).
- Factory Drop artifacts required by repository procedure.
- TODAY may be inspected extensively but does not receive another visual redesign in this Drop;
  small shared-style adjustments are permitted only where required for coherent shared grammar
  and must not regress TODAY-006.

## Explicit exclusions

- No Engine, recommendation-priority, command/event contract, persistence, schema, or
  correction/history-semantic changes.
- No new recommendation authority, no AI scoring, no invented BODY intelligence or TRAIN state,
  no fake reference/trend data.
- No generalized dashboard framework, universal ActiveOperation abstraction, Situation Assembly,
  broad component-library refactor, or replacement navigation architecture.
- No dependency additions, backend/account system, or application-shell rewrite.
- No final shell/navigation convergence pass and no MORE redesign (MORE touched only for
  unavoidable shared-shell effects, if any — none anticipated).
- No removal of existing capability merely to simplify a screen; no hiding of deviations/
  corrections that preserve truthful operation.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner assignment: `FIELD-001 // TRAIN + BODY FIELD MIGRATION`, 2026-08-30, plus the same
  approved six-phone BEYOND FIELD prototype reference image used for TODAY-006.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`, `docs/UX_DECISIONS.md` (including "Explicitly out of
  scope: Trend charts").
- `docs/agent/drops/TODAY-006.md` — the presentation grammar this Drop extends, for context only.
- Current `src/ui/screens/today/TodayScreen.tsx`, `src/ui/screens/train/TrainScreen.tsx`,
  `src/ui/screens/body/BodyScreen.tsx`, shared FIELD/UI primitives, shared styles, and relevant
  TRAIN/BODY application queries/commands/tests.

## Required invariants

- Existing Engine/recommendation authority, TRAIN progression/reduced/recovery semantics, set
  logging, correction/history behavior, interruption/resumption behavior, and command boundaries
  remain unchanged.
- BODY's existing peer-subsystem doctrine (no single tracker manufactured as "the leader") remains
  intact; BODY never becomes a second recommendation authority; evidence maturity/uncertainty
  stays honest; missing data is never cosmetically converted into certainty.
- WCAG AA text contrast, keyboard operation, visible focus, semantic controls, touch target
  usability, reduced-motion behavior, and 320px layout integrity are preserved or improved — no
  repeat of TODAY-006's opacity/contrast regression.
- Red stays scarce and semantically earned; ordinary actions do not become red merely for being
  buttons.
- Shared grammar is not shared layout — TRAIN and BODY remain visibly distinct in purpose from
  each other and from TODAY.

## Acceptance criteria

1. The before/after difference is obvious at first glance for both TRAIN and BODY — Gate 1.
2. Blur test (Gate 2): with labels/text imagined blurred, TODAY/TRAIN/BODY still read as three
   surfaces of the same suit system, via composition/hierarchy/scale/footprint/negative space —
   not colors/borders/labels alone — while remaining visibly distinct in purpose.
3. TRAIN reads as execution equipment; BODY reads as evidence instrumentation — neither reads as
   a generic dashboard/management app.
4. No TODAY-006 regression from shared-style changes; TODAY's own scale is unaffected by TRAIN/
   BODY's per-screen scoped overrides.
5. 320px usable with no horizontal clipping; accessibility/keyboard/focus/reduced-motion intact.
6. No invented data anywhere in the diff.

## Required verification

- `npm run check:risk f4251cf0ef9763343a7da845c2ebec3072910244`.
- Focused TRAIN/BODY/accessibility tests, then full `npm run verify`.
- `git diff --check`.
- Direct responsive browser inspection: TRAIN normal/active-workout states at normal width and
  320px; BODY normal/nutrition-hydration/sparse-data states at normal width and 320px; TODAY
  spot-check for regression.

## Builder expectations

- Work only in the isolated `claude/field-001-train-body-migration` branch/worktree cut from the
  exact baseline above.
- Implement only the authorized scope; stop on any required Engine, application-contract,
  persistence, fixture, dependency, or broader (Engine/shell/MORE) change.
- Run all required verification, open one PR, persist an exact-head Builder handoff on that PR,
  and stop without self-reviewing, merging, closing the Drop, or starting another Drop.

## Reviewer expectations

- Review from this contract and the exact final diff in a separate read-only session.
- Verify the visual convergence genuinely clears Gates 1/2, TODAY-006 is unregressed, BODY's
  peer-subsystem doctrine holds, and no truthful-data boundary was crossed.
- Persist exact-head-bound review evidence with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- Verify integration and deployment, then canonically close FIELD-001 with
  `node scripts/factory-drop.mjs close FIELD-001 --integration-sha <merge-commit-sha>` and commit
  the closure mutation. Do not begin another Drop.

## Stop / escalation conditions

- Stop if remote `master` moves from the approved baseline before activation, another Drop is
  active, or a Factory invariant fails.
- Stop if convergence requires Engine/recommendation semantics, application command/event
  contracts, persistence/schema/migrations, fixture compatibility, dependencies, invented domain
  truth, or any generalized framework excluded above.
- Stop on conflict between this contract and higher authority, or on ambiguity that would require
  inventing product behavior rather than adapting the prototype's visual idea to truthful data.
