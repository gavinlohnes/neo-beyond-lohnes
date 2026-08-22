# CLAUDE.md — BEYOND Navigation & Guardrails

This is a navigation/guardrail document, not a product spec. For product doctrine and locked
decisions, see `docs/UX_DECISIONS.md`. For the active implementation campaign, see
`docs/FIELD_ALPHA_CAMPAIGN.md`.

## Authority order (use when sources disagree)

1. Direct owner decision.
2. BEYOND Product Constitution / Operator Doctrine.
3. Canonical Spec + later explicitly locked Decision Register entries (`docs/UX_DECISIONS.md`).
4. The active FIELD ALPHA campaign (`docs/FIELD_ALPHA_CAMPAIGN.md`).
5. Current repository implementation truth (the code itself).
6. Current visual/interaction contracts.
7. R&D / North Star material.
8. Historical build/recovery material.

Repository truth answers WHAT EXISTS. Higher product authority answers WHAT IT IS ALLOWED TO
MEAN. Do not silently reconcile a genuine conflict between these — surface it.

## Architecture layer rules

```
src/engine/         pure, deterministic, no I/O. Never imports application/* or persistence/*
                     (persistence/db.ts has a top-level `new BeyondDB()` side effect — engine
                     stays free of it so it's unit-testable without fake-indexeddb).
src/application/     commands (writes, one per user action) + queries (reads). Sole gateway to
                     persistence/db.ts. The UI layer never touches Dexie directly.
src/domain/          pure types shared across engine/application/ui.
src/persistence/     Dexie schema (db.ts), backup/restore, legacy-format compat.
src/ui/              screens + components. Calls application/* only, never engine/* directly
                     for anything requiring persistence, never persistence/* directly.
```

The Engine (`src/engine/evaluate.ts`) is the sole source of recommendation truth: same inputs
→ same output, always, with a full `DecisionTrace`. UI and persistence never encode this logic
themselves. `capacity.ts` (RED/YELLOW/GREEN) and `progression.ts`'s advisory rule are explicitly
LOCKED — do not replace with a weighted score or heuristic without an explicit product decision
recorded in `docs/UX_DECISIONS.md`. `obligationRelevance.ts` is a parallel interpretation layer,
NOT part of `evaluate.ts`'s arbitration — obligations do not participate in primary
recommendation arbitration; `engine/evaluate.ts` must never import from it.

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
```

## Protected fixtures — never edit in place

`test-fixtures/protected/*.json` + `MANIFEST.md` — real historical BEYOND backup exports, the
sole surviving evidence of a recovered prior app instance's export format. Enforced by
`tests/compat/fixtureIntegrity.test.ts` (exact byte-length + SHA-256 check on every run). If a
test needs a mutated variant, copy the JSON into a synthetic fixture elsewhere.

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
- `docs/FIELD_ALPHA_CAMPAIGN.md` — active implementation campaign (current work).
- `README.md` — architecture overview and screen map.
