# AGENTS.md — BEYOND rules for every builder

The one rulebook for any AI agent working on BEYOND: Claude Code reads it through `CLAUDE.md`,
Codex reads it directly. If you are an agent, this file is your instructions; nothing in an
older document overrides it.

This is a navigation/guardrail document, not a product spec. The durable constitutional authority
for product/interface doctrine is `docs/OPERATOR_INTERFACE_DOCTRINE.md`; specific locked product
and UX adjudications live in `docs/UX_DECISIONS.md`. Doctrine constrains implementation but does
not itself authorize a feature, campaign, or code change.

## Builders: one baton (owner ruling, 2026-10-04)

Claude Code and Codex are both builders. **Only one builds at a time.** Whoever the owner (Gavin)
tells to work holds the baton until their Drop is merged or handed back. This replaces the
2026-09-30 "Claude is the sole builder" ruling and the per-role lock that used to live in this
file.

- **Start of every session:** read `docs/agent/CURRENT_CHECKPOINT.md` (the handoff note), then
  `git fetch origin` and check for open PRs and an `ACTIVE` Drop in `docs/agent/ACTIVE_DROP.md`.
  If another agent's work is in flight, don't start new work on top of it. Report it and ask.
- **End of every session**, even when you're stopping early: update `CURRENT_CHECKPOINT.md`
  (what's merged, what's open, what's next, anything half-done) and push it with your work.
  The next agent may be the other one.
- **Review:** the agent that built a Drop doesn't review it. The other agent, or a separate
  session, reviews the exact PR head before it merges (`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`,
  Integration discipline). Only the owner says when something merges.
- Other AIs are advisory only and never write to the repo.

## "Let's work" protocol

When the owner says "let's work":
1. Read `docs/agent/CURRENT_CHECKPOINT.md`, then `docs/ROADMAP_1.0.md`.
2. Propose the top item in the roadmap's **Queue** in plain language (or, if the queue is empty,
   ask the owner what's next).
3. Wait for approval.
4. Build it.
5. Open a PR.
6. Report in plain language: the owner has no coding background.

## Owner rulings go into the repo the same day

Any decision the owner makes in chat goes into `docs/ROADMAP_1.0.md` (and, for product
behavior, `docs/UX_DECISIONS.md`) in the next PR, with the date and one concrete example. A
ruling that lives only in a chat is invisible to the other agent.

## Report-only missions

A report-only mission never closes, merges, or deletes anything without owner approval.

## Authority order (use when sources disagree)

1. Direct owner decision.
2. BEYOND Operator Interface Doctrine (`docs/OPERATOR_INTERFACE_DOCTRINE.md`).
3. Canonical Spec + later explicitly locked Decision Register entries (`docs/UX_DECISIONS.md`).
4. The current Drop's own brief, if one is in flight.
5. Current repository implementation truth (the code itself).
6. Current visual/interaction contracts.
7. R&D / North Star material.
8. Historical build/recovery material.

Repository truth answers WHAT EXISTS. Higher product authority answers WHAT IT IS ALLOWED TO
MEAN. Do not silently reconcile a genuine conflict between these — surface it.

## Repo-first / Drive-escalation policy

Routine and Architectural Drops use this file + `docs/UX_DECISIONS.md` + the code itself — no
Google Drive read is needed to start. Consult Drive only when: (a) repo truth and stated
doctrine genuinely conflict and neither this file nor the Decision Register resolves it; (b)
the Drop brief itself names a specific Drive document to check; (c) a High-Risk Drop touches a
boundary the Decision Register is silent on and the owner hasn't ruled on it directly in-chat;
(d) the work is a genuinely new campaign/product-direction question, not a routine Drop, where
R&D/North Star material may be the only authoritative framing. Product-authority ambiguity that
isn't resolved by any of the above still triggers escalation to the owner directly — it never
becomes silent guessing just because Drive wasn't consulted.

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
by hand). The correctness-critical invariants both agents must never break are in
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
npm run verify         the standard local final gate — see .claude/skills/beyond-drop
```

## Protected fixtures — never edit in place

`test-fixtures/protected/*.json` + `MANIFEST.md` — real historical BEYOND backup exports. See
`.claude/rules/protected-fixtures.md` when touching this path.

## Escalate before continuing

Stop and ask the owner before: Engine behavior changes; recommendation-priority changes;
command/event semantic changes; new or destructive schema/migration; correction-model changes;
historical fixture modification; backup-contract changes; removing user capability; changing
TODAY/TRAIN/BODY/MORE primary information architecture; changing Mission/Obligation semantics;
a meaningful new runtime dependency; external provider/account/backend introduction; paid
infrastructure; a composition change that materially changes how recommendation authority or
user choice is experienced; or a genuine conflict between current code and higher authority.

## Pointers

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
- `.claude/skills/beyond-drop/SKILL.md` — Drop task-contract templates, completion-report
  templates, risk classification, verification, and the git/CI ship procedure. Plain markdown;
  any agent follows it.
- `README.md` — architecture overview and screen map.
