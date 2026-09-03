---
id: LAUNCH-VISION-001
baseline: 2cf48cfb1a3b552cd6d24ae19f7f8dbc9359447e
risk_tier: ARCHITECTURAL
---

# LAUNCH-VISION-001 // PRIMARY CTA RED-BUDGET REVERSAL

## Mission

Bring the first concrete, owner-authorized piece of the BEYOND Launch Vision prototype's
"Terry's Suit" direction (`prototype/launch-vision/`) into the real running application: reverse
VISUAL-001's neutral (near-white/near-black) `.btn-primary` fill back to red, per a direct owner
ruling made while comparing the prototype against the current app. This is a deliberate,
recorded overturn of one specific locked decision (the CTA-color rule VISUAL-001 introduced,
itself citing "DEC-004's Red Budget" and Visual Synthesis Round 1.0) — not a general loosening of
red-scarcity doctrine, and not a wider reskin. Everything else the prototype explored (chamfer
geometry beyond `.command-surface`, ambient glow, power-on motion, typography, the abstract glyph
family) is explicitly out of scope here and remains prototype-only pending its own separate
Drop(s), consistent with "we keep building and adding on."

## Approved baseline

`origin/master` at `2cf48cfb1a3b552cd6d24ae19f7f8dbc9359447e`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

ARCHITECTURAL. Not a pure Routine/UI-only change: it overturns a previously locked, explicitly
reasoned Decision Register-adjacent rule (`.btn-primary`'s neutral fill, VISUAL-001) that the
current `global.css`/`tokens.css` comments cite as following "DEC-004's Red Budget." Reversing a
locked decision requires recording the new decision, not just editing the CSS — this is a
composition/authority change, even though the code diff itself is small. None of the HIGH-RISK
triggers apply (no Engine/domain/persistence/schema/backup/correction/fixture/dependency change).

## Authorized scope

- Record the reversal as a new locked entry in `docs/UX_DECISIONS.md` (a "Visual system — red
  budget" section), stating what changed, citing the direct owner ruling and date, and stating
  explicitly that this does NOT loosen red-scarcity doctrine elsewhere (RED-tier, `.btn-danger`,
  `.command-surface`'s edge/chamfer, `OPERATOR_INTERFACE_DOCTRINE.md`'s "red authority must be
  earned" are all unaffected).
- `src/ui/styles/tokens.css`: change `--action-primary-bg` and `--action-primary-text` values so
  `.btn-primary`'s default fill is red or on-red (reusing the existing `--accent` token family —
  no new color introduced), with a WCAG AA contrast check for the resulting text/fill pair.
- `src/ui/styles/global.css`: update `.btn-primary`'s doc comment to record the reversal (what it
  was, why it's changing, pointing at the new Decision Register entry) rather than leaving
  VISUAL-001's now-superseded reasoning as the only record. No structural/selector change to
  `.btn-primary` itself beyond what the token change requires.
- Directly associated visual verification (before/after screenshots of a representative primary
  button in context, e.g. TODAY's recommendation CONFIRM action) confirming the change actually
  renders and holds contrast in the real app, not just in isolation.

## Explicit exclusions

- No change to `.btn-danger`, `.btn-secondary`, `.command-surface`'s existing red edge/chamfer
  treatment, `.capacity-dot--red`, or any other existing red usage — this Drop touches
  `.btn-primary`'s fill only.
- No chamfer/clip-path geometry change anywhere (the prototype's broader chamfer usage stays
  prototype-only; `--chamfer`'s existing "only one chamfer may identify an active region"
  invariant is untouched).
- No typography change (Space Grotesk/IBM Plex Sans/IBM Plex Mono via `fonts.ts` stay exactly as
  they are — already loaded, already locked from Suit Implementation 01B).
- No glyph/icon change (`Icon.tsx` untouched — `docs/UX_DECISIONS.md`'s "System identity — EMBLEM
  vs. GLYPHS split" already forbids inventing/approximating identity artwork outside a Drop
  explicitly chartered for it, and glyph geometry changes are unrelated to this Drop's scope
  regardless).
- No motion/animation addition (ambient glow, power-on sweep, confirmation pulse) anywhere in
  `src/`.
- No Engine, application, persistence, domain, or recommendation-semantic change of any kind.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner ruling, this conversation, 2026-09-03: explicit choice of "Overturn it for this
  direction" when asked whether the prototype's red primary buttons or the existing locked
  neutral-CTA rule should win, with the explicit condition that it be "recorded as a doctrine
  change in the Decision Register, not just quietly coded around."
- `prototype/launch-vision/` (this same branch) — the Direction B ("Terry's Suit") reference this
  reversal is drawn from.
- `src/ui/styles/tokens.css` / `global.css`'s own `.btn-primary`/VISUAL-001 comments — the exact
  locked reasoning being overturned.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` — "Red authority must be earned; significance earns
  intensity" still governs every red usage this Drop does not touch.
- `docs/UX_DECISIONS.md`'s "System identity — EMBLEM vs. GLYPHS split" entry — the precedent for
  how this repository records a corrected/overturned locked decision (used as the format model
  for this Drop's own new entry).

## Required invariants

- WCAG AA contrast holds for `.btn-primary`'s new fill/text pair (checked, not assumed).
- `.btn-primary:disabled`'s existing `--surface-2`/`--text-3` treatment is unaffected.
- No other component/class silently inherits an unintended visual change from the two token
  values changing — grep every consumer of `--action-primary-bg`/`--action-primary-text` before
  finishing, not just `.btn-primary`.
- 16px minimum text size and ≥44px touch target (both already true of `.btn-primary`) remain
  true — this Drop does not touch sizing.

## Acceptance criteria

1. `docs/UX_DECISIONS.md` contains a new, dated, explicitly-scoped entry recording the reversal.
2. `.btn-primary` renders with a red fill app-wide (verified live in the browser on at least
   TODAY, not just read from source).
3. Computed contrast ratio for the new fill/text pair is stated in the Builder handoff and is
   ≥4.5:1 (normal text) or ≥3:1 if the button text qualifies as large text — state which
   threshold applies and the actual computed number.
4. No other visual regression on TODAY/TRAIN/BODY/MORE from this two-token change (spot-checked).
5. `npm run verify` passes clean.

## Required verification

- `npm run verify` (architecture boundaries + full test suite + production build).
- `git diff --check`.
- Direct browser inspection (`npm run dev`) of at least one real `.btn-primary` in context
  (TODAY's primary recommendation CONFIRM action), both default and `:disabled` states, with a
  before/after screenshot pair.
- A stated, computed WCAG contrast ratio for the new fill/text pair (not eyeballed).

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/claude-launch-vision-001 -b
  claude/launch-vision-001-suit-cta -c origin/master` or equivalent).
- Implement exactly the authorized scope; treat any expansion (chamfer, motion, typography,
  glyphs) as a STOP condition for this Drop, to be proposed as its own separate future Drop
  instead.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.
- Persist a concise Builder handoff on the PR itself (baseline, final head SHA, branch, PR,
  changed files, verification results, the computed contrast ratio, screenshots, known
  residuals, explicit statement that the Builder did not review/approve/merge its own work).

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Verify the Decision Register entry is genuinely present and accurately scoped (does not
  overclaim a general red-budget loosening), the token change is confined to
  `--action-primary-bg`/`--action-primary-text` and their real consumers, contrast actually holds
  at the stated ratio, and no excluded surface (chamfer/typography/glyphs/motion) was touched.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- After merge: close `LAUNCH-VISION-001` via `node scripts/factory-drop.mjs close
  LAUNCH-VISION-001 --integration-sha <merge-commit-sha>` and commit the closure mutation. Do not
  begin another Drop.

## Stop / escalation conditions

- Stop if `origin/master` moves from the approved baseline before activation, another Drop is
  already `ACTIVE`, or a Factory invariant fails.
- Stop if the change cannot hold WCAG AA contrast with any reasonable red/on-red pair drawn from
  the existing `--accent`/`--accent-strong` tokens — escalate rather than introduce a new color
  or silently accept a failing ratio.
- Stop if implementing this reveals `--action-primary-bg`/`--action-primary-text` are consumed
  somewhere this contract didn't anticipate in a way that would produce an unintended visual
  regression — escalate rather than guess at whether that consumer should also change.
- Stop on any conflict between this contract and higher repository authority, or on ambiguity
  that would require inventing product/visual behavior beyond the specific CTA-color reversal
  actually authorized.
