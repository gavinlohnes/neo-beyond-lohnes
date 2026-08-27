---
id: <DROP-ID>
baseline: <exact origin/master SHA — fetched fresh via `git fetch origin master`, never assumed>
risk_tier: ROUTINE | ARCHITECTURAL | HIGH-RISK
---

# <DROP-ID> // <TITLE>

This is the canonical, repository-native Drop Contract format — see
`.claude/skills/beyond-drop/SKILL.md` §9 (Development Factory V1) for the full mechanism this
file participates in. Copy this file to `docs/agent/drops/<DROP-ID>.md`, fill in every section,
and keep the frontmatter's `id`/`baseline`/`risk_tier` in sync with the body — both
`node scripts/factory-drop.mjs validate` and `init` check that the frontmatter is present,
well-formed, and that every section heading below still exists verbatim (see
`REQUIRED_CONTRACT_SECTIONS` in `scripts/factory-drop.mjs`) before allowing a launch. Renaming a
heading here requires updating that list in the same change.

## Mission

<One paragraph: what this Drop delivers and why. Restate the owner's actual authorization in
your own words — do not invent scope beyond it.>

## Approved baseline

`origin/master` at `<sha>`, verified via `git fetch origin master && git rev-parse origin/master`
— a fact re-derived at launch time, never assumed from a prior session or local branch state.

## Risk classification

<ROUTINE | ARCHITECTURAL | HIGH-RISK, per `.claude/skills/beyond-drop/SKILL.md` §1 — semantic,
not path-based. Name which trigger(s) apply, or state "none of the Architectural/High-Risk
triggers apply" if this is Routine.>

## Authorized scope

<Bulleted list of exactly what may be built or changed. Nothing outside this list is in scope,
regardless of how small or adjacent it looks mid-implementation.>

## Explicit exclusions

<Bulleted list of what this Drop must NOT do, even if tempting or seemingly related.>

## Relevant authority / references

<Which docs/rulings ground this Drop: `CLAUDE.md` sections, `docs/UX_DECISIONS.md` entries, a
direct owner ruling (quoted or dated), other `docs/agent/*` files, a prior Drop's field
evidence, etc.>

## Required invariants

<What must remain true throughout and after this Drop — architecture boundaries, product
doctrine, protected fixtures, etc. See `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` for the
shared baseline; name anything specific to this Drop beyond that.>

## Acceptance criteria

<Concrete, checkable statements of "done" — not "looks right" but "command X returns Y",
"test Z exists and passes", "fresh-agent recovery test proves W".>

## Required verification

<Which commands must run and pass before a PR is opened. Reference
`.claude/skills/beyond-drop/SKILL.md` §3 for the standard gate (`npm run verify`) and name any
additional targeted verification this Drop's boundary requires (e.g. a High-Risk compatibility
surface, or this Drop's own new scripts/tests).>

## Builder expectations

- Work only in an isolated branch/worktree cut from the exact baseline above (`git fetch origin
  master && git worktree add ../beyond-worktrees/<agent>-<slug> -b <branch> origin/master`).
- Implement exactly the authorized scope; treat any expansion as a STOP condition, not a
  judgment call.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.
- Persist a concise Builder handoff on the PR itself (see
  `.claude/skills/beyond-drop/SKILL.md` §9's Builder Handoff Contract) so a fresh agent/session
  can recover what was done without the owner relaying it by hand.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only —
  never the Builder's own session reasoning.
- Adversarial by default against the diff's actual risk surface.
- Every finding evidence-backed (file:line citation plus a reproducible failure scenario, or a
  named doctrine violation), tagged CONFIRMED or PLAUSIBLE.
- **Must persist exact-head-bound review evidence as a durable PR comment or PR review** — see
  `.claude/skills/beyond-drop/SKILL.md` §9's Reviewer Evidence Contract. At minimum: the exact
  reviewed head SHA, a verdict, substantive findings (or an explicit "none"), and a
  merge-readiness statement. Finishing only inside a private conversation does not satisfy this
  Drop's Reviewer expectations — the owner must never need to relay the review by hand.
- Never merges, never self-authorizes a scope change — escalate conflicts to the owner.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed (when required), green PR.
- No admin-bypass of any required check, ever.
- After merge: retire this Drop's `ACTIVE_DROP` record via `node scripts/factory-drop.mjs close
  <DROP-ID> --integration-sha <merge-commit-sha>` (see SKILL.md §9's closure procedure). This
  Drop Contract file itself is never deleted, overwritten, or rewritten by closure.

## Stop / escalation conditions

<Concrete conditions under which implementation must stop and escalate rather than guess — e.g.
this contract conflicts with higher repository authority; a required artifact/authority is
missing; an unsafe or conflicting launch condition is detected; a genuine product/authority
ambiguity that only the owner can resolve.>
