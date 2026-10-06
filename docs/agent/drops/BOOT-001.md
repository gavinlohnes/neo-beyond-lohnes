---
id: BOOT-001
baseline: aaa42c234fa585f32f151b777aa013c692761e19
risk_tier: ROUTINE
---

# BOOT-001 // BOOT SEQUENCE

## Mission

Owner brief 2026-10-05, item 3. On a cold launch, after Android's own splash: a black screen, the
existing icon, a 1px line drawing across, "BEYOND" typing in, three status lines ticking in
(e.g. "DAY 14 · SHIFT 1800 · BACKUP OK"), then a cut to the app. About one second.

## Approved baseline

`origin/master` at `aaa42c234fa585f32f151b777aa013c692761e19`.

## Risk classification

ROUTINE: a presentation overlay plus one read-only status query. The icon is the existing
`public/icons` mark used as-is (owner ruling 2026-10-05: allowed on the icon and boot screen only).

## Authorized scope

- A boot overlay shown once per page load (cold launch), never on resume from the background.
- Sequence (~1 s): black, icon, 1px line draws across, "BEYOND" types in, three status lines tick
  in, cut to the screen the app would have opened anyway (TODAY, a resumed workout, a shortcut).
- Status lines from a read-only query: **DAY n** (the number of BEYOND days on record), **SHIFT
  hhmm** (today's scheduled shift start, or SHIFT OFF), **BACKUP OK / DUE / OFF** (the
  automatic-backup state). A value that can't be read is left out, never guessed.
- Tap anywhere skips; reduced motion shows no sequence at all.
- Manifest `background_color`/`theme_color` and the page background stay pure black (#000000) so
  Android's splash hands off seamlessly.

## Explicit exclusions

No redrawn or animated mark (the mark is used as-is); no sound; nothing written; never blocks
the app longer than the sequence.

## Relevant authority / references

Owner brief and rulings 2026-10-05 (icon use, HUD no-logo amendment); EMBLEM-002.

## Required invariants

The app's own startup (rollover, workout continuity, shortcuts) is unchanged and runs underneath.

## Acceptance criteria

1. Shows on first mount; not again on visibility change (test).
2. Tap skips; reduced motion renders nothing (test).
3. Status lines show real values or are omitted (test).
4. Manifest background is #000000 (test).

## Required verification

`npm run typecheck` · `npm run verify` · `git diff --check` · PR Verification green.

## Builder expectations

Claude Code. Build, verify, PR, handoff with screenshots and DECISIONS FOR GAVIN.

## Reviewer expectations

A separate session checks resume behavior, skip, reduced motion and the mark used as-is.

## Integrator expectations

Routine: merges on green checks after review; Claude Code closes the Drop.

## Stop / escalation conditions

Stop if the sequence would need to delay data loading or change startup order.
