---
id: GLYPH-002
baseline: 54164d2a828f8e7f85cfad9c2ca740ed47804491
risk_tier: ROUTINE
---

# GLYPH-002 // Four new MORE-nav glyphs: history, search, schedule, backup

## Mission

MORE's own navigation rows (MISSIONS & OBLIGATIONS, WORK SCHEDULE, DECISION JOURNAL, EXERCISE
LIBRARY, CUSTOM PROGRAMS, HISTORY, REVIEW, SEARCH) and its BACKUP action carried no icon at all —
`CollapsibleRow` has had an optional `icon` slot since Harvest Checkpoint 1, but only
`ResetCard`/`ShiftDownCard` ever used it. This was flagged directly to the owner this session
while reviewing the BEYOND Launch Vision prototype's own glyph-language design-system panel
(16 glyphs) against the real, locked family (`src/ui/icons/Icon.tsx`, 7 glyphs) — a real,
concrete gap, not a stylistic guess. The owner reviewed rendered candidates for four new glyphs
across two passes (multiple options per glyph, several explicitly rejected on sight) and approved
final geometries for `search` and `backup`; `history` and `schedule` were approved unchanged from
the first pass. This Drop wires the four approved glyphs in.

## Approved baseline

`origin/master` at `54164d2a828f8e7f85cfad9c2ca740ed47804491`, verified via
`git fetch origin master && git rev-parse origin/master` — INTENT-ARBITRATION-001's own closure
commit.

## Risk classification

**ROUTINE.** Same class as `more`'s own addition (Overdrive Phase 14) and `GLYPH-001`'s scoped
exception: pure, additive SVG glyphs wired into an existing, already-built optional icon slot
(`CollapsibleRow`'s `icon` prop) plus one small structural addition to a `tool-label` that had no
icon slot before (BACKUP's). No engine/schema/persistence/dependency change, no IA change — every
row keeps its existing name, summary, and `onOpen` behavior; only a decorative, `aria-hidden`
glyph is added beside each. None of the Architectural/High-Risk triggers in
`.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Direct owner review (the authorizing decision)

Conducted this session via rendered candidate sheets (not hand-waved descriptions): pass 1
covered `history`/`search`/`schedule`/`backup` with 1-2 options each; several were explicitly
rejected on sight (a `history` idea that read as "delete," a `schedule` idea requiring a true
circular arc — against the family's own "no true circles" rule, a `backup` idea that
accidentally read as a house). Pass 2 redid `search` and `backup` specifically per the owner's
"take another pass" instruction. Final approval: **"Search B and backup A, ship it."** — B/A
referring to the labeled candidates in the pass-2 sheet.

## Authorized scope

- `src/ui/icons/Icon.tsx`: extend `IconName` with `"history" | "search" | "schedule" | "backup"`
  (purely additive — the existing seven-member union is untouched) and add their `PATHS` entries,
  matching the locked family's stroke conventions (`strokeWidth={1.7}`, `strokeLinejoin="miter"`,
  `strokeLinecap="square"`, `fill="none"` except small filled-diamond cores, matching
  `mission`/`body`'s own convention). Update the header comment with a GLYPH-002 addendum in the
  same style as GLYPH-001's, describing the four additions and why each shape was chosen.
- `src/ui/screens/more/MoreScreen.tsx`:
  - `MISSIONS & OBLIGATIONS` row: `icon={<Icon name="mission" size={20} />}` — reusing the
    already-locked `mission` glyph (already used for TODAY's own field-header), not a new one.
  - `WORK SCHEDULE` row: `icon={<Icon name="schedule" size={20} />}`.
  - `HISTORY` row: `icon={<Icon name="history" size={20} />}`.
  - `SEARCH` row: `icon={<Icon name="search" size={20} />}`.
  - `BACKUP`'s `equipment-row` tool-label (not a `CollapsibleRow` — it's an immediate action, per
    the file's own existing "Backup/Archive/Restore are immediate actions... use `.equipment-row`
    instead" doctrine comment): add the same icon+label flex treatment `CollapsibleRow` already
    uses internally (`display: flex, alignItems: center, gap: 6`), with `<Icon name="backup"
    size={20} />` — the one small structural addition beyond "just pass a prop to an existing
    slot," since no icon slot existed there before.
- Tests: new `tests/browser/Icon.test.tsx` (smoke-renders every `IconName`, including the four new
  ones, plus dedicated coverage of `CollapsibleRow`'s `icon` prop — previously exercised only
  indirectly via `ResetCard`/`ShiftDownCard`, never asserted at the `CollapsibleRow` level itself);
  two new cases in `tests/browser/MoreScreen.test.tsx` proving exactly the five intended rows
  gained a glyph and the untouched rows (`DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM
  PROGRAMS`, `REVIEW`) did not.

## Explicit exclusions

- No change to any of the six frozen glyphs (`mission`, `train`, `body`, `reset`, `shiftDown`,
  `success`) or to `more` — this Drop only adds four new entries.
- No fix to the pre-existing, separately-noticed defect that `success` is orphaned (`ConfirmIcon`/
  `ResolveIcon` hardcode their own diamond+check paths rather than referencing `PATHS.success`) —
  real, but a distinct finding from a different investigation, not part of this owner's ruling.
- `DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM PROGRAMS`, and `REVIEW` rows stay icon-less —
  no glyph was designed or approved for these; adding one would be scope creep beyond what was
  reviewed and approved.
- No change to `ARCHIVE`/`SHARE` or `RESTORE`'s own `equipment-row`/`<details>` treatment — only
  `BACKUP` was in scope, matching the one `backup` glyph actually designed and approved.
- No change to the app/PWA icon (`public/icons/*`, `docs/brand/beyond-mark/*`) — that's EMBLEM
  territory, already correct and deployed (verified separately this session), unrelated to the
  destination-glyph family this Drop touches.

## Relevant authority / references

- `src/ui/icons/Icon.tsx`'s own header comment and `GLYPH-001`'s prior scoped-exception
  precedent, and the `more` glyph's own Overdrive-Phase-14 "new, additive... not a redesign of
  any locked one" precedent — this Drop follows the exact same additive pattern for four more
  entries.
- Direct owner review of two rendered candidate sheets this session (described above under
  "Direct owner review"), ending in the explicit instruction "Search B and backup A, ship it."

## Required invariants

- `src/engine/**` untouched.
- The six frozen glyphs and `more` remain byte-for-byte unchanged.
- Every `CollapsibleRow`'s accessible name (`aria-label="Open {name}"`) is unchanged — the new
  icons are `aria-hidden`, purely decorative reinforcement, same convention as every existing
  glyph in this family.
- `DECISION JOURNAL`, `EXERCISE LIBRARY`, `CUSTOM PROGRAMS`, `REVIEW`, `ARCHIVE`, and `RESTORE`
  render with no icon, unchanged from before this Drop.

## Acceptance criteria

- `npx tsc -b`, `npm run check:architecture`, `npx vitest run --project node`,
  `npx vitest run --project browser`, `npm run build` all pass.
- `tests/browser/Icon.test.tsx` proves all eleven `IconName` values (seven existing + four new)
  render a valid, `aria-hidden` `<svg>` with at least one path.
- `tests/browser/MoreScreen.test.tsx` proves exactly the five intended surfaces gained a glyph
  and the explicitly-excluded rows did not.

## Required verification

Standard ROUTINE gate per `.claude/skills/beyond-drop/SKILL.md` §3 — full verification (typecheck,
architecture boundaries, node + browser test projects, build) run in full before opening the PR.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR and
stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only. Specifically verify: the diff touches only `Icon.tsx`,
`MoreScreen.tsx`, and the two new/extended test files (nothing in `attentionPolicy.ts`,
`CollapsibleRow.tsx`'s own component logic, or any other screen); the four new glyph paths are
genuinely new entries (not a redraw of any of the six frozen ones or `more`); `DECISION JOURNAL`/
`EXERCISE LIBRARY`/`CUSTOM PROGRAMS`/`REVIEW`/`ARCHIVE`/`RESTORE` genuinely still render with no
icon. Tagged CONFIRMED/PLAUSIBLE, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved, reviewed,
green PR; no admin-bypass; closes `ACTIVE_DROP.md` via `node scripts/factory-drop.mjs close
GLYPH-002 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to also design/add icons for `DECISION JOURNAL`/`EXERCISE LIBRARY`/`CUSTOM
  PROGRAMS`/`REVIEW` — none were reviewed or approved; that's a separate future ask.
- Any temptation to "also fix" the orphaned `success` glyph while in this file — a real, distinct
  finding, explicitly excluded from this Drop's scope above.
- Any temptation to touch the app/PWA icon or EMBLEM assets — unrelated, already correct, and out
  of scope for this glyph-family Drop.
