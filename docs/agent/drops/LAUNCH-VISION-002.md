---
id: LAUNCH-VISION-002
baseline: 9b1103942271b12deca045479da10a500cc9f5df
risk_tier: ARCHITECTURAL
---

# LAUNCH-VISION-002 // BODY PRIMARY-ACTION RED-BUDGET CARVE-OUT

## Mission

Fix a real, observed second-order consequence of LAUNCH-VISION-001: with `.btn-primary` red
app-wide, BODY — which renders one primary log action per tracker on a single long-scrolling
screen (LOG WATER, LOG SLEEP, LOG BODYWEIGHT, LOG PROTEIN, meal logging) — now shows several
solid red buttons simultaneously in one view. This was found by actually running current
`master` and looking at the whole screen, not inferred from source. Per direct owner ruling
(this conversation, 2026-09-03): scope a real fix and record it in the Decision Register, not
leave it as an unexamined side effect.

The fix: BODY's primary actions revert to the neutral near-white/near-black fill, consistent
with BODY's own pre-existing, already-locked "deliberately lower red budget... no tracker is
instrumented as the leader" doctrine for its STATUS instrument-cluster — extended here to its
LOG actions for the same reason, not a new invented rule. TODAY and TRAIN, which only ever show
one dominant action at a time, keep the red fill from LAUNCH-VISION-001 unchanged.

## Approved baseline

`origin/master` at `9b1103942271b12deca045479da10a500cc9f5df`, verified via
`git fetch origin master && git rev-parse origin/master` immediately before worktree creation.
This is LAUNCH-VISION-001's own merge commit plus its closure commit.

## Risk classification

ARCHITECTURAL. Same reasoning as LAUNCH-VISION-001: this scopes/partially reverses a very
recent, explicitly recorded Decision Register entry (LAUNCH-VISION-001's "Visual system — red
budget"), which needs its own recorded amendment, not just a CSS diff. No HIGH-RISK trigger
applies (no Engine/domain/persistence/schema/backup/correction/fixture/dependency change).

## Authorized scope

- Amend `docs/UX_DECISIONS.md`'s "Visual system — red budget" entry (in place — this is a
  correction/refinement of a days-old entry, not a new unrelated section) to record the BODY
  carve-out: BODY's `.btn-primary` is neutral again, TODAY/TRAIN/MORE stay red, with the
  reasoning above.
- `src/ui/styles/global.css`: add a `.body-field .btn-primary` override reusing `--text-1`/`--bg`
  (already implemented in this worktree — see the diff) — no new color, no change to `.btn-
  primary`'s own base rule, no change to `.btn-danger` or any other class.
- A browser test (`tests/browser/BodyScreen.test.tsx`) asserting a real rendered BODY
  `.btn-primary` (e.g. LOG WATER) computes to the neutral fill, not the app-wide red — this gap
  is exactly why LAUNCH-VISION-001 shipped without anyone (owner or Builder) seeing the stacked-
  red effect until a live visual pass caught it; verification should not go back to source-only
  next time.
- Before/after screenshots of BODY's LOG section confirming the fix, plus a spot-check that
  TODAY/TRAIN's primary actions are still red (no regression).

## Explicit exclusions

- No change to `.btn-primary`'s base rule, `--action-primary-bg`/`--action-primary-text`, or any
  TODAY/TRAIN/MORE surface — this is additive/scoped, not a reopening of LAUNCH-VISION-001.
- No change to the "No action needed" quiet-state button — direct owner ruling this same
  conversation: it stays red, no per-state carve-out beyond the BODY-wide one above.
- No change to `.btn-danger`, the STATUS instrument-cluster, chamfer geometry, typography, or
  glyphs.
- No Engine, application, persistence, domain, or recommendation-semantic change.
- No merge, integration, Factory closure, or activation of another Drop by the Builder.

## Relevant authority / references

- Direct owner ruling, this conversation, 2026-09-03: "Change to the red buttons and edit the
  rules" (BODY) and "Keep it red" (the quiet-state button) — asked as two explicit, separate
  questions after a live-app visual pass surfaced both.
- `src/ui/styles/global.css`'s own `.instrument-cluster` doc comment ("BODY's red budget is
  deliberately lower than TODAY/TRAIN's — no red accent at all") — the pre-existing doctrine this
  Drop extends to BODY's LOG buttons, not a new principle.
- `docs/agent/drops/LAUNCH-VISION-001.md` and its `docs/UX_DECISIONS.md` entry — the decision
  being amended here.
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` — "red authority must be earned; significance earns
  intensity" is the doctrine this carve-out restores for BODY specifically.

## Required invariants

- TODAY and TRAIN's primary actions remain red, unchanged from LAUNCH-VISION-001.
- BODY's STATUS instrument-cluster peer-parity (already true, untouched by this Drop) continues
  to hold — no tracker reads as more important than its siblings.
- WCAG AA contrast holds for the reverted neutral fill (already proven in VISUAL-001's original
  history and unchanged here — same literal values, reached via `--text-1`/`--bg` instead of a
  hex literal).
- `.btn-primary:disabled`'s existing treatment is unaffected on every screen, BODY included.

## Acceptance criteria

1. `docs/UX_DECISIONS.md`'s red-budget entry accurately reflects the BODY carve-out.
2. BODY's LOG WATER/SLEEP/BODYWEIGHT/PROTEIN buttons render neutral (near-white/near-black) in
   the real running app, verified live, not just from source.
3. TODAY's primary recommendation action and TRAIN's LOG remain red, verified live (no
   regression from this Drop).
4. A new browser test asserts BODY's neutral fill on a real rendered `.btn-primary`.
5. `npm run verify` passes clean.

## Required verification

- `npm run verify` (architecture boundaries + full test suite + production build).
- `git diff --check`.
- Direct browser inspection (`npm run dev`) of BODY's LOG section (before/after) and a
  TODAY/TRAIN spot-check, with screenshots.

## Builder expectations

- Work only in the isolated worktree/branch cut from the exact baseline above.
- Implement exactly the authorized scope; treat any expansion as a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review, never begin another Drop.
- Persist a concise Builder handoff on the PR itself.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Verify the Decision Register amendment is accurate and doesn't overclaim, the CSS change is
  confined to `.body-field .btn-primary`, TODAY/TRAIN are genuinely unaffected, and the new test
  actually exercises a real rendered button rather than asserting against source.
- Persist exact-head-bound review evidence on the PR with verdict, findings or explicit none, and
  merge-readiness. Never merge or authorize scope expansion.

## Integrator expectations

- In a separate explicitly authorized session, merge only the exact independently approved head
  after required CI succeeds, without bypassing protection.
- After merge: close `LAUNCH-VISION-002` via `node scripts/factory-drop.mjs close
  LAUNCH-VISION-002 --integration-sha <merge-commit-sha>` and commit the closure mutation.

## Stop / escalation conditions

- Stop if `origin/master` moves from the approved baseline before activation, another Drop is
  already `ACTIVE`, or a Factory invariant fails.
- Stop if the fix cannot be scoped to `.body-field` cleanly (e.g. a shared component renders
  outside that wrapper) — escalate rather than widen the selector speculatively.
- Stop on any conflict between this contract and higher repository authority, or on ambiguity
  requiring a product/visual decision beyond what was explicitly ruled on above.
