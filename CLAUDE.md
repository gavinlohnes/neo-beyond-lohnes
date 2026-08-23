# CLAUDE.md — BEYOND Navigation & Guardrails

This is a navigation/guardrail document, not a product spec. For product doctrine and locked
decisions, see `docs/UX_DECISIONS.md`. For the current Drop's own brief, if one is in flight,
use whatever it names as authoritative for its own scope — no single named campaign is
permanently authoritative here.

For the engineering invariants shared with Codex on this repo (BEYOND's second engineering
agent), see `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` — this file stays Claude-specific and
does not duplicate that content.

## Authority order (use when sources disagree)

1. Direct owner decision.
2. BEYOND Product Constitution / Operator Doctrine.
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

## Immutable doctrine

- INFORM → INTERPRET → RECOMMEND → USER DECIDES.
- Deterministic Engine authority; one primary recommendation; NO ACTION REQUIRED is valid.
- Prediction is not fact (see `scheduledContext.ts`'s doctrine comment).
- History/event truth is preserved. Corrections supersede; they never silently erase history.
- Provenance matters. Manual operation remains available.
- Capability depth / surface calm. GLANCE → ACT → INSPECT → TRACE.
- FIELD compresses. COMMAND (future, out of scope) exposes.
- System reports. Advisor interprets. Silence is valid. User authority is absolute.
- Peak efficiency is not minimum code — it is minimum code that BEYOND is uniquely responsible
  for.
- Prefer executable/derived repository truth over duplicated manually maintained values. When a
  diagnostic, version, schema identifier, build identifier, or similar fact can be derived from
  its authoritative source, do not create another independent source of truth without
  justification.

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

- `docs/UX_DECISIONS.md` — BEYOND UX Decision Register, the canonical locked-decision log.
- `.claude/rules/` — path-scoped detail for Engine, persistence, and protected fixtures.
- `.claude/skills/beyond-drop/` — Drop task-contract templates, completion-report templates,
  risk classification, verification, and the git/CI ship procedure.
- `README.md` — architecture overview and screen map.
