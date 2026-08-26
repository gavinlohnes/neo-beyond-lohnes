# BEYOND Delivery Protocol

Repository-native operating protocol for agent-delivered BEYOND Drops. This encodes the
delivery model already established by `CLAUDE.md` and `.claude/skills/beyond-drop` — it does
not add product doctrine, and it does not replace either. Where this document and `CLAUDE.md`
appear to disagree, `CLAUDE.md`'s authority order governs, and the disagreement should be
surfaced rather than silently resolved.

## Standing rules

- **Repository truth outranks stale planning assumptions.** A brief, roadmap, or memory of a
  prior session describes intent at the time it was written. The current code, current tests,
  and current `origin/master` describe what actually exists now. Verify before acting on a
  claim from any planning document.
- **Direct owner decisions and current authority documents govern product behavior.** See
  `CLAUDE.md`'s authority order. No Drop brief, however detailed, outranks a direct owner
  ruling or a locked Decision Register entry.
- **Every Drop is a bounded vertical slice.** One objective, one set of expected files, one
  risk tier, one report. A Drop that grows a second objective mid-flight should be split, not
  absorbed.
- **One active builder per overlapping subsystem.** Before starting, check for in-flight work
  touching the same files or the same subsystem and avoid stepping on it.
- **Inspect before modifying.** Read the current state of every file, script, and doctrine
  document a Drop touches before changing it — including this protocol itself.
- **Smallest sufficient implementation.** Solve the stated objective; do not solve adjacent or
  hypothetical problems in the same change.
- **No speculative abstraction.** Do not build generalized infrastructure for a need that does
  not yet exist. Three similar lines beats a premature abstraction.
- **No silent architecture expansion.** A new cross-layer call path, a new dependency, or a new
  persistent structure is a decision, not a side effect — it is named and justified, not
  introduced quietly inside an unrelated change.
- **No product scope expansion from research alone.** Research, exploration, or an agent's own
  read of the roadmap does not authorize new product surface. Only a Drop brief or a direct
  owner decision does.
- **Deterministic Engine authority remains protected.** `src/engine/**` stays pure and
  deterministic; a recommendation-policy or selection-rule change is at minimum an
  Architectural Drop and follows `.claude/rules/engine.md`.
- **Operator authority remains protected.** INFORM → INTERPRET → RECOMMEND → USER DECIDES is
  not renegotiated by a Drop. The system reports and recommends; the user decides.
- **Migrations/backups/fixtures remain compatibility-sensitive.** Any change touching
  `src/persistence/db.ts` schema, `backup.ts`/`restore.ts`, legacy-format compat, or
  `test-fixtures/protected/**` is High-Risk by default — see `.claude/rules/persistence.md` and
  `.claude/rules/protected-fixtures.md`.
- **Tests must prove behavior, not merely implementation.** A test that only re-asserts what
  the code does, without exercising an actual behavioral contract, does not count as coverage
  for a Drop's claims.
- **Concurrency/failure states must be considered where relevant.** Where a change touches
  writes, day-refresh ownership, or anything that can race, the failure and partial-completion
  paths are part of the Drop's scope, not a follow-up.
- **Browser/accessibility verification when UI changes.** A UI-visible change is checked in a
  real browser before being reported complete, per this repo's UI verification workflow.
- **FIELD testing when operator experience changes.** A change to what the operator sees or
  does in the field is verified against the FIELD contract in `docs/UX_DECISIONS.md`, not just
  against unit tests.
- **Protected fixtures and architecture boundaries must remain intact.** `npm run
  check:architecture` and the fixture-integrity gate in `npm run check:risk` are hard checks,
  not advisory ones.
- **Verify before PR.** Run the verification appropriate to the Drop's risk tier before opening
  a PR — see `.claude/skills/beyond-drop` §3.
- **Independent adversarial review for meaningful/high-risk changes.** An Architectural or
  High-Risk Drop gets a review pass that is not the same pass that wrote the change.
- **Repository facts must be recorded precisely using commit SHAs rather than assumptions.**
  "Current master" is not a fact until it is a specific SHA, fetched and verified directly —
  never assumed from memory or from a prior session's notes.
- **Stop when the authorized Drop is complete.** Do not continue into the next Drop, the next
  campaign, or adjacent cleanup once the stated objective is met and verified.

## The Drop contract

Every Drop states this contract before implementation begins:

```
OBJECTIVE:
USER VALUE:
BASELINE:              (exact commit SHA, verified — not assumed)
EXPECTED FILES/SURFACES:
EXCLUSIONS:
RISK CLASS:             ROUTINE | ARCHITECTURAL | HIGH-RISK
TEST PLAN:
FIELD TEST:             (or: not applicable — no operator-visible change)
STOP RULE:
```

Risk classification is semantic, not path-based — a path match is a prompt to inspect, not an
automatic verdict. See `.claude/skills/beyond-drop` §1 for the full classification rules, task-
contract templates, report templates, and ship procedure. This document does not duplicate that
detail; it exists to state the standing rules a Drop is expected to already be following.
