---
id: LAUNCH-VISION-003
baseline: 36d98aa0182aaaa49415fcd059436a85454998c9
risk_tier: ARCHITECTURAL
---

# LAUNCH-VISION-003 // TERRYS-SUIT SURFACE GRAMMAR PORT

## Mission

Port four already-designed presentation-only elements from the launch-vision prototype's Direction B
("Terry's Suit") into the real `src/ui` app: chamfered plating across surfaced UI planes, an
ambient red bloom around the active surface/frame, a one-time START DAY power-on sweep, and a
confirmation pulse on logged actions. This Drop is authorized directly by the owner in chat on
2026-09-15 and must match the prototype's actual geometry, color, opacity, and timing as closely
as the production DOM structure allows, without changing any command/query/engine/domain behavior.

GitHub Copilot was originally assigned this Drop and committed only this contract (against a
now-stale baseline, several Drops behind) before going idle — no code, no PR. This is a fresh
Builder run of the same owner-authorized mission, re-baselined to current `master`.

## Approved baseline

`origin/master` at `36d98aa0182aaaa49415fcd059436a85454998c9`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

ARCHITECTURAL. This is a broad visual-system change spanning TODAY/TRAIN/BODY/MORE and it amends
the locked Decision Register entry that had kept Terry's broader surface/motion direction
prototype-only. None of the HIGH-RISK triggers apply: no engine/domain/persistence/schema/backup/
correction-model/protected-fixture/dependency change is authorized here.

## Authorized scope — as actually implemented

- Add this Drop Contract and activate `docs/agent/ACTIVE_DROP.md` for `LAUNCH-VISION-003` against
  the exact baseline above.
- Update `docs/UX_DECISIONS.md`'s "Visual system — red budget" section to preserve the earlier
  prototype-only deferral language as history while recording this Drop's 2026-09-15
  direct-owner authorization for the four Terry's Suit elements below.
- **Chamfered plating**, extending the existing single-surface `--chamfer` primitive
  (`tokens.css`) to two more real, truthful targets: `.instrument-cluster` and `.card--warning`
  (the RED-tier override confirm panel — `useRedCapacityOverrideGate.tsx` — the genuine
  production analog of the prototype's red-bordered `.confirm-panel`). Both are filled, bordered
  surfaces with >=16px padding, the same safety margin VISUAL-001 itself relied on so the cut
  never intersects rendered content.
  - **`.equipment-row` (prototype-listed) is deliberately excluded.** It has no background or
    border by design — "a different silhouette entirely, not a card with the styling removed"
    (its own doc comment in `global.css`) — so a corner clip-path there is either invisible
    (nothing to clip against) or destructive (it has zero horizontal padding, so the cut would
    clip real row content at 320px). Giving it a background/padding to make the cut visible
    would itself be new geometry beyond the four authorized elements, not truthful adaptation
    of production DOM structure — exactly the stop condition this contract's own "no invented
    new geometry system" exclusion names.
  - No production analog for the prototype's `.exercise-card` exists; none was invented.
- **Ambient red bloom**, added to `.command-surface` (the one dominant/earned surface per
  screen) rather than an app-shell-wide glow — the prototype's phone "device frame" has no real
  production equivalent, and scoping it to `.command-surface` keeps "red is scarce and earned"
  true by construction. BODY never renders `.command-surface`, so its lower red budget holds
  without a separate carve-out rule.
- **One-time START DAY power-on sweep**, added to `TodayScreen.tsx` only: a `justStartedDay`
  state flips true once inside `handleStartDay` (never reset), adding `.today-field--boot` to
  the screen root, which fires a one-shot top-to-bottom sweep bar via `::before`. START DAY's
  own behavior is unchanged.
- **Confirmation pulse**, added to `ConfirmBanner.tsx`'s shared root — the one real primitive
  already shared by BODY's water/sleep/bodyweight/protein/meal confirmations and TODAY's
  capture-undo and check-in confirmations. TRAIN's own set-logging confirmation moment already
  has an equivalent one-shot flash (`.set-earned`, VISUAL-001) and is left untouched rather than
  duplicated — matching "no invented new motion vocabulary beyond the four authorized elements."
- Browser test coverage for the structural DOM hooks/classes added above (no pixel or
  animation-timing assertions).

## Explicit exclusions

- No changes to any engine, application, command, query, persistence, or domain logic.
- No change to icon geometry in `src/ui/icons/Icon.tsx`; GLYPHS remain locked.
- No reintroduction of red primary fills inside BODY's carve-out; `.body-field .btn-primary`
  remains neutral-filled.
- No invented new palette, motion vocabulary, geometry system, or unrelated restyling beyond the
  four authorized prototype elements (see `.equipment-row` exclusion above for the concrete case
  this rule actually decided).
- No dependency, lockfile, CI workflow, schema, backup/restore, or protected-fixture changes.
- No merge, self-review, integration, Factory closure, or auto-merge enablement by the Builder.

## Relevant authority / references

- Direct owner ruling, in chat, 2026-09-15: Builder assignment for `LAUNCH-VISION-003`, Terry's
  Suit Direction B as the exact visual target, four authorized elements, presentation-only scope,
  BODY red-budget carve-out preservation, and required verification/PR stop condition.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `.claude/skills/beyond-drop/SKILL.md` §§1-3, 9.
- `docs/UX_DECISIONS.md` — "Visual system — red budget", "Visual system — typography", "Visual
  system — motion", and "Explicitly out of scope".
- `prototype/launch-vision/README.md` and `prototype/launch-vision/index.html` — Direction B
  reference values/geometry/timing (chamfer `clip-path` polygon, `suitSweep`/`toastPulseB`
  keyframes, `--red-glow` device bloom).
- `docs/agent/drops/LAUNCH-VISION-002.md` — contract shape/pattern to follow.

## Required invariants

- This Drop is presentation-layer only: no product behavior or persistence truth changes.
- BODY's lower-red-budget doctrine remains intact, including the locked `.body-field .btn-primary`
  neutral fill and `.instrument-cluster`'s "no red accent" rule (the new chamfer there is pure
  geometry, no color change).
- GLYPHS lock is untouched; `Icon.tsx` geometry does not change.
- No screen may gain a new capability requirement or lose an existing one in order to fit the new
  visuals.
- Reduced-motion safety remains preserved for any new animation (all new keyframes are covered by
  the existing app-wide `@media (prefers-reduced-motion: reduce)` rule in `global.css`, no new
  per-animation override needed).

## Acceptance criteria

1. `docs/UX_DECISIONS.md` records this Drop as the authorization that partially supersedes the
   earlier prototype-only deferral for these four Terry's Suit elements, preserving history
   visibly and naming what remains deferred.
2. `.instrument-cluster` and `.card--warning` render with the same chamfer cut as
   `.command-surface`; `.equipment-row` is unchanged, with the exclusion reasoning recorded above.
3. `.command-surface` exposes an ambient red bloom without violating BODY's red-budget carve-out
   (verified structurally: BODY never renders `.command-surface`).
4. START DAY triggers a one-time `.today-field--boot` structural hook without changing what
   START DAY does.
5. `ConfirmBanner.tsx`'s root exposes a `confirm-banner` structural hook for the confirmation
   pulse; TRAIN's pre-existing `.set-earned` flash is untouched.
6. Required browser tests assert those structural hooks/classes and pass.
7. `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
   `npx vitest run --project browser`, and `npm run build` all pass.

## Required verification

- `npx tsc -b`
- `npm run check:architecture`
- `npx vitest run --project node`
- `npx vitest run --project browser`
- `npm run build`
- Direct browser inspection of the real app (via `npm run dev`) confirming the chamfer, bloom,
  sweep, and pulse render as intended and reduced-motion neutralizes all four.

## Builder expectations

- Work only in `../beyond-worktrees/claude-launch-vision-003` on branch
  `claude/launch-vision-003-terrys-suit-port`, cut from the exact baseline above.
- Implement exactly the authorized scope; treat any needed behavior change as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Verify the diff remains presentation-only, preserves BODY's carve-out and GLYPHS lock, and maps
  the new surface/motion values back to the prototype rather than inventing unrelated ones.
- Verify the `.equipment-row` exclusion reasoning holds by reading its own doc comment directly
  (no background/border, zero horizontal padding) rather than trusting this contract's summary.
- Verify browser tests cover structural hooks/classes only, not pixel/animation assertions.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR, without bypassing protection.
- After merge: close `LAUNCH-VISION-003` via `node scripts/factory-drop.mjs close
  LAUNCH-VISION-003 --integration-sha <merge-commit-sha>` and commit the closure mutation.

## Stop / escalation conditions

- Stop if `origin/master` moves from the approved baseline before activation or another Drop is
  already ACTIVE.
- Stop if any required Terry's Suit visual target would require changing behavior rather than
  presentation.
- Stop if preserving BODY's red-budget carve-out conflicts with a proposed bloom/pulse treatment.
- Stop on any conflict between this contract and higher repository authority, or any ambiguity that
  would require a new product/visual ruling beyond the explicit owner authorization above.
