---
id: FIELD-PROTOTYPE-001
baseline: bdcf07cf0ed70cf3f0bd7f31c67cb2b30e470986
risk_tier: ROUTINE
---

# FIELD-PROTOTYPE-001 // FINAL CONVERGENCE PASS

## Mission

Converge the real working BEYOND application further toward the owner-approved three-image FIELD
prototype reference set (the six-phone FIELD sheet plus the two BEYOND system-identity/glyph
sheets), so the running application unmistakably reads as the same machine at phone scale. This
is a bounded fourth convergence pass following TODAY-006 (TODAY), FIELD-001 (TRAIN+BODY), and
SHELL-001 (shell/navigation/MORE header) — those three Drops already closed most of the structural
gap; this Drop closes the specific, concrete gaps that remain after a direct baseline-vs-reference
audit, not a redesign from scratch.

## Approved baseline

`origin/master` at `bdcf07cf0ed70cf3f0bd7f31c67cb2b30e470986`, independently verified via
`git fetch origin master && git rev-parse origin/master` before worktree creation (SHELL-001's own
closure commit).

## Risk classification

ROUTINE. Bounded UI/presentation change reusing existing application queries, semantic primitives,
and tokens. No Engine, domain, persistence, recommendation, or dependency changes. None of the
Architectural or High-Risk triggers apply.

## Visual convergence target / audit findings

Direct comparison of the running baseline app (both viewport widths, quiet/earned/checked-in
states across TODAY, TRAIN, BODY, MORE) against the three attached reference images found:

- **TODAY, TRAIN, MORE header/nav, and glyph geometry are already substantially converged** by the
  three prior Drops — `.field-header`, `.section-label--field` (ORIENT/OPERATE), `.command-surface`
  (the one dominant earned-decision surface), `.field-note` (the restrained, deliberately
  once-only corner-bracket "instrument reading" callout), and the segmented `.shell-nav` belt all
  already exist and already match the reference's structural ideas. Re-litigating any of these
  (e.g. loosening `.command-surface` to a plainer card, or repeating `.field-note` per-row) would
  contradict their own carefully-reasoned, already-locked doctrine comments in `global.css` for no
  reference-fidelity gain — the reference images are composition/character authority, not literal
  pixel specs, and existing restraint doctrine outranks matching a concept image line-for-line.
- **Genuine, still-open gap 1 — BODY's STATUS instrument-cluster (`instrument-cluster` /
  `.status-value`) breaks the reference's compact single-line stat-tile character.** The no-data
  fallback ("Not logged") wraps to two lines at the existing bold stat-value scale, which reads as
  a layout defect next to the reference's compact, single-line stat tiles (198.6 LB / 72% / 6h52m /
  2/5) — see `src/ui/screens/body/BodyScreen.tsx` lines ~732-749 and the baseline screenshot
  (`baseline-body-390.png`). This is a pure typography/density fix, applies uniformly to all four
  peer tiles (WATER/SLEEP/WEIGHT/PROTEIN — no peer-hierarchy change), and needs no new data.
- **Genuine, still-open gap 2 — no mechanical progress-toward-target instrumentation anywhere**,
  the reference's single clearest recurring instrument idea (the AT WORK/HYDRATE phone's circular
  12oz/40oz gauge). A full circular SVG gauge is a bigger, riskier new-primitive build than this
  Drop should carry, and BODY's own STATUS cluster explicitly must not show one tracker "more
  instrumented" than its three peers (`BodyScreen.tsx`'s own "peer subsystems... marking any single
  one of them as 'the leader' would manufacture a hierarchy that doesn't exist" comment, ~lines
  717-723) — so a target-relative bar must never appear in that cluster. It CAN appear truthfully,
  without inventing anything or violating peer-parity, on TODAY's own single-subsystem Minimum Day
  hydration surfaces, which already carry a real, already-computed target
  (`MINIMUM_DAY_HYDRATE_OZ = 40` in `src/application/queries.ts`) and a real current total
  (`minimumDayHydrateOz` / `getEffectiveHydrationTotal`) — nothing here is fabricated, and the bar
  only ever renders when Minimum Day is genuinely enabled for the active day (never a general
  "daily hydration goal" claim BEYOND doesn't actually make).

## Authorized scope

- A new small, shared, reusable mechanical progress-fill primitive (`.field-progress`, restrained:
  a single thin bar, one existing accent color, `role="progressbar"` with real
  `aria-valuenow`/`aria-valuemin`/`aria-valuemax`) in `src/ui/styles/global.css`, plus a minimal
  presentational helper if needed — no new dependency, no new chart/gauge library.
- Export the existing `MINIMUM_DAY_HYDRATE_OZ` constant (or an equivalent accessor) from
  `src/application/queries.ts` so the UI reuses the one real threshold rather than duplicating the
  literal `40` as a second, independent source of truth.
- Apply `.field-progress` to TODAY's Minimum Day hydration surfaces only
  (`renderHydrationOperation`'s card and the Minimum Day checklist's hydrate row in
  `src/ui/screens/today/TodayScreen.tsx`) — rendered only when Minimum Day is enabled for the
  active day, using the real total/target already computed there.
- Fix BODY's `instrument-cluster`/`.status-value` no-data-fallback wrapping so all four peer tiles
  render compactly on one line at 320px and 390px, uniformly (no per-tile treatment change) —
  `src/ui/styles/global.css` and/or `src/ui/screens/body/BodyScreen.tsx`.
- Directly associated test updates (`tests/browser/*`, `tests/integration/*` for the exported
  constant) needed to keep existing coverage accurate for these two changes.
- Factory Drop artifacts required by repository procedure.

## Explicit exclusions

- No Engine, recommendation-priority, command/event contract, persistence, schema, or
  correction/history-semantic changes; `attentionPolicy.ts` untouched.
- No change to `.command-surface`, `.field-header`, `.shell-nav`, `.field-note`, ORIENT's
  `.status-strip`, or any other already-converged element from TODAY-006/FIELD-001/SHELL-001.
- No literal circular/radial gauge graphic, no new SVG geometry beyond the one simple horizontal
  fill bar described above.
- No progress/target accent anywhere inside BODY's STATUS `instrument-cluster` (would break its
  documented peer-subsystem parity).
- No new machine-emblem artwork, no Bat silhouette, no placeholder identity mark — EMBLEM
  integration remains deferred per `docs/UX_DECISIONS.md` ("System identity — EMBLEM vs. GLYPHS
  split") and `docs/agent/drops/SHELL-001.md`. No change to `Icon.tsx` glyph geometry.
- No fake telemetry, invented trend/recovery data, food photography/illustration, or any numeric
  target not already truthfully computed by existing application queries.
- No full-screen dedicated "operation view" navigation/routing rework (the reference's MEAL
  1/BAT-CONFIRM full-screen patterns) — real architectural scope beyond this bounded pass; recorded
  as a residual, not absorbed here.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner assignment: `BEYOND FIELD PROTOTYPE — FINAL CONVERGENCE`, 2026-09-01, plus the
  three attached reference images (six-phone FIELD sheet; two BEYOND system-identity/glyph sheets).
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`, `.claude/skills/beyond-drop/SKILL.md`.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md`, `docs/UX_DECISIONS.md` (including the EMBLEM/GLYPHS split
  and "Explicitly out of scope: Trend charts").
- `docs/agent/drops/TODAY-006.md`, `FIELD-001.md`, `SHELL-001.md` — the three prior convergence
  passes this Drop extends; their own locked doctrine comments in `global.css` govern what is
  already settled and out of bounds here.
- Current `src/ui/screens/today/TodayScreen.tsx`, `src/ui/screens/body/BodyScreen.tsx`,
  `src/ui/styles/global.css`, `src/application/queries.ts` (`getMinimumDayStatus`,
  `getEffectiveHydrationTotal`).

## Required invariants

- Existing Engine/recommendation/attentionPolicy authority unchanged; Minimum Day semantics
  (`getMinimumDayStatus`, the six-item baseline) unchanged — only a truthful read of already-real
  values feeds the new bar.
- BODY's four STATUS trackers remain undifferentiated peers; no instrumentation asymmetry is
  introduced there.
- WCAG AA contrast, visible focus, keyboard operation, touch target size (≥44px), reduced-motion
  behavior, and 320px layout integrity preserved or improved.
- No numeric target or progress value is ever displayed without a real, already-computed source.

## Acceptance criteria

1. Gate 1 (first glance): BODY's STATUS tiles read as compact single-line instrument readouts at
   both 320px and 390px, matching the reference's tile density; the Minimum Day hydration surfaces
   show a real mechanical progress-fill instrument where they previously showed plain text only.
2. Gate 2 (blur): unaffected — no structural/compositional change to section ownership.
3. Gate 3 (same machine): the new progress-fill instrument reads as suit equipment (thin bar,
   restrained accent, mechanical) not a consumer-app loading bar or gamified meter.
4. Gate 4 (FIELD beats chrome): unaffected — no shell/nav change.
5. Gate 5 (320px): no horizontal overflow, no touch target regression, no text below 16px.
6. Gate 6 (restraint): no glow, gradient, scan lines, fake telemetry, or excess red — the fill bar
   uses one existing accent token, not a new color.
7. `MINIMUM_DAY_HYDRATE_OZ` has exactly one source of truth, reused by the UI, not duplicated.
8. BODY's peer-subsystem parity is unchanged — no reviewer can find a new hierarchy among
   WATER/SLEEP/WEIGHT/PROTEIN.

## Required verification

- `npm run check:risk bdcf07cf0ed70cf3f0bd7f31c67cb2b30e470986`.
- Focused TODAY/BODY/accessibility/browser tests, then full `npm run verify`
  (architecture + full test suite + production build).
- `git diff --check`.
- Direct responsive browser inspection at 320px and 390px: BODY STATUS cluster (populated and
  empty/no-data states), TODAY Minimum Day hydration card and checklist row (enabled, in-progress,
  and satisfied states), TODAY/TRAIN/MORE spot-check for regression, reduced-motion.
- Before/after screenshots plus direct side-by-side comparison against all three attached reference
  images; first-glance and blur tests performed and reported, not merely asserted.

## Builder expectations

- Work only in the isolated `claude/field-prototype-convergence` branch/worktree cut from the exact
  baseline above.
- Implement only the authorized scope; stop on any required Engine, application-contract,
  persistence, fixture, dependency, or broader (command-surface/nav/glyph) change.
- Run all required verification, open one PR, persist an exact-head Builder handoff on that PR
  (baseline, final head SHA, branch, PR, changed files, verification results, visual inspection
  evidence including gate results and reference comparison, known residuals, explicit statement
  that the Builder did not review/approve/merge its own work), and stop without self-reviewing,
  merging, closing the Drop, or starting another Drop.

## Reviewer expectations

- Review from this contract and the exact final diff in a separate read-only session.
- Verify BODY's peer-subsystem parity genuinely holds, the progress bar's target/total are real
  (not invented), `.command-surface`/`.field-header`/`.shell-nav`/`.field-note`/glyph geometry are
  untouched, and the visual result genuinely converges toward the approved references rather than
  merely claiming to.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- Verify integration and deployment, then canonically close FIELD-PROTOTYPE-001 with
  `node scripts/factory-drop.mjs close FIELD-PROTOTYPE-001 --integration-sha <merge-commit-sha>`
  and commit the closure mutation. Do not begin another Drop.

## Stop / escalation conditions

- Stop if remote `master` moves from the approved baseline before activation, another Drop is
  active, or a Factory invariant fails.
- Stop if convergence requires Engine/recommendation semantics, application command/event
  contracts, persistence/schema/migrations, fixture compatibility, dependencies, invented domain
  truth, a new machine-emblem asset, or any generalized framework excluded above.
- Stop on conflict between this contract and higher authority, or on ambiguity that would require
  inventing product behavior rather than adapting the reference's visual idea to truthful data.
