# DEV-FLOW-002 — BEYOND development workflow

Owner-approved bounded adoption, 2026-10-08. This charter becomes the current development
workflow when its adoption PR merges with owner approval. It replaces conflicting procedural
rules in repository instructions, legacy Drops, Factory records, and skills for new work.
Product doctrine, locked product decisions, engineering invariants, and repository protections
remain binding. This charter governs procedure; it grants no standing product authorization.

Owner amendment, 2026-10-09: [`PRODUCT_DIRECTION`](../PRODUCT_DIRECTION.md) guides creative,
outcome-driven work. EXPLORE / BUILD / REFINE are conversational modes, not additional gates.
Within approved scope, Builders contribute independent product/design/engineering judgment and
resolve routine choices without repeated permission. Favor complete journeys; split PRs only
when risk, complexity, dependencies or reviewability justify it. The brief may describe an
ambitious outcome with clear boundaries rather than prescribe every control. Research/reuse uses
the existing AGENTS.md leverage gate. No extra authorization artifacts or research process.

## Owner authority and Builder responsibility

Gavin controls product direction, priorities, Protected boundaries, material costs, and every PR
merge. Agents may implement ordinary details within an approved objective without repeatedly
asking permission. No agent may independently expand scope, merge a PR, alter repository
protections, or purchase services. An unapproved boundary or unresolved authority conflict stops
the affected work and goes to the owner; already-approved details do not need duplicate approval.

Claude Code, Codex, GPT Work, or another qualified agent may build according to capability,
availability, and cost. Only one active Builder owns a given implementation objective. Reviewers
must independently inspect the changes and must not review their own work. No provider is
specifically required for review or integration.

## One concise durable brief per objective

Keep one short brief in the repository or a GitHub issue/PR. An existing scope document can serve
as the brief; do not create duplicate authorization artifacts. Record:

- Objective and authorization (the owner instruction or approved objective it implements).
- Risk lane, scope, and exclusions.
- Acceptance evidence appropriate to the change.
- Exact starting commit fetched from `origin/master`.
- Builder, branch, and active PR (pending until opened, then linked in GitHub).

Routine work within an approved objective needs no separate authorization PR, formal Drop
contract, or Factory activation. Feature work needs an owner-approved capability/objective.
Protected work needs explicit bounded owner approval before implementation. A Queue entry,
archive, or risk-classifier result does not itself supply approval.

Before editing, read `AGENTS.md` and the current checkpoint, fetch master, inspect local changes
and open PRs, and check for overlapping implementation work. Preserve existing work. Use the
existing isolated cloud checkout; do not create a Git worktree unless the owner requests one.

## Three risk lanes and proportional evidence

| Lane | Typical scope | Verification and handoff |
| --- | --- | --- |
| ROUTINE | Small repairs, accessibility improvements, copy, isolated tests, low-risk polish within an approved objective. | Focused checks that prove the change; concise PR and checkpoint; green required CI; owner merge approval. |
| FEATURE | Owner-approved capabilities and meaningful UI improvements that do not cross Protected boundaries. | Relevant behavior/regression tests and build/type checks as warranted; acceptance evidence; green required CI; owner merge approval. |
| PROTECTED | Governance and authorization authority, product doctrine, Engine/recommendation authority, data schemas/migrations, privacy/security, backup integrity, primary information architecture, consequential AI autonomy, or another protected boundary. | Explicit bounded owner approval, appropriate tests and acceptance evidence, independent exact-head review, resolved findings, green required CI, and owner merge approval. |

Classify the actual meaning and impact of the change, not its file extension. A governance
amendment is Protected even if it changes only Markdown. `npm run check:risk -- <starting-sha>`
provides conservative path evidence; inspect semantic triggers it cannot detect. Do not downgrade
a protected boundary because most of a diff is Routine. Existing dependency, correction-model,
protected-fixture, architecture, and compatibility safeguards still apply.

Verification must be proportional to risk. Run focused tests where they can demonstrate the
result; use `npm run verify` (architecture, full Node/browser suite, typecheck and production
build) when the scope or regression risk warrants it. Existing required CI remains enabled and
unchanged. Do not duplicate full runs without a new change or unresolved failure, and do not run
full browser verification concurrently. Diagnose failures; never weaken assertions or bypass
checks for a green result. Record passed, failed, skipped, and unrun checks honestly.

Protected review is performed by an independently assigned qualified agent/session against the
exact PR head and approved brief. Persist the reviewed SHA, evidence, findings/disposition, and
PASS/BLOCK verdict in GitHub. Head changes require renewed exact-head review. A shared GitHub
account does not establish or defeat session independence; obey existing native review and
branch-protection requirements. The Builder cannot supply its own independent review.

Every PR, including Routine, waits for explicit owner merge approval. Preparing a PR does not
authorize integration. No self-merge, automatic merge, admin bypass, direct-master shipping, or
repository-protection change is permitted by this workflow. Any integration delegation must be
explicitly owner-authorized and separate from the Builder's work.

## Product identity and engineering safeguards

Preserve the Operator Interface Doctrine, UX Decision Register, engineering contract, path rules,
and architecture checks. In particular:

- INFORM → INTERPRET → RECOMMEND → USER DECIDES; one primary recommendation with deterministic
  Engine authority, never a competing recommendation engine.
- No silent AI changes to user plans; manual input, correction routes, and user control remain.
- Local-first and offline-first operation; event provenance, correction integrity, historical
  fixtures, backup integrity, and preview/confirmation safeguards remain.
- Existing architecture-layer boundaries and protected compatibility checks remain.
- BEYOND's distinctive futuristic black/red command-center direction remains; accessibility,
  readable text, adequate controls, contrast, and reduced motion remain binding.
- Smart by design, AI optional: Delta's active AI implementation is slated for separately
  approved cleanup, not required future development. Preserve deterministic intelligence and
  user authority; future AI needs a new owner decision. This governance transition removes no code.

The charter neither changes product functionality nor approves future provider/backend, schema,
Engine, primary-navigation, or AI-autonomy work. Google Drive is a planning archive, not a
competing implementation authority. Resolve genuine product-authority conflicts with the owner.

## Cost, continuity, and historical evidence

Prefer the most suitable available agent without unnecessary subscriptions, duplicate work, or
excessive verification. Maintain a concise GitHub checkpoint in `docs/agent/CURRENT_CHECKPOINT.md`
or the linked active PR: objective/authorization, Builder, branch/PR, verified results, remaining
risks, and next action. Before switching Builders, commit and push recoverable work in GitHub
and record the next action; do not rely on a chat as the sole handoff. Never commit secrets.

For new work after adoption, mandatory Factory lifecycle steps, routine closure PRs, mandatory
authorization PRs, formal Drop requirements, and permanent provider-specific Builder roles are
retired. Historical Drops, Factory records, contracts, and review evidence remain intact. Old
active/routing pointers do not grant authority or impose the retired lifecycle on new objectives.
Factory implementation and its tests remain available as legacy tooling; no CI is disabled and
Factory Phase 2 is not activated. A future change to that tooling is a separate approved objective.

VCC-001's existing approved scope document remains its brief. After adoption, a fresh Builder
records the exact fetched master starting commit, ownership, and active PR there or in the linked
PR/checkpoint. Factory activation/closure and provider-specific roles are retired; all State Rail
scope, exclusions, behavior, acceptance criteria, six screenshots, and independent exact-head
review remain. This adoption does not implement or start State Rail.

## Adoption brief

- **Objective / authorization:** Gavin explicitly approved one bounded Protected adoption PR on
  2026-10-08 to implement DEV-FLOW-002 and reconcile existing instructions.
- **Risk lane:** PROTECTED — development governance.
- **Starting commit:** `9cf48c07b4b4e1ff807983dbc845d06a2de6eedb`, freshly fetched master;
  PR #200 is merged at that commit.
- **Scope:** this charter; conflicting procedural instructions; governance risk guidance and
  focused regression tests; VCC-001 procedural transfer; concise checkpoint.
- **Exclusions:** product changes, State Rail implementation, historical-record deletion,
  Factory activation/Phase 2, CI/protection changes, merges, PR #201 changes, Drive changes,
  paid services, and unrelated work.
- **Acceptance evidence:** documentation/authority consistency, preserved VCC product sections,
  risk regression tests, architecture, TypeScript, production build, and existing required CI;
  independent exact-head review and owner approval remain prerequisites to integration.
- **Builder:** Codex, assigned Primary Builder for this objective only.
- **Branch:** `codex/dev-flow-002-adoption`.
- **Active PR:** [#203](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/203);
  current status and next action belong in the checkpoint and live GitHub evidence.
