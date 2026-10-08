# AGENTS.md — BEYOND rules for every builder

The one rulebook for any AI agent working on BEYOND: Claude Code reads it through `CLAUDE.md`,
Codex reads it directly. If you are an agent, this file is your instructions; nothing in an
older document overrides it.

This is a navigation/guardrail document, not a product spec. The durable constitutional authority
for product/interface doctrine is `docs/OPERATOR_INTERFACE_DOCTRINE.md`; specific locked product
and UX adjudications live in `docs/UX_DECISIONS.md`. Doctrine constrains implementation but does
not itself authorize a feature, campaign, or code change.

## Development workflow

[`docs/agent/DEV-FLOW-002.md`](docs/agent/DEV-FLOW-002.md) is the single current development
workflow authority after its owner-approved adoption merges. It supersedes legacy procedural
rules in Drops, Factory records, and skills; product doctrine and engineering invariants remain
binding. This adoption PR itself is explicitly owner-authorized Protected work and must not merge
without independent exact-head review, green required CI, and owner merge approval.

- Builders are provider-neutral: Claude Code, Codex, GPT Work, or another qualified agent may
  implement an approved objective. One active Builder owns each objective.
- Read the checkpoint, fetch fresh `origin/master`, inspect the working tree and open PRs, and
  check for overlapping work before editing. Preserve recoverable work before changing builders.
- Use one concise durable brief per objective with authorization, risk lane, scope/exclusions,
  acceptance evidence, starting commit, Builder, and active PR. Routine work needs no separate
  authorization PR, formal Drop, or Factory activation.
- Every PR needs owner merge approval. Protected work also needs explicit bounded owner approval
  and independent exact-head review. No self-review, self-merge, automatic merge, or admin bypass.
- Maintain `docs/agent/CURRENT_CHECKPOINT.md` in GitHub with the objective, branch/PR, verification,
  remaining risks, and next action. No mandatory closure PR or Factory lifecycle for new work.
- Governance changes are Protected and require bounded owner authorization, regardless of provider.

## "Let's work" protocol

Read the checkpoint and roadmap, propose the next owner-prioritized objective in plain language,
and obtain any missing objective authorization before implementation. Existing approval permits
ordinary implementation details without repeated permission requests. Open a PR, report evidence,
and wait for owner merge approval. Do not treat the Queue or doctrine as standing authorization.

## Record owner rulings

Record objective authorization in its brief. Record new product decisions in the Decision Register
and priorities in the roadmap when relevant, without duplicating the workflow charter. Any
qualified Builder may record decisions within the owner's approved scope.

## Report-only missions

A report-only mission never closes, merges, or deletes anything without owner approval.

## Authority order (use when sources disagree)

1. Direct owner decision.
2. BEYOND Operator Interface Doctrine (`docs/OPERATOR_INTERFACE_DOCTRINE.md`).
3. Canonical Spec + later explicitly locked Decision Register entries (`docs/UX_DECISIONS.md`).
4. The current objective's approved brief, if one is in flight.
5. Current repository implementation truth (the code itself).
6. Current visual/interaction contracts.
7. R&D / North Star material.
8. Historical build/recovery material.

Repository truth answers WHAT EXISTS. Higher product authority answers WHAT IT IS ALLOWED TO
MEAN. Do not silently reconcile a genuine conflict between these — surface it.

## Repository and planning archive

Repository doctrine, locked decisions, the approved brief, and code guide implementation. Google
Drive is a planning archive, not a competing implementation authority. A brief may cite archive
material for context; unresolved product-authority conflicts go to the owner. Do not modify Drive
or add unrelated research as part of an implementation objective.

## Architecture layer rules

```
src/engine/         pure, deterministic, no I/O. Never imports application/* or persistence/*
                     (persistence/db.ts has a top-level `new BeyondDB()` side effect — engine
                     stays free of it so it's unit-testable without fake-indexeddb). See
                     .claude/rules/engine.md when editing this layer.
src/application/     commands (writes, one per user action) + queries (reads). Sole gateway to
                     persistence/db.ts. The UI layer never touches Dexie directly.
src/domain/          pure types shared across engine/application/ui.
src/persistence/     Dexie schema (db.ts), backup/restore, legacy-format compat. See
                     .claude/rules/persistence.md when editing this layer.
src/ui/              screens + components. Calls application/* only, never engine/* directly
                     for anything requiring persistence, never persistence/* directly.
```

Before editing `src/engine/**`, `src/persistence/**` or `test-fixtures/protected/**`, read the
matching file in `.claude/rules/` (Claude loads these automatically; other agents read them
by hand). The correctness-critical invariants every agent must preserve are in
`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`.

## Immutable doctrine

Read and preserve `docs/OPERATOR_INTERFACE_DOCTRINE.md`; it is the constitutional source rather
than this navigation file. Prefer executable/derived repository truth over duplicated manually
maintained values. When a diagnostic, version, schema identifier, build identifier, or similar
fact can be derived from its authoritative source, do not create another independent source of
truth without justification.

## The leverage gate

Before consequential implementation, ask: **is BEYOND uniquely responsible for solving this
problem?** Classify the decision:

`BUILD OWNED` · `USE DEPENDENCY` · `ADAPT UPSTREAM` · `INTEGRATE PROVIDER` · `STANDARDIZE` ·
`DEFER` · `REJECT`

Do not add dependencies simply because they're convenient. Do not hand-build commodity
infrastructure merely for purity.

## Commands

```
npm run typecheck      tsc -b
npm test               vitest run              (full suite: node + real-Chromium browser projects)
npm run test:browser   vitest run --project browser
npm run build          tsc -b && vite build
npm run verify         full local gate; select checks proportionally under DEV-FLOW-002
```

## Protected fixtures — never edit in place

`test-fixtures/protected/*.json` + `MANIFEST.md` — real historical BEYOND backup exports. See
`.claude/rules/protected-fixtures.md` when touching this path.

## Escalate before continuing

Obtain bounded owner approval before crossing any unapproved Protected boundary; do not repeat
approval already given for the objective. Examples: Engine behavior changes; recommendation-
priority changes;
command/event semantic changes; new or destructive schema/migration; correction-model changes;
historical fixture modification; backup-contract changes; removing user capability; changing
TODAY/TRAIN/BODY/MORE primary information architecture; changing Mission/Obligation semantics;
a meaningful new runtime dependency; external provider/account/backend introduction; paid
infrastructure; a composition change that materially changes how recommendation authority or
user choice is experienced; or a genuine conflict between current code and higher authority.
Stop on unresolved conflicts.

## Pointers

- `docs/agent/DEV-FLOW-002.md` — current workflow authority; risk lanes, review, and owner control.
- `docs/agent/CURRENT_CHECKPOINT.md` — the handoff note; read first, update last.
- `docs/ROADMAP_1.0.md` — the build plan and the **Queue**; start here on "let's work".
- `docs/OPERATOR_INTERFACE_DOCTRINE.md` — constitutional product/interface doctrine; constrains
  future work but never authorizes implementation by itself.
- `docs/UX_DECISIONS.md` — BEYOND UX Decision Register, the canonical locked-decision log.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` — the shared engineering invariants.
- `docs/agent/CAPABILITY_MAP.md` — repo-native index into Google Drive's owner-approved
  Research & Reuse Register / Donor & Experience Program: per-domain existing primitives,
  already-adjudicated BUILD/BORROW/ADAPT/INTEGRATE/REJECT rulings, and rejected patterns not to
  re-litigate. Check this before researching a commodity subsystem from scratch.
- `.claude/rules/` — path-scoped detail for Engine, persistence, and protected fixtures.
- `.claude/skills/beyond-drop/SKILL.md` — historical Drop procedures and Factory evidence;
  retained for reference, superseded for new work by DEV-FLOW-002.
- `README.md` — architecture overview and screen map.
