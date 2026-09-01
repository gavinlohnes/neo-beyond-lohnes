---
id: FIELD-ARCH-001
baseline: ccff019d7a911acdbdc80b95f4a097da1e06913a
risk_tier: ROUTINE
---

# FIELD-ARCH-001 // FIELD INSTRUMENT ARCHITECTURE

## Mission

Transform TODAY and TRAIN from well-styled dark application screens into coherent BEYOND FIELD
instrument surfaces, using the three owner-approved reference images as visual acceptance
evidence. Replace conventional component composition with coherent field-instrument architecture
while preserving the operational hierarchy and behavior already built. Per direct owner
correction: the prior FIELD-PROTOTYPE-001 conclusion that TODAY/TRAIN were "already substantially
converged" does not constrain this Drop — subsequent audit found the remaining gap is deeper than
additive polish: the references derive their character from composition first; the running
application still derives too much of its character from styled components. This Drop is
authorized to reconsider TODAY/TRAIN composition and the FIELD-context presentation of existing
primitives where a concrete, evidenced gap justifies it — not to redesign from scratch, and not to
touch anything already well-converged.

## Approved baseline

`origin/master` at `ccff019d7a911acdbdc80b95f4a097da1e06913a`, independently verified via
`git fetch origin master && git rev-parse origin/master` before worktree creation. This baseline
is FIELD-PROTOTYPE-001's own closure commit — it already contains that Drop's reviewed hydration-
instrument and BODY-tile-compactness work; this Drop incorporates it rather than replacing or
regressing it.

## Risk classification

ROUTINE. Bounded UI/presentation change reusing existing components, CSS primitives, and copy
functions. No Engine, domain, persistence, recommendation, or dependency changes. None of the
Architectural or High-Risk triggers apply.

## Audit findings (concrete, code-verified gaps — not restated prior conclusions)

Direct inspection of the actual TODAY/TRAIN source (not just rendered screenshots) found four
specific, still-open composition/hierarchy gaps, each independently verified against the file and
line it lives in:

1. **TODAY's pre-day-start state is a plain, generic `.card`.** `TodayScreen.tsx`'s own comment on
   this exact block calls it out already: "the one surviving pre-Suit block on this screen." Every
   other single-available-action moment on TODAY (an active workout, a RESET, a Minimum Day
   hydration operation) already renders through `CommandSurface`/`.command-surface` — the one
   dominant-decision-surface primitive — but the very first thing every operator sees each day
   still renders through the generic bordered-box-with-title-and-button grammar the rest of the
   screen has already moved past. This is the single most-seen, least-converged surface in the
   app.
2. **TRAIN's "NO CHECK-IN YET" nudge is the same ad hoc pattern**, `<div className="card" style={{
   borderColor: "var(--warning)" }}>` in `TrainScreen.tsx` — a plain card with an inline
   color override, the exact anti-pattern `global.css`'s own VISUAL-002 comment documents already
   being found and fixed once for the danger/red tier (`.card--warning`), never fixed for the
   warning/yellow tier this call site actually needs.
3. **TODAY's ORIENT reading renders as one flowing, uniform-scale sentence.** `.status-strip`'s
   current content (`describeContextStrip(...)` plus the capacity clause) is a single inline run,
   at the same 16px scale as ordinary body prose — no label, no headline, no visual escalation —
   immediately followed by OPERATE's own large bold `.command-title` reading. The reference's
   clearest structural idea for this exact section is a label + one bold statement + a quieter
   detail line; TODAY's own OPERATE section two inches below already does this. ORIENT is the one
   remaining place on TODAY where the physical grammar is still plain prose rather than a real
   instrument reading.
4. **TRAIN's `.field-tagline__headline` renders at exactly `.command-title`'s own 32px/700-weight
   scale** — the marketing-style strapline ("Training without guesswork.") is typographically
   indistinguishable in weight from the actual dominant session instrument directly below it,
   diluting "operations own the field, everything else earns its presence" and spending real
   vertical rhythm the reference gives to actual instrument content instead.

Not touched, and explicitly not reopened, because each is already correctly converged or
deliberately protected by its own documented reasoning verified in the source during this audit:
`.command-surface`'s fill/chamfer treatment, `.field-header`, `.shell-nav`, `.field-note`,
`SignalRow`/`.signal-row` (a widely-reused, correctly-semantic ATTENTION-tier primitive, not a
leftover), `.equipment-row` (already a partial-edge, non-boxed primitive), the OPERATION_CONFLICT
alert (`.card--warning`, already correctly semantic), `.today-support--subordinate`/`.field-recede`
(already applied on TODAY's own SUPPORT zone whenever a dominant surface exists — verified in
`TodayScreen.tsx`, not absent as initially hypothesized), `--radius: 4px` (already sharp, not
"consumer-app softness"), and BODY's own shared use of `.field-tagline`/`.instrument-cluster`
(out of scope; any TRAIN-specific change is scoped so BODY is provably unaffected).

## Authorized scope

- `src/ui/screens/today/TodayScreen.tsx`: convert the pre-day-start (`!day`) block from `.card` to
  `CommandSurface`, restructuring its existing copy into the `tool-label`/`command-title`/
  `card-body`/`btn-primary` pattern already used by every other `CommandSurface` call site — same
  meaning, same action, no new copy claims.
- `src/ui/screens/today/TodayScreen.tsx`: restructure the ORIENT `.status-strip` markup into a
  stacked label/headline/detail read using new, additive `.status-strip--stacked` /
  `.status-strip__headline` / `.status-strip__detail` classes (extending the already-established
  `.status-strip__capacity` BEM family) — same underlying facts (`describeContextStrip`,
  `describeCapacity`, the capacity dot), no new derived copy invented, no function signature
  changes.
- `src/ui/screens/train/TrainScreen.tsx`: convert the "NO CHECK-IN YET" card to use a new
  `.card--caution` class (mirroring `.card--warning`'s existing one-line pattern, using
  `var(--warning)` instead of `var(--danger)`) in place of the inline `style={{ borderColor:
  ... }}` override. Same visible color/box, real semantic class.
- `src/ui/screens/train/TrainScreen.tsx`: add a `.train-field`-scoped override for
  `.field-tagline__headline`'s type scale (matching the codebase's own established
  `.today-field .command-surface` / `.train-field .command-surface` / `.body-field
  .instrument-cluster` per-screen-scoping convention) so the tagline reads as a quiet strapline,
  not a hero headline competing with the real session instrument below it. BODY's own shared use
  of `.field-tagline__headline` is provably unaffected (different screen-root scope).
- `src/ui/styles/global.css`: the four additive classes above only (`.status-strip--stacked`,
  `.status-strip__headline`, `.status-strip__detail`, `.card--caution`, and the `.train-field
  .field-tagline__headline` scoped override) — no change to any existing class's own base rule.
- Directly associated test updates (`tests/browser/TodayScreen.test.tsx`,
  `tests/browser/TrainScreen.test.tsx` or equivalent) needed to keep existing coverage accurate for
  these four changes.
- Factory Drop artifacts required by repository procedure.

## Explicit exclusions

- No Engine, recommendation-priority, command/event contract, persistence, schema, or
  correction/history-semantic changes; `attentionPolicy.ts` untouched.
- No change to `.command-surface`'s own fill/chamfer rule, `.field-header`, `.shell-nav`,
  `.field-note`, `SignalRow`/`.signal-row`, `.equipment-row`, `.today-support--subordinate`/
  `.field-recede`, `--radius`, or any other already-converged/already-protected primitive named
  above.
- No change to `.field-tagline`/`.field-tagline__headline`'s own base rule in `global.css` (BODY
  shares it) — only a `.train-field`-scoped override.
- No BODY or MORE redesign; no glyph geometry change; no new machine-emblem artwork.
- No fake telemetry, invented state, or new numeric target not already truthfully computed.
- No reordering, hiding, or behavior change to any existing TODAY/TRAIN control, disclosure, or
  information-architecture decision (STATE INPUT, WORK CONTEXT, MINIMUM DAY, CAPTURE, BEYONDDAY,
  ATTENTION/SUPPORT placement) — composition and typography only.
- No new dependency or component framework; no rewrite from scratch.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner assignment: `FIELD-ARCH-001 // FIELD INSTRUMENT ARCHITECTURE`, 2026-09-01, plus the
  three attached reference images, plus the explicit owner correction authorizing composition
  reconsideration beyond FIELD-PROTOTYPE-001's narrower conclusion.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, `AGENTS.md`, `.claude/skills/beyond-drop/SKILL.md`.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` (typography-led hierarchy, lean silhouettes, "a complete
  rectangle must earn its existence" per the Builder brief, "operations own the field"),
  `docs/UX_DECISIONS.md`.
- `docs/agent/drops/TODAY-006.md`, `FIELD-001.md`, `SHELL-001.md`, `FIELD-PROTOTYPE-001.md` — the
  four prior convergence passes this Drop extends.
- Current `src/ui/screens/today/TodayScreen.tsx`, `src/ui/screens/train/TrainScreen.tsx`,
  `src/ui/components/CommandSurface.tsx`, `src/ui/components/SignalRow.tsx`,
  `src/ui/styles/global.css`.

## Required invariants

- Existing Engine/recommendation/attentionPolicy authority unchanged; no command/event contract
  touched.
- Every existing capability remains reachable, in the same place, via the same interaction —
  composition/typography change only, never information architecture.
- WCAG AA contrast, visible focus, keyboard operation, touch target size (≥44px), reduced-motion
  behavior, and 320px layout integrity preserved or improved.
- No numeric target, derived statement, or copy is ever displayed without a real, already-computed
  source — the ORIENT restructuring may not invent new derived text.
- BODY's shared use of `.field-tagline`/`.field-tagline__headline` is provably unaffected.

## Acceptance criteria

1. Gate 1 (first glance): TODAY's pre-day-start state and TRAIN's "NO CHECK-IN YET" nudge read as
   genuine instrument surfaces, not generic app cards; TODAY's ORIENT reading shows a real
   typographic statement, not flat prose; TRAIN's tagline no longer competes in scale with the
   session instrument below it.
2. Gate 2 (blur): blurred TODAY/TRAIN screenshots remain compositionally distinguishable from the
   pre-Drop baseline via hierarchy/negative-space/sectional-structure/field-ownership, not merely
   color.
3. Gate 3 (reference-family): candidate screenshots placed beside the three reference images read
   as the same machine's composition, judged on structure, not literal copy/content.
4. Gate 4 (320px field test): no horizontal overflow, no clipped required content, ≥44px touch
   targets, no microscopic text, one-handed operation, no hover dependency, deviations remain
   discoverable, dominant action remains obvious. Repeated at 390px.
5. Gate 5 (restraint): no new decoration, glow, gradient, excess red, fake telemetry, or
   cyberpunk/gamer noise; removing visual material (the tagline's excess weight) counts as a valid
   improvement.
6. `.card--caution` and `.status-strip--stacked`/`__headline`/`__detail` are real, named, additive
   primitives — not one-off inline styles.
7. BODY's own `.field-tagline__headline` rendering is byte-identical before/after (screenshot
   spot-check).

## Required verification

- `npm run check:risk ccff019d7a911acdbdc80b95f4a097da1e06913a`.
- Focused TODAY/TRAIN/BODY(regression-only)/accessibility/browser tests, then full `npm run
  verify` (architecture + full test suite + production build).
- `git diff --check`.
- Direct responsive browser inspection at 320px and 390px across the required state matrix: TODAY
  quiet (pre-day-start, post-check-in no-action), TODAY earned/active operation where fixtures
  allow, TODAY ATTENTION/degraded state, TODAY resolved/confirmation state, TODAY support/depth
  surfaces; TRAIN pre-session (no check-in), suggested/ready session, active workout, active
  exercise execution, supporting/deeper controls (Why this suggestion, template/variant override).
- Before/after screenshots, blur-test images, and direct side-by-side comparison against all three
  attached reference images.
- BODY spot-check (unaffected) since `.card--warning`'s sibling and `.field-tagline` are shared
  classes/patterns.

## Builder expectations

- Work only in the isolated `claude/field-arch-001` branch/worktree cut from the exact baseline
  above.
- Implement only the authorized scope; stop on any required Engine, application-contract,
  persistence, fixture, dependency, information-architecture, or broader (BODY/MORE/glyph/emblem)
  change.
- Run all required verification, open one PR, persist an exact-head Builder handoff on that PR
  (baseline, final head SHA, branch, PR, changed files, verification results, visual inspection
  evidence including gate results and reference comparison, known residuals, explicit statement
  that the Builder did not review/approve/merge its own work), and stop without self-reviewing,
  merging, closing the Drop, or starting another Drop.

## Reviewer expectations

- Review from this contract and the exact final diff in a separate read-only session.
- Verify each of the four findings is genuinely fixed without regressing anything named as
  already-converged/protected, that no information-architecture or behavior changed, that BODY is
  provably unaffected, and that the visual result genuinely converges toward the approved
  references rather than merely claiming to.
- Persist exact-head-bound review evidence with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- Verify integration and deployment, then canonically close FIELD-ARCH-001 with `node
  scripts/factory-drop.mjs close FIELD-ARCH-001 --integration-sha <merge-commit-sha>` and commit
  the closure mutation. Do not begin another Drop.

## Stop / escalation conditions

- Stop if remote `master` moves from the approved baseline before activation, another Drop is
  active, or a Factory invariant fails.
- Stop if convergence requires Engine/recommendation semantics, application command/event
  contracts, persistence/schema/migrations, fixture compatibility, dependencies, invented domain
  truth, information-architecture changes, a new machine-emblem asset, or any generalized framework
  excluded above.
- Stop on conflict between this contract and higher authority, or on ambiguity that would require
  inventing product behavior or new derived copy rather than adapting truthful, already-computed
  data to a stronger physical grammar.
