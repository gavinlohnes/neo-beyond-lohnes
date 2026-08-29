---
id: DOCTRINE-001
baseline: 5e2684842c85d2e8ce5fadb50077d6d209abf0ab
risk_tier: ROUTINE
---

# DOCTRINE-001 // OPERATOR INTERFACE DOCTRINE

## Mission

Create one concise, durable constitutional authority for BEYOND's operator interface; route
`CLAUDE.md` to it; lock its adjudication role in the UX Decision Register; preserve the completed
FIELD ALPHA campaign as unchanged historical evidence; and make explicit that doctrine constrains
future implementation but never authorizes it.

## Approved baseline

`origin/master` at `5e2684842c85d2e8ce5fadb50077d6d209abf0ab`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-08-29.

## Risk classification

ROUTINE. Documentation and Factory routing only. No product behavior, architecture, persistence,
dependency, schema, fixture, or implementation semantics change.

## Authorized scope

- Add concise `docs/OPERATOR_INTERFACE_DOCTRINE.md` as the durable constitutional authority.
- Update `CLAUDE.md` to point explicitly to that authority and distinguish it from locked
  implementation decisions.
- Add a compact locked adjudication/reference entry to `docs/UX_DECISIONS.md`.
- Record and activate this Drop through the repository Factory mechanism.

## Explicit exclusions

- Do not modify `docs/FIELD_ALPHA_CAMPAIGN.md`; it remains historical evidence.
- No product, UX, Engine, command/event, persistence, schema, dependency, fixture, or CI changes.
- Do not authorize any future implementation, campaign, feature, or Drop through doctrine text.
- No unrelated documentation cleanup or authority restructuring.

## Relevant authority / references

- Gavin's direct authorization of DOCTRINE-001 on 2026-08-29.
- `docs/FIELD_ALPHA_CAMPAIGN.md` as unchanged historical evidence of the constitutional principles.
- `CLAUDE.md`, `docs/UX_DECISIONS.md`, `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`, and
  `.claude/skills/beyond-drop/SKILL.md`.

## Required invariants

- INFORM → INTERPRET → RECOMMEND → USER DECIDES remains load-bearing.
- Deterministic Engine authority, preserved history/provenance, manual operation, capability
  depth/surface calm, and user authority remain unchanged.
- Accessibility outranks aesthetic purity.
- Doctrine defines constraints and adjudication; only a direct owner decision or approved Drop
  authorizes implementation.
- `docs/FIELD_ALPHA_CAMPAIGN.md` remains byte-for-byte unchanged.

## Acceptance criteria

- One concise doctrine file clearly identifies itself as constitutional authority.
- `CLAUDE.md` explicitly routes product/interface doctrine to it.
- `docs/UX_DECISIONS.md` contains a compact locked adjudication entry referencing it.
- The doctrine expressly disclaims implementation authorization.
- FIELD ALPHA's SHA-256 remains
  `5E21A78BDCCDA63708327C250D55443DC8EE170CFD972B6953024A5D091B8094`.

## Required verification

- Inspect the complete documentation diff for authority consistency and bounded scope.
- Recompute `docs/FIELD_ALPHA_CAMPAIGN.md` SHA-256 and compare with the recorded value.
- `npm run check:risk 5e2684842c85d2e8ce5fadb50077d6d209abf0ab`.
- `npm run verify`.
- `git diff --check` and final clean-diff inspection.

## Builder expectations

- Work only on `codex/doctrine-001-operator-interface-doctrine` from the exact baseline above.
- Implement only the authorized documentation changes and preserve the historical campaign.
- Verify, commit, push, open one PR, persist a Builder handoff, then stop.
- Never self-review or self-merge.

## Reviewer expectations

- Review in a separate session using this contract and the exact final diff.
- Verify authority ordering, doctrine/authorization separation, concision, and byte preservation.
- Persist exact-head-bound review evidence on the PR.
- Never merge or authorize scope expansion.

## Integrator expectations

- Operate in a separate explicitly authorized session after green CI and durable review evidence.
- Never bypass required checks.
- After merge, close DOCTRINE-001 with the canonical Factory command without rewriting this
  historical contract.

## Stop / escalation conditions

- Stop if `origin/master` differs from the approved baseline at activation.
- Stop if another Drop is active.
- Stop if the requested authority hierarchy conflicts with a direct owner ruling or requires
  interpreting new product behavior rather than consolidating established doctrine.
- Stop if `docs/FIELD_ALPHA_CAMPAIGN.md` changes for any reason.
