---
id: MOTION-001
baseline: f54a6e373442af4f189b6e982f67ba9142bac949
risk_tier: ROUTINE
---

# MOTION-001 // Motion easing: ease-out → Terry's Suit cubic-bezier

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in.

## Mission

Swap BEYOND's `--motion-easing` token from the generic `ease-out` to the BEYOND Launch Vision
prototype's "Terry's Suit" direction curve, `cubic-bezier(.2,.8,.2,1)`, so every existing
transition/animation that already consumes `--motion-easing` picks up the snappier, more
deliberate "suit" feel without any per-component change. Continuation of the same "make the
app feel like the prototype" effort as TYPOGRAPHY-001. `docs/UX_DECISIONS.md`'s
LAUNCH-VISION-001 entry names "ambient motion" as one of the "Terry's Suit" elements deferred
pending its own separate, explicitly authorized Drop — this Drop is that authorization, for the
easing curve only.

## Approved baseline

`origin/master` at `f54a6e373442af4f189b6e982f67ba9142bac949`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.

## Risk classification

**ROUTINE.** CSS-only, single custom-property value change. No Engine/domain/persistence/
correction-model/protected-fixture boundary touched. No new/changed dependency. None of the
Architectural or High-Risk triggers in `.claude/skills/beyond-drop/SKILL.md` §1 apply.

## Authorized scope

- In `src/ui/styles/tokens.css`, change `--motion-easing`'s value from `ease-out` to
  `cubic-bezier(.2, .8, .2, 1)`, matching the prototype's Direction B (`--ease` in
  `prototype/launch-vision/`).
- Update that token's existing explanatory comment (Product Experience Sprint P2) with a short
  addendum recording this change, in the same style as TYPOGRAPHY-001's `fonts.ts`/`tokens.css`
  addenda — not rewriting the historical comment.
- Add a short "Visual system — motion" entry to `docs/UX_DECISIONS.md`, following the same
  pattern as TYPOGRAPHY-001's "Visual system — typography" entry, and correct the
  LAUNCH-VISION-001 entry's "ambient motion" language to reflect that the easing curve is now
  authorized (durations remain out of scope — see exclusions).

## Explicit exclusions

- No change to `--motion-fast` (150ms) or `--motion-base` (220ms) — both already sit inside the
  100-250ms target range the Product Experience Sprint P2 comment documents, and are already
  close to the prototype's `--dur-1`/`--dur-2` (140ms/260ms); only the curve shape is a real,
  worth-fixing gap. Changing durations is not in scope for this Drop.
- No change to any of the 12 existing `global.css` call sites that consume `--motion-easing` —
  they inherit the new curve automatically through the token; none should be edited directly.
- No new animation, transition, or component. This Drop changes one existing token's value only.
- No change to `--radius`, `--chamfer`, glyph system, or any other still-deferred "Terry's Suit"
  element.

## Relevant authority / references

- `docs/UX_DECISIONS.md`, LAUNCH-VISION-001 entry: "...ambient motion, an abstract glyph
  family) remains prototype-only pending its own separate, explicitly authorized Drop(s)."
- `src/ui/styles/tokens.css`'s existing Product Experience Sprint P2 comment: motion should
  "explain a state change, never decorate"; durations sit in a 100-250ms target range. This
  Drop does not disturb that constraint — only the easing function changes.
- `prototype/launch-vision/` (Direction B / Terry's Suit tokens): `--ease:
  cubic-bezier(.2,.8,.2,1)`.
- Direct owner approval, this session ("tackle the next steps" — following the same
  fresh-eyes-audit → owner-approved-swap pattern as TYPOGRAPHY-001, itself directly approved).

## Required invariants

- `src/engine/**` untouched (pure CSS-token change only).
- Motion still "explains a state change, never decorates" — no new decorative animation is
  introduced; this Drop only reshapes the timing curve of motion that already exists.
- All 12 existing `var(--motion-easing)` call sites in `global.css` continue to resolve
  correctly (no orphaned reference, no typo in the new value).

## Acceptance criteria

- `npm run verify` passes (architecture check + full test suite + production build).
- `grep -n "motion-easing" src/ui/styles/tokens.css` shows the new `cubic-bezier(.2, .8, .2, 1)`
  value.
- A live `npm run dev` check confirms `getComputedStyle` on an element using
  `var(--motion-easing)` reports the new cubic-bezier function, not `ease-out`.
- `docs/UX_DECISIONS.md` updated to reflect the motion-easing piece as authorized/locked.

## Required verification

`npm run verify` (architecture-boundary check + full vitest suite, node + browser projects +
production build). This Drop touches no dependency/build-pipeline/persistence surface, so no
additional targeted verification beyond the standard gate is required — unlike TYPOGRAPHY-001,
there is no new-dependency or asset-pipeline risk here.

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/claude-motion-001 -b
  claude/motion-001-suit-easing origin/master`).
- Implement exactly the authorized scope; treat any expansion (e.g. touching durations, or any
  other token) as a STOP condition, not a judgment call.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Adversarial by default: confirm the diff really is just the one token value plus the two
  documentation edits named above, with nothing else touched.
- Every finding evidence-backed, tagged CONFIRMED or PLAUSIBLE.
- Must persist exact-head-bound review evidence as a durable PR comment or PR review (a
  same-account "Can not approve your own pull request" GitHub restriction may again make a
  formal APPROVED review mechanically impossible in this environment — if so, document that
  explicitly in the review body as TYPOGRAPHY-001's reviewer did, rather than silently omitting
  it).
- Never merges, never self-authorizes a scope change.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved (or, if formal approval is mechanically blocked per the above,
  explicitly owner-authorized), reviewed, green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  MOTION-001 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- If the exact cubic-bezier value cannot be confirmed against the prototype's actual token
  (e.g. the published Artifact has since changed) — stop and re-verify against
  `prototype/launch-vision/` in this repo rather than assuming from memory.
- Any genuine conflict between this contract and `docs/OPERATOR_INTERFACE_DOCTRINE.md` or
  `CLAUDE.md` — escalate to the owner directly.
