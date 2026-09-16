---
id: GLYPH-003
baseline: c9d0b2762d16ba3b223f46003b493072a40b1ad9
risk_tier: ROUTINE
---

# GLYPH-003 // Last 4 MORE icons + red-on-interaction for all glyph rows

## Mission

GLYPH-002 explicitly left DECISION JOURNAL, EXERCISE LIBRARY, CUSTOM PROGRAMS, and REVIEW
icon-less — no glyph had been designed or approved for them at the time. This session's
BEYOND Launch Vision follow-up work reviewed rendered candidates for all four (two passes:
first pass's `exerciseLibrary`/`review` used three thin hairlines each, which the owner's own
zoomed real-18px-usage-size render showed merging into an illegible smear; second pass rebuilt
both with fewer, bolder strokes at the family's own frame weight). The owner then asked whether
the four new icons should render red, which would have reversed the documented `.tool-label`
accent-budget correction (`--text-2`, not accent, for every ordinary tool-card label — see
global.css) and created an arbitrary two-tier look against the other six MORE-row icons staying
gray. Proposed red-on-interaction instead — icons stay gray at rest, snap to
`--accent-strong` on press/keyboard-focus, ease back on release, applied uniformly to every
glyph-bearing MORE row (not just the four new ones) so it reads as "you activated this control,"
not decoration. Approved: **"Ship it as GLYPH-003, I approve. Make it happen."**

## Approved baseline

`origin/master` at `c9d0b2762d16ba3b223f46003b493072a40b1ad9`, verified via
`git fetch origin master && git rev-parse origin/master` — DECISIONS-001's own closure commit.

## Risk classification

**ROUTINE.** Same class as GLYPH-002: four new, purely additive SVG glyphs wired into
`CollapsibleRow`'s existing optional `icon` prop, plus one presentation-only CSS interaction
rule (a `:active`/`:focus-visible` color change on an existing element, using the existing
`--motion-fast`/`--motion-easing` tokens — not a new animation primitive, not ambient motion).
No engine/schema/persistence/dependency/IA change. None of the Architectural/High-Risk triggers
in `.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Direct owner review (the authorizing decision)

Conducted this session via rendered mockups (not hand-waved descriptions), each screenshotted
at the real 18px MORE-row usage size before being shown, per the session's established
mockup-review discipline:

- Pass 1: `decisionJournal` (open-book V) and `customPrograms` (chevron + stem) held up fine at
  18px. `exerciseLibrary` (three thin index lines) and `review` (three ledger lines + a
  checkmark) did not — both merged into an indistinct smudge at real size.
- Pass 2: `exerciseLibrary` rebuilt as two bold horizontal bars at the frame's own 1.7px stroke
  weight (not a thinner interior weight); `review` rebuilt as a single bold checkmark alone
  (2.1px), the ledger lines dropped entirely. Both read cleanly at 18px on re-render.
- Color follow-up: owner asked "I'd like for them to be red. What do you think?" — flagged that
  this would reverse the `.tool-label` accent-budget correction and create an unexplained
  two-tier look versus the other six MORE-row icons. Owner agreed to mock up red-on-interaction
  instead.
- Red-on-interaction mockup (static side-by-side "at rest" vs. "mid-press" comparison, plus a
  live interactive HTML page) shown; owner approved: **"Ship it as GLYPH-003, I approve. Make it
  happen."**

## Authorized scope

- `src/ui/icons/Icon.tsx`: extend `IconName` with `"decisionJournal" | "exerciseLibrary" |
  "customPrograms" | "review"` (purely additive — the existing eleven-member union is untouched)
  and add their `PATHS` entries, matching the locked family's stroke conventions
  (`strokeWidth={1.7}`, `strokeLinejoin="miter"`, `strokeLinecap="square"`, `fill="none"`).
  `review`'s checkmark uses `strokeWidth={2.1}`, matching `search`'s own heavier-stroke detail
  line. Update the header comment with a GLYPH-003 addendum in the same style as GLYPH-001/
  GLYPH-002's, describing the four additions, the 18px-legibility rebuild, and why each final
  shape was chosen.
- `src/ui/screens/more/MoreScreen.tsx`: wire `icon={<Icon name="..." size={20} />}` into the
  `DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM PROGRAMS`, and `REVIEW` `CollapsibleRow`s —
  each currently has no `icon` prop at all.
- `src/ui/components/CollapsibleRow.tsx`: wrap the passed `icon` in a new `<span
  className="tool-icon">` instead of rendering it as a direct `.tool-label` child, so its color
  can be targeted independently of the row's name text (see CSS below). Purely structural; the
  accessible name (`aria-label="Open {name}"`), the no-icon path, and every other prop/behavior
  are unchanged.
- `src/ui/styles/global.css`:
  - `.tool-icon` — `color: inherit` (identical look to before this Drop) plus a
    `transition: color var(--motion-fast) var(--motion-easing)`.
  - `.equipment-row--control:active .tool-icon, .equipment-row--control:focus-visible .tool-icon`
    — `color: var(--accent-strong)`. Scoped to `.equipment-row--control` (CollapsibleRow's real
    navigation buttons) only — static `.equipment-row` sections (BACKUP/ARCHIVE/RESTORE) are
    unaffected, matching their existing icon-color behavior.
- Tests: extend `tests/browser/Icon.test.tsx`'s `ALL_ICON_NAMES` with the four new names; add a
  test proving `CollapsibleRow` wraps a passed icon in `.tool-icon` separately from the label
  text; flip `tests/browser/MoreScreen.test.tsx`'s GLYPH-002-era "these four rows stay icon-less"
  assertion to its GLYPH-003 opposite (they now carry a glyph); add a `cohesion.test.tsx` case
  (matching its existing `findRule` CSS-presence pattern) proving the
  `:active`/`:focus-visible` `.tool-icon` rule is actually declared.

## Explicit exclusions

- No change to any of the eleven pre-existing glyphs (`mission`, `train`, `body`, `reset`,
  `shiftDown`, `success`, `more`, `history`, `search`, `schedule`, `backup`) — this Drop only
  adds four new entries.
- Icons do **not** render red at rest — that direction was explicitly proposed by the owner,
  flagged as reversing the locked `.tool-label` accent-budget correction, and dropped in favor
  of red-on-interaction. Static red icons were never approved and must not ship.
- The red-on-interaction rule is presentation-only and touches no engine/domain/persistence
  code; it changes color on an existing `:active`/`:focus-visible` state, not new markup for
  every row.
- `BACKUP`, `ARCHIVE`, `RESTORE` (static `.equipment-row` sections, not `CollapsibleRow`) are
  unaffected — no icon-press interaction on non-disclosure rows.
- No change to the app/PWA icon or EMBLEM assets — unrelated, already correct.

## Relevant authority / references

- `src/ui/icons/Icon.tsx`'s own header comment and GLYPH-001/GLYPH-002's prior additive-glyph
  precedent.
- `docs/UX_DECISIONS.md`, "Visual system — red budget," and `global.css`'s own `.tool-label`
  comment ("red is reserved for real identity/committed-action emphasis... not for labeling
  every ordinary tool card") — the reason static red was rejected in favor of on-interaction.
- MOTION-001 (`docs/UX_DECISIONS.md`, "Visual system — motion") — the red-on-interaction rule
  reuses the existing `--motion-fast`/`--motion-easing` tokens and explains a state change
  (pressed/focused), consistent with that Drop's "no new ambient/decorative motion" boundary.
- Direct owner review described above, ending in "Ship it as GLYPH-003, I approve. Make it
  happen."

## Required invariants

- `src/engine/**` untouched.
- The eleven pre-existing glyphs remain byte-for-byte unchanged.
- Every `CollapsibleRow`'s accessible name (`aria-label="Open {name}"`) is unchanged.
- Icons render `--text-2` gray at rest, identical to before this Drop, on every row.
- The red-interaction color change applies only to `.equipment-row--control` rows, never to
  static `.equipment-row` sections.

## Acceptance criteria

- `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
  `npx vitest run --project browser`, `npm run build` all pass.
- `tests/browser/Icon.test.tsx` proves all fifteen `IconName` values render a valid,
  `aria-hidden` `<svg>` with at least one path, and that `CollapsibleRow` wraps a passed icon in
  `.tool-icon`.
- `tests/browser/MoreScreen.test.tsx` proves `DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM
  PROGRAMS`, and `REVIEW` now carry a glyph.
- `tests/browser/cohesion.test.tsx` proves the `.equipment-row--control:active`/
  `:focus-visible` `.tool-icon` red rule is actually declared in the stylesheet.

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
`Icon.tsx`, `MoreScreen.tsx`, `CollapsibleRow.tsx`, `global.css`, and the three test files
(nothing in `attentionPolicy.ts` or any other screen); the four new glyph paths are genuinely
new entries, not a redraw of any locked one; icons render gray (`--text-2`) at rest on every
row, with no static red anywhere; the `:active`/`:focus-visible` rule is scoped to
`.equipment-row--control` only, not the static BACKUP/ARCHIVE/RESTORE rows. Tagged
CONFIRMED/PLAUSIBLE, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved,
reviewed, green PR; no admin-bypass; closes `ACTIVE_DROP.md` via `node scripts/factory-drop.mjs
close GLYPH-003 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to make the new (or any existing) icons red at rest — explicitly proposed by
  the owner and explicitly dropped in favor of red-on-interaction; static red was never
  approved.
- Any temptation to extend the press/focus interaction to non-disclosure rows (BACKUP/ARCHIVE/
  RESTORE) — out of scope; those aren't navigation controls.
- Any temptation to touch any of the eleven pre-existing glyphs while in this file.
