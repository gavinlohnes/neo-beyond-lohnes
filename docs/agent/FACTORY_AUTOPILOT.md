# BEYOND Factory Autopilot

Factory Autopilot is a deterministic status and next-action layer over the existing Drop Factory.
It removes owner relay work; it does not replace Builder, Reviewer, Integrator, or owner judgment.

## Protected campaign contract preregistration

An authorized campaign Drop may enter `BUILDING` only when its complete Drop contract already
exists on protected `origin/master`. The contract declares `baseline: AT_ACTIVATION`; Factory then
binds the exact build baseline to the freshly fetched protected-master SHA at activation. This
avoids predicting the preregistration merge SHA while ensuring a Builder branch cannot establish
or redefine its own authority.

For campaign Drops, Factory resolves campaign membership, risk, contract path, contract content,
and contract digest from protected `origin/master`. The checkout must contain the identical
contract or activation fails closed. `ACTIVE_DROP.md` records routing and the actual activation
baseline only; neither it nor working-tree/PR-controlled files are authorization inputs. Campaign
revision/digest validation, risk ceilings, escalation rules, protected integration, exact-head CI,
and independent review remain unchanged.

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

Campaigns are versioned JSON manifests under `docs/agent/campaigns/`. Schema v1 and manifest
booleans are legacy, non-authorizing inputs. A schema-v2 manifest contains
an ordered list of bounded Drops, shared invariants/non-goals, a risk ceiling, dependencies,
escalation conditions, and completion criteria. `DRAFT` is deliberately non-operational.
Any `HIGH-RISK` Drop also requires `owner_ruling: { "obtained": true, "reference": "..." }` in
the approved manifest; a campaign-level risk ceiling never substitutes for that ruling.

Campaign authority requires a domain-separated `CAMPAIGN_AUTHORIZATION` declaration containing
the monotonic campaign revision, deterministic manifest digest, Owner login, authorization PR,
expiry, work classes, risk ceiling, and prohibited boundaries. Live GitHub evidence must be a
formal Owner `APPROVED` review on that exact revision whose body is exactly typed JSON:
`{"type":"CAMPAIGN_AUTHORIZATION","revision":"<revision>","digest":"<digest>"}`. The formal
review's GitHub `commit_id` must equal the manifest commit derived from trusted master. Ordinary PR approval, comments,
labels, prose, Builder identity, and synthetic fixtures never authorize a campaign.

PAUSE, RESUME, REVOKE, and ESCALATE are typed Owner lifecycle events bound to the same revision
and digest. PAUSE is resumable only while authority is unchanged and valid; REVOKE is terminal
for that revision. High-Risk Drops still require their own explicit Owner ruling.

To activate an authorized campaign, commit its exact reviewed manifest and then add
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

## Builder App identity bootstrap

The one-shot `Builder Identity Bootstrap` workflow migrates the in-flight
FACTORY-AUTOPILOT-001 candidate from an owner-authored PR to a PR authored by the repository-only
BEYOND Builder GitHub App. It uses the official token action pinned to an exact commit, requests
only Contents and Pull requests write access, disables checkout credential persistence, and lets
the action revoke the short-lived installation token at job completion. The private key and token
are never repository files or command output.

Before mutation, the bootstrap verifies the token action's installation ID, configured App ID,
App slug, source PR author, and exact source head. After PR creation it verifies the observed bot
account type/login. It creates a replacement candidate from that exact commit, then adds one
App-authored routing commit so `ACTIVE_DROP.md` points to the replacement PR. It does not merge,
approve, close, or delete either PR. A fresh formal exact-head
review is still mandatory. The source-specific push trigger is intentionally not a general agent
credential service or an autonomous integration path.

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
