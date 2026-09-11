---
id: GLYPH-001
baseline: 103fa6778475f850192fb28bb7bf1aa75fc66de8
risk_tier: ROUTINE
---

# GLYPH-001 // SHIFT DOWN icon: triple-chevron → down-arrow

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in.

## Mission

Replace the `shiftDown` glyph's geometry in `src/ui/icons/Icon.tsx` — currently three stacked
decreasing chevrons (a "signal fade" motif) — with the BEYOND Launch Vision prototype's simpler
down-arrow-into-a-baseline shape, per direct owner comparison and approval this session. The
owner's own words: "way simpler" — the triple-chevron reads ambiguously (could suggest scroll,
signal, or "more below"); an arrow dropping onto a line reads immediately as "put this down."
This is a deliberate, narrow un-freezing of one icon's locked geometry, not a whole-family
redesign — `Icon.tsx`'s header comment ("Geometry is frozen — do not redraw or reinterpret")
governs the family as a whole; this Drop is the explicit, scoped exception for one glyph, owner
one, owner-authorized in this session.

## Approved baseline

`origin/master` at `103fa6778475f850192fb28bb7bf1aa75fc66de8`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

**ROUTINE.** Pure SVG path geometry change inside one existing React component. No dependency,
no schema/persistence/Engine boundary, no architecture-boundary crossing. None of the
Architectural or High-Risk triggers in `.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Authorized scope

- In `src/ui/icons/Icon.tsx`, replace the `shiftDown` entry in the `PATHS` record with the
  prototype's down-arrow-into-baseline geometry (verified centered in a 24×24 viewBox):
  `M12 4.5 V13.5`, `M8 9.5 L12 13.5 L16 9.5`, `M7 19.5 H17`, stroke-only (`fill="none"`),
  matching the family's existing `strokeLinejoin="miter" strokeLinecap="square"` convention.
- Update `Icon.tsx`'s header comment with a short addendum recording this one-glyph exception,
  in the same style as prior Drops' token-comment addenda — not rewriting the "frozen" framing
  for the other five glyphs, which remains true and unchanged.

## Explicit exclusions

- No change to `mission`, `train`, `body`, `reset`, `success`, or `more` — only `shiftDown`.
- No change to `SignalIcon`, `ResolveIcon`, `ConfirmIcon`, or any `.icon-*` CSS animation —
  verified the `.icon-signal` pulse (`global.css`) animates the whole `<svg>` via opacity only,
  shape-agnostic, so it needs no change to keep working with the new path.
- No change to icon `size`, `viewBox`, or the family's shared stroke-width/linejoin/linecap
  conventions — the new path matches them.
- No broader "does the glyph family still belong next to the emblem" redesign — that question
  (raised this session, comparing the family against EMBLEM-001) stays open and deferred; this
  Drop is the one specific, owner-approved exception, not a precedent for silently redrawing
  the rest.

## Relevant authority / references

- Direct owner approval, this session: comparing `Icon.tsx`'s current `shiftDown` render
  against the BEYOND Launch Vision prototype's equivalent glyph side by side, then "do the
  shift down swap."
- `src/ui/icons/Icon.tsx`'s own header comment: geometry frozen "since Phase B.1... do not
  redraw or reinterpret" — the standing rule this Drop is the explicit, scoped exception to.
- `prototype/launch-vision/` / the BEYOND Launch Vision Artifact's `G_PATHS.shiftDown` for the
  source geometry (recentered during integration verification — the prototype's own copy had a
  ~2.5px off-center bug, already caught and fixed in the prototype itself earlier this session;
  this Drop uses the corrected, centered version).

## Required invariants

- `src/engine/**` untouched (pure icon-geometry change only).
- Every other locked glyph (`mission`, `train`, `body`, `reset`, `success`, `more`) byte-for-byte
  unchanged.
- `SignalIcon`/`ResolveIcon`/`ConfirmIcon` and their CSS animations continue to work unmodified.
- Icon renders `aria-hidden` as before — no accessible-name regression, since the adjacent text
  label remains the accessible name per the existing convention.

## Acceptance criteria

- `npm run verify` passes (architecture check + full test suite + production build).
- `grep -n "shiftDown:" src/ui/icons/Icon.tsx` shows the new down-arrow path data.
- A live `npm run dev` screenshot of a screen that renders the `shiftDown` icon (TODAY's SUPPORT
  section, or wherever it's currently used) shows the new down-arrow, not the old triple-chevron.
- No existing test asserting on `shiftDown`'s specific path data breaks (search first; if one
  exists and hard-codes the old geometry, that's this Drop's to update, not a STOP condition —
  it's testing exactly what this Drop intentionally changes).

## Required verification

`npm run verify` (architecture-boundary check + full vitest suite, node + browser projects +
production build). No dependency/build-pipeline/persistence surface touched, so no additional
targeted verification beyond the standard gate and the live-render screenshot above.

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/claude-glyph-001 -b
  claude/glyph-001-shift-down-arrow origin/master`).
- Implement exactly the authorized scope; treat any expansion (touching another glyph, or
  broadening this into a family-wide redesign) as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm the diff really is confined to `shiftDown` plus its comment
  addendum — nothing else in `Icon.tsx`, no CSS changes, no other glyph touched.
- Confirm the new path's bounding box is actually centered in the 24×24 viewBox (the contract
  claims this was verified — check the math, don't just trust the claim).
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review (the
  same-account "Can not approve your own pull request" GitHub restriction may again make a
  formal APPROVED review mechanically impossible in this environment — if so, document that
  explicitly in the review body, as on the prior Drops this session).
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved (or, if formal approval is mechanically blocked per the above,
  explicitly owner-authorized), reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  GLYPH-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- If implementing this reveals a test that hard-codes assumptions about the family being
  fully frozen (e.g. a snapshot test asserting all six glyphs are byte-identical to some stored
  reference) — fix that test to reflect the one authorized exception; do not treat it as a
  reason to abandon the Drop, since the owner directly authorized this exception.
- Any request, mid-Drop, to extend this into more than the one glyph — stop and escalate; that
  is the separate, larger "does the family still belong" question, not this contract's scope.
- Any genuine conflict between this contract and `docs/OPERATOR_INTERFACE_DOCTRINE.md` or
  `CLAUDE.md` — escalate to the owner directly.
