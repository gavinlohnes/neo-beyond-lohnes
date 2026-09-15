---
id: LAUNCH-VISION-004
baseline: 4067c69851da5dec5df940df292baeb1ee5d5df8
risk_tier: ROUTINE
---

# LAUNCH-VISION-004 // Visual tuning: power-on sweep + ambient bloom

## Mission

LAUNCH-VISION-003's independent reviewer flagged two non-blocking effectiveness gaps, both
confirmed live by the owner immediately after that Drop shipped: the START DAY power-on sweep
reads as an instantaneous "red flash" rather than a legible sweep (owner's own words, in chat,
2026-09-15), and the ambient bloom around `.command-surface` is nearly imperceptible against the
near-black page background. The owner asked directly for a tuning pass on both. This Drop is
that pass — pure value tuning within LAUNCH-VISION-003's already-authorized elements, no new
elements, no doctrine change.

## Approved baseline

`origin/master` at `4067c69851da5dec5df940df292baeb1ee5d5df8`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. Two CSS value changes on already-authorized elements from LAUNCH-VISION-003. No new
selectors, no new elements, no engine/application/persistence/domain/dependency change.

## Root cause

- **Sweep**: `beyond-power-on-sweep`'s `transform` was only keyframed at 0%/100%, so it
  interpolated using the animation's overall timing function — `var(--motion-easing)`
  (`cubic-bezier(.2,.8,.2,1)`), a curve that front-loads most of its motion into roughly the
  first 10% of the run. By ~150ms into a 650ms animation the bar had already traveled 30-40% of
  its distance, so the remaining, slower portion was easy to miss and the fast opening burst read
  as a flash rather than travel — confirmed by the LAUNCH-VISION-003 reviewer scrubbing
  `Animation.currentTime` directly, and independently confirmed live by the owner.
- **Bloom**: `box-shadow: 0 0 48px -14px rgba(226, 69, 79, 0.4)` — the -14px spread pushed the
  visible portion of the glow outward before it had faded much, leaving only a faint, easily
  missed tint against `--bg: #0a0a0a`.

## Authorized scope

- `src/ui/styles/global.css`: `beyond-power-on-sweep`'s keyframes gain explicit opacity stops
  (10%/85%) and the animation switches from `var(--motion-easing)` to a dedicated `linear`
  timing function for this one animation only — the shared `--motion-easing` token itself is
  untouched, so no other of its 11 consumers are affected. Duration increases 650ms → 900ms for
  legibility.
- `src/ui/styles/global.css`: `.command-surface`'s ambient-bloom `box-shadow` retuned from
  `0 0 48px -14px rgba(226, 69, 79, 0.4)` to `0 0 64px -6px rgba(226, 69, 79, 0.6)` — tighter
  spread (glow starts closer to the surface's own edge), larger blur, higher opacity.
- No test changes required: the existing structural-hook tests (`.today-field--boot` presence,
  `.confirm-banner` presence) assert class/DOM presence, not timing or visual intensity, and
  remain valid unchanged.

## Explicit exclusions

- No new elements, no scope beyond the two values named above.
- No change to `--motion-easing` itself or any other consumer of it.
- No change to the confirmation pulse or chamfer plating — the reviewer raised no concern with
  either and the owner's tuning request was specifically about the sweep and the bloom.
- No merge, self-review, integration, or Factory closure by the Builder.

## Relevant authority / references

- Direct owner instruction, in chat, 2026-09-15: "Do the visual tuning pass. I saw the screen do
  a red flash when I hit start day" — confirming the reviewer's own finding and authorizing this
  Drop.
- `docs/agent/drops/LAUNCH-VISION-003.md` and PR #86's two non-blocking review comments (the
  sweep-easing and bloom-visibility findings this Drop resolves).

## Required invariants

- Presentation-only; no command/query/engine/domain change.
- `--motion-easing` and every other one of its consumers outside this one animation are
  byte-for-byte unchanged.
- The sweep remains one-shot (never `infinite`), still neutralized by the existing app-wide
  `prefers-reduced-motion: reduce` rule.
- BODY's red-budget carve-out is unaffected (this Drop touches values already scoped to
  `.command-surface`/`.today-field--boot`, neither of which BODY renders).

## Acceptance criteria

1. Scrubbing the sweep animation via `Animation.currentTime` at several points across its
   duration shows the bar at visibly different positions (i.e. it reads as travel, not a single
   instant) — verified via real-Chromium screenshots at 0/150/300/450/600/750/900ms.
2. The ambient bloom is visibly distinguishable from the page background in a real screenshot,
   confirmed via both a direct `getComputedStyle` check and a visual screenshot of TRAIN's
   pre-session picker (the one `.command-surface` instance reachable without a check-in).
3. `npm run verify` passes in full.

## Required verification

- `npx tsc -b`
- `npm run check:architecture`
- `npx vitest run --project node`
- `npx vitest run --project browser`
- `npm run build`
- Direct browser inspection via `npm run dev`, scrubbing the sweep animation and screenshotting
  the bloom, per the acceptance criteria above.

## Builder expectations

- Work only in `../beyond-worktrees/claude-launch-vision-004` on branch
  `claude/launch-vision-004-visual-tuning`, cut from the baseline above.
- Implement exactly the two named value changes; any temptation to touch anything else is a STOP
  condition.
- Run the required verification before opening a PR.
- Open the PR, then stop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm the diff touches only the two named CSS blocks (plus Drop machinery), confirm
  `--motion-easing` itself is untouched, and do an independent visual/scrubbing check rather than
  trusting the Builder's screenshots.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR.
- After merge: close `LAUNCH-VISION-004` via `node scripts/factory-drop.mjs close
  LAUNCH-VISION-004 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to expand scope beyond the two named value changes.
- A genuine conflict between this contract and higher repository authority.
