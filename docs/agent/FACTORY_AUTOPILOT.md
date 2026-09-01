# BEYOND Factory Autopilot

Factory Autopilot is a deterministic status and next-action layer over the existing Drop Factory.
It removes owner relay work; it does not replace Builder, Reviewer, Integrator, or owner judgment.

## Authority boundary

- **Deterministic mechanics:** repository identity, current master, campaign/Drop ordering,
  dependencies, active Drop, PR/base/head, required CI, mergeability, exact-head review freshness,
  integration ancestry, closure, and the next legal mechanical state.
- **Independent AI judgment:** architectural and semantic correctness, adversarial product review,
  doctrine compliance, and whether a concrete defect remains. Autopilot checks durable evidence;
  it never manufactures the verdict.
- **Owner judgment:** product-choice forks, doctrine conflicts, destructive/non-additive migration,
  privacy/security boundaries, recurring external cost, material scope expansion, or new authority
  for automation, a provider, or AI.

## Campaign authorization

Campaigns are versioned JSON manifests under `docs/agent/campaigns/`. An approved manifest contains
an ordered list of bounded Drops, shared invariants/non-goals, a risk ceiling, dependencies,
escalation conditions, and completion criteria. `DRAFT` is deliberately non-operational.
Any `HIGH-RISK` Drop also requires `owner_ruling: { "obtained": true, "reference": "..." }` in
the approved manifest; a campaign-level risk ceiling never substitutes for that ruling.

To activate an owner-approved campaign, commit its manifest with `status: APPROVED`,
`authorization.owner_approved: true`, and `authorization.approved_by`; then add
`docs/agent/ACTIVE_CAMPAIGN.json` pointing to the manifest. The command derives and verifies the
manifest's actual commit from `origin/master` and refuses a working copy that differs from remote
truth. The pointer makes the campaign discoverable. It does not assign a Builder or implement a
Drop. Each Drop still requires explicit role authorization and canonical `factory-drop.mjs init`.

## Machine-readable status

Run `npm run factory:status`. It fetches `origin/master`, reads repository-native campaign/Drop
state, and—when a PR exists—derives GitHub PR/check/review state through a narrow REST boundary.
Output is JSON with a stable `action` and, on refusal, an `escalation.code`.

Legal outcomes include `NO_CAMPAIGN`, `LEGACY_DROP_ACTIVE`, `DROP_READY`, `WAITING_FOR_PR`,
`WAITING_FOR_CI`, `FIX_VERIFICATION`, `WAITING_FOR_REVIEW`, `STALE_APPROVAL`,
`READY_FOR_INTEGRATION`, `READY_FOR_CLOSURE`, `CAMPAIGN_COMPLETE`, and `ESCALATION_REQUIRED`.
Unknown or contradictory evidence always fails closed.

`--campaign <path>` inspects a non-active manifest. Synthetic GitHub state is accepted only with
`--diagnostic-synthetic --github-state <path>` and only from JSON fixtures under
`tests/fixtures/factory-autopilot/`. Output labels evidence as `LIVE_GITHUB`,
`SYNTHETIC_FIXTURE`, or `REPOSITORY_ONLY`; synthetic evidence can never yield integration or
closure readiness.

`escalation_conditions` is an approved allowlist, not subjective auto-detection. A human or AI
that identifies one supplies `--escalation <CODE>`; a declared code yields
`OWNER_DECISION_REQUIRED`, while undeclared codes fail closed. Mechanical conditions remain
detected directly from repository/GitHub state.

Integration readiness requires a formal GitHub `APPROVED` review whose `commit_id` is the current
PR head, from an eligible collaborator other than the PR author. Comments may preserve findings
but never authorize. A moved head invalidates approval. GitHub proves account/state/head binding,
not stronger separate-session provenance; Builder/Reviewer session separation remains a
procedural trust boundary and insufficient identity evidence fails closed.

## Owner-work metric

Before this Drop the owner routinely relayed baseline/head SHAs, active Drop and PR pointers, CI
results, review verdicts, merge eligibility, closure instructions, and next-step prompts. Autopilot
derives those mechanics from Git/GitHub/CI/repository truth and emits one next legal action.

After this Drop Gavin still must:

1. approve product intent and bounded campaign decomposition;
2. provide real-world feedback;
3. decide only explicit escalation conditions;
4. assign role-capable sessions until a future host can dispatch sessions without collapsing role
   separation.

Residual friction: session dispatch is host-level; GitHub credentials must be available; independent
review remains real judgment; protected merge and canonical closure still run in a separately
authorized Integrator context. These are integrity boundaries, not owner message-bus work.

## M1 dogfood state

`docs/agent/campaigns/M1.json` is intentionally `DRAFT` with no Drops. It makes the next campaign's
shape discoverable without inventing its decomposition or authorizing product work in this Drop.
