---
id: FEEL-001
baseline: SET-AT-ACTIVATION
risk_tier: ROUTINE
---

# FEEL-001 // FINISH-AND-FEEL PASS

## Mission

Owner brief 2026-10-05, item 2. Make BEYOND feel finished: sharp motion, a tap you can feel on the
moments that matter, and buttons that answer a press. Example: tapping LOG in gym mode buzzes once
and the set count ticks up, instead of the number silently swapping.

## Approved baseline

Set at activation to fresh `origin/master`.

## Risk classification

ROUTINE: visual only (CSS, a small motion/haptics helper, presentation components). No data,
Engine or dependency change.

## Authorized scope

- **Transitions:** screen and tab changes in 150–250 ms using the existing `--motion-*` tokens and
  easing (no bounce, no overshoot). HUD ticks and 1px lines draw in on first show; numbers tick up
  on change (key totals: fuel, water, protein, set counts).
- **Haptics:** one short tap on LOG (set logged), finished set/workout, and hold-to-confirm
  completion, through `navigator.vibrate` where it exists; where it doesn't (iPhone), nothing
  happens and nothing is shown. Haptics confirm a state change, never a plain touch (doctrine).
- **Press states** on every button (`:active`), visible without color alone.
- **Reduced motion** makes every transition, draw-in and tick instant (haptics unaffected).
- **Handoff screenshots:** phone-size (390×844) screenshots of every screen, timeline included,
  in `docs/agent/screenshots/FEEL-001/`.

## Explicit exclusions

No decorative looping animation; no sound; no haptic on the PR tag (PR-CARDS-001 ruling) or on
navigation; no layout or wording change.

## Relevant authority / references

Doctrine (motion, semantic haptics); MOTION-001 easing; HUD-001; PR-CARDS-001 "no vibration".

## Required invariants

Reduced motion = instant; nothing waits on an animation to be usable; touch targets unchanged.

## Acceptance criteria

1. Tab changes animate in 150–250 ms and are instant with reduced motion (test).
2. LOG, a finished set and hold-to-confirm call the haptic helper; no call where unsupported (test).
3. Every button has a press state (CSS test).
4. Screenshots of every screen are in the handoff.

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks reduced motion, haptic call sites and that no behavior changed.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if a change needs a new dependency.
