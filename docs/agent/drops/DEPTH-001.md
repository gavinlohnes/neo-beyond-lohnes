---
id: DEPTH-001
baseline: 1be442772460d36450831fa4b0e5124ba131d500
risk_tier: ARCHITECTURAL
---

# DEPTH-001 // "Exposed Machinery" reveal for WHY/diagnostic disclosures

## Mission

TODAY's RecommendationCard, TRAIN's variant-suggestion and exercise-detail panels, and MORE's
SYSTEM diagnostics each already expose real "exposed machinery" content (the WHY trace, the
progression rationale, the raw diagnostic counts) behind a plain native `<details>`. This gap
was raised directly to the owner this session while reviewing the BEYOND Launch Vision
prototype's own "Depth reveal" demo — a one-off aesthetic pitch that was never actually built
into the shipped app. This Drop builds it for real: opening any of those four disclosures now
also shows a full-viewport, purely decorative "exposed machinery" reveal (a PCB-style trace
network) behind the still-legible content, while the disclosure's own real content is completely
unaffected — same instant, native `<details>` visibility as before.

## Direct owner review (the authorizing decision)

Reached over four rendered mockup passes this session, at each step reviewed live and corrected
by the owner before the next pass:

1. **Pass 1** (thin hairline traces confined to the disclosure panel) — owner: "not as dramatic
   as I'd like," wanted it full-screen, referencing Batman Beyond reference art.
2. **Pass 2** (full-screen, but built from solid shattered polygon plates, matching the Batman
   Beyond *character* render specifically) — owner: still not quite it, supplied three real PCB
   circuit-board photographs as better reference.
3. **Pass 3** (full-screen glowing Manhattan-routed trace network with an SVG blur/glow filter,
   converging toward the card) — owner: liked the direction and confirmed it "fits the Batman
   Beyond suit idea," but flagged the brightness/width falloff (fading toward the edges) as
   inconsistent with the reference and asked for uniform thickness/color throughout.
4. **Pass 4** (uniform thickness/opacity, glow filter removed entirely, flat saturated red
   matched directly to the supplied PCB photograph) — owner: **"Perfect. Ship it man."**

This Drop implements exactly pass 4's approved visual: flat, unglowing, uniformly-bright red
Manhattan-routed traces with via-dots, converging toward roughly where the disclosed content
sits, full-viewport, with the disclosed content itself staying a clean, untouched, legible
island on top.

## Approved baseline

`origin/master` at `1be442772460d36450831fa4b0e5124ba131d500`, verified via
`git fetch origin master && git rev-parse origin/master` — GLYPH-002's own closure commit.

## Risk classification

**ARCHITECTURAL.** A new, full-viewport visual/motion pattern applied across three screens
(TODAY/TRAIN/MORE), a new shared component wired into the app's existing WHY-disclosure
convention, and the app's first use of `createPortal` — a new pattern for this codebase, not
previously used anywhere. Not HIGH-RISK: no schema/persistence/Engine change, no dependency
addition (`react-dom`'s `createPortal` ships with the existing `react-dom` dependency), no
removed capability, and the reveal is purely decorative (`aria-hidden`, `pointer-events: none`)
so it cannot affect what any test or assistive technology can already do.

## Authorized scope

- New `src/ui/effects/pcbTrace.ts`: pure, deterministic trace-network generator
  (`generateTraceNetwork(width, height, seed, hubXRatio, hubYRatio)`) — Manhattan-routed
  segments biased toward one hub point, with via-dots at bends. No DOM, no I/O, no React —
  colors are applied by the caller, not this module.
- New `src/ui/components/PCBTraceOverlay.tsx`: renders the generated network as a full-viewport,
  `aria-hidden`, `pointer-events: none` `<svg>` in flat `#d81f1f`/`#e63333` — no blur/glow filter,
  per the owner's pass-4 correction.
- New `src/ui/components/WhyDisclosure.tsx`: drop-in replacement for the plain
  `<details className="why"><summary>...</summary>...</details>` pattern. Wraps a controlled
  `onToggle` handler that portals a fresh `PCBTraceOverlay` (seeded from `Date.now()`) to
  `document.body` while open, and unmounts it on close or when `prefers-reduced-motion: reduce`
  is set (in which case the overlay never mounts at all). The disclosure's own content stays
  native `<details>` semantics — visible the instant it's open, never gated by the reveal.
- New CSS in `global.css`: `.machinery-reveal-overlay` (fixed, full-viewport, `z-index: 500`,
  `pointer-events: none`) plus a brief entrance fade + brightness-pulse animation, both disabled
  under `prefers-reduced-motion: reduce`.
- Wired into the four existing WHY/diagnostic disclosures, replacing the raw `<details
  className="why">` in each, with no change to their own summary text, content, or styling:
  - `src/ui/screens/today/RecommendationCard.tsx` ("How BEYOND decided")
  - `src/ui/screens/train/TrainScreen.tsx` ("Why this suggestion" and "Exercise detail")
  - `src/ui/screens/more/MoreScreen.tsx` ("Diagnostic detail")
- Tests: new `tests/ui/pcbTrace.test.ts` (determinism, Manhattan-only segments, bounds, hub
  sensitivity) and new `tests/browser/WhyDisclosure.test.tsx` (content visibility is unaffected
  by the reveal; overlay mounts/unmounts with open state; `prefers-reduced-motion` skips it
  entirely; accessible name/structure unchanged).

## Explicit exclusions

- **BODY is untouched.** It renders neither `.command-surface` nor any WHY/diagnostic
  disclosure today — there is nothing for it to reveal. Giving it a "dig in" moment is a content
  question (what would it even show?), not a motion one, and was explicitly left open in every
  reviewed mockup pass.
- **No whole-screen shake.** The reviewed mockup passes included a brief screen-shake alongside
  the flash/reveal. This Drop keeps the brightness-pulse flash (contained entirely to the
  decorative overlay itself) but does not shake real, interactive app content — consistent with
  this app's own existing motion-restraint doctrine (MOTION-001: motion should explain a state
  change, never decorate) and never explicitly called out by the owner as a must-keep, unlike
  the trace network's color/glow/thickness, which were.
  Escalate before adding a document-wide shake later if it's actually wanted.
- No change to `DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM PROGRAMS`, or `REVIEW` — none of
  these render a WHY/diagnostic disclosure today, so there's nothing for this Drop to wire into.
- No change to any Engine/application/persistence code — this Drop is UI-layer only.

## Relevant authority / references

- Direct owner review of four rendered mockup passes this session (detailed above), ending in
  the explicit instruction "Perfect. Ship it man."
- `.claude/rules/engine.md` / architecture boundaries: unaffected — this Drop never touches
  `src/engine/**`, `src/application/**`, or `src/persistence/**`.

## Required invariants

- The four disclosures' own content visibility is native `<details>` semantics, exactly as
  before this Drop — never conditional on the reveal overlay mounting, animating, or existing at
  all.
- `prefers-reduced-motion: reduce` fully suppresses the reveal (it never mounts), with zero
  effect on the disclosure's own content.
- The reveal overlay is always `aria-hidden="true"` and `pointer-events: none` — it can never be
  focused, queried by accessible name, or intercept a tap meant for real content.
- No `src/engine/**`, `src/application/**`, or `src/persistence/**` file is touched.

## Acceptance criteria

- `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
  `npx vitest run --project browser`, `npm run build` all pass.
- Every pre-existing test that opens one of the four WHY/diagnostic disclosures (in
  `TodayScreen.test.tsx`, `TrainScreen.test.tsx`, `MoreScreen.test.tsx`, `accessibility.test.tsx`)
  passes unmodified — proving the swap to `WhyDisclosure` is a true drop-in replacement.
- New tests prove the reveal overlay mounts only on real (non-reduced-motion) opens, is
  `aria-hidden`, and never gates the real content's own visibility.

## Required verification

Standard ARCHITECTURAL gate per `.claude/skills/beyond-drop/SKILL.md` §3 — full verification
(typecheck, architecture boundaries, node + browser test projects, build) run in full before
opening the PR.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR and
stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only. Specifically verify: the reveal overlay is genuinely
`aria-hidden`/`pointer-events: none` and cannot be reached via any accessible-name query; every
pre-existing WHY-disclosure test still passes with zero modification to its own assertions
(proving `WhyDisclosure` is a true drop-in, not a behavior change in disguise); the trace
generator (`pcbTrace.ts`) has zero color/style opinions (flat function, no glow, no hardcoded
palette beyond what `PCBTraceOverlay.tsx` applies); no `src/engine/**`/`application/**`/
`persistence/**` file appears in the diff; `prefers-reduced-motion: reduce` is honored (overlay
never mounts, not just visually hidden after mounting — check `WhyDisclosure.tsx`'s
`handleToggle`, not just the CSS). Tagged CONFIRMED/PLAUSIBLE, never merge or self-authorize a
scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via `node scripts/factory-drop.mjs
close DEPTH-001 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to also build a BODY reveal — no content was ever approved for it; that's a
  separate, not-yet-asked question.
- Any temptation to add the whole-screen shake back in — explicitly excluded above; ask first if
  it turns out to actually be wanted.
- Any temptation to let the reveal's visual weight compete with or obscure the real content it
  sits behind — the disclosed content must always remain the clear, legible focus, matching every
  reviewed mockup pass.
