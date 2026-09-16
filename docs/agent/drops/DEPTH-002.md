---
id: DEPTH-002
baseline: 7e47a09ee6d51de556f040d91a09feb95288bb04
risk_tier: ROUTINE
---

# DEPTH-002 // Fix: "exposed machinery" reveal never fades, blocks the screen indefinitely

## Mission

Real-use bug, found by the owner the day after DEPTH-001 shipped: opening MORE's "Diagnostic
detail" (or any WHY disclosure) shows the full-viewport red circuit-trace reveal exactly as
designed — but it then stays at full opacity, covering the entire screen including the very
panel it's supposed to be revealing, for as long as the disclosure stays open. The only way to
see the underlying content again is to close the disclosure, which removes the content along
with the overlay. Screenshot evidence: opening "Diagnostic detail" replaces the whole visible
screen with the trace network, no panel content visible at all.

Root cause: `.machinery-reveal-overlay`'s CSS animation (`machinery-reveal-in`, a `0 → 1`
keyframe with `animation-fill-mode: forwards`) was written to hold at full opacity once shown —
this was in fact the literal originally-documented behavior ("mounted... for as long as a
WHY/diagnostic disclosure stays open"), not an oversight caught in review. Every reviewed
mockup pass screenshotted the reveal itself as the payoff shot; none of them showed or tested
whether the panel underneath stayed readable, so this consequence was never actually seen until
real use hit it just now. This is a straightforward fix, not a new design decision: it restores
DEPTH-001's own already-documented invariant ("content visibility never gated on reveal") by
making the reveal a momentary flash that fades itself back out, rather than a standing block.

## Approved baseline

`origin/master` at `7e47a09ee6d51de556f040d91a09feb95288bb04`, verified via
`git fetch origin master && git rev-parse origin/master` — GLYPH-003's own closure commit.

## Risk classification

**ROUTINE.** A CSS animation-timing fix plus one doc-comment clarification, restoring an
already-documented invariant from an already-shipped Drop. No new component, no new state
machine, no engine/domain/persistence change, no IA change. None of the Architectural/High-Risk
triggers in `.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Authorized scope

- `src/ui/styles/global.css`: replace `.machinery-reveal-overlay`'s `machinery-reveal-in`
  keyframe (a `0 → 1` fill-forwards fade that never returns to 0) with
  `machinery-reveal-in-out` (`0% → 20% → 60% → 100%` = `0 → 1 → 1 → 0` over 900ms) so the
  overlay fades itself back to invisible on its own, independent of whether the disclosure is
  still open. The existing brightness-flash keyframe and its timing are unchanged.
- `src/ui/components/WhyDisclosure.tsx`: doc-comment update only, describing the fix — no
  logic change. The overlay still mounts on open and unmounts on close exactly as before;
  only its own CSS opacity timeline changed.
- `tests/browser/WhyDisclosure.test.tsx`: new regression test proving the overlay's computed
  opacity rises above 0 then falls back below 0.05 while the disclosure stays open, and that
  the real content and native `<details open>` state are unaffected by that fade.

## Explicit exclusions

- No change to `PCBTraceOverlay.tsx` or `pcbTrace.ts` — the generator and its rendering are
  untouched; only how long the result stays visible changed.
- No change to the flash brightness keyframe, colors, stroke weights, or geometry — those were
  correctly approved in DEPTH-001 and are not in question here.
- No change to which four call sites use `WhyDisclosure` (TODAY's RecommendationCard, TRAIN's
  two panels, MORE's Diagnostic detail) — scope is fixed at "the same reveal fades out sooner,"
  not "which screens get it."
- No change to `prefers-reduced-motion` handling — it already skips the overlay entirely, which
  remains correct and untouched.

## Relevant authority / references

- The owner's own screenshots (MORE screen normal state, then MORE screen with "Diagnostic
  detail" open showing the full-screen trace network with zero visible content underneath) and
  the message: "When I open diagnostic detail it creates that 2nd picture. I don't think that's
  what we meant for it to do lol."
- `docs/agent/drops/DEPTH-001.md`'s own required invariant: "Content visibility never gated on
  reveal" — this fix restores that invariant's actual real-world effect rather than changing it.

## Required invariants

- Content visibility is never gated on the reveal, now genuinely including "the reveal itself
  doesn't block seeing the content it just revealed" — the original invariant's intent, now
  actually true in practice.
- `prefers-reduced-motion: reduce` still skips the overlay entirely (unchanged code path).
- The overlay is still `aria-hidden` and `pointer-events: none` throughout its entire fade
  cycle — it was already non-interactive; this fix doesn't change that, it only shortens how
  long it visually dominates the screen.
- Every pre-existing `WhyDisclosure`/`PCBTraceOverlay`/`pcbTrace.ts` test from DEPTH-001 keeps
  passing unmodified except the one line asserting overlay presence right after open (still
  true — the fix only changes what happens ~1 second later).

## Acceptance criteria

- `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
  `npx vitest run --project browser`, `npm run build` all pass.
- The new `tests/browser/WhyDisclosure.test.tsx` case proves the overlay's opacity returns
  below 0.05 within 2 seconds of opening, while the disclosure remains open and its real content
  stays visible.
- Manually verified against the exact bug report: opening MORE's Diagnostic detail on a real
  device should show a brief red flash that recedes within about a second, after which the
  APP/BUILD/ENGINE/SCHEMA panel is fully visible and readable while the disclosure stays open.

## Required verification

Standard ROUTINE gate per `.claude/skills/beyond-drop/SKILL.md` §3 — full verification
(typecheck, architecture boundaries, node + browser test projects, build) run in full before
opening the PR.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from
the exact baseline above, implement only the authorized scope, run required verification, open
PR and stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing
from this contract and the final diff only. Specifically verify: the diff touches only
`global.css`, `WhyDisclosure.tsx` (doc comment only — diff its actual behavior against
origin/master to confirm no logic change), and the one test file; the new keyframe genuinely
returns opacity to 0 by 100% while preserving the existing flash timing; the new test actually
exercises the real animation (not a mocked/stubbed timer). Tagged CONFIRMED/PLAUSIBLE, never
merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via `node scripts/factory-drop.mjs
close DEPTH-002 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to also revisit the flash color/geometry/duration while in this file — those
  were correctly approved in DEPTH-001 and are out of scope for this bugfix.
- Any temptation to add a JS-driven auto-unmount timer instead of a CSS-only fade — unnecessary
  complexity for a purely presentational fix; the overlay is already inert once faded.
