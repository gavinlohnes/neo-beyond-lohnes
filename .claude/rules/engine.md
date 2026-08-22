---
paths:
  - "src/engine/**"
---

# Engine rules

- Pure, deterministic, no I/O. Same inputs → same output, always, with a full trace where the
  module produces one (`evaluate.ts`'s `DecisionTrace`).
- Never import `application/*` or `persistence/*` — `persistence/db.ts` has a top-level
  `new BeyondDB()` side effect; this layer stays free of it so it's unit-testable without
  `fake-indexeddb`.
- `capacity.ts` (RED/YELLOW/GREEN) and `progression.ts`'s advisory rule are LOCKED — do not
  replace with a weighted score or heuristic without an explicit product decision recorded in
  `docs/UX_DECISIONS.md`.
- `obligationRelevance.ts` is a parallel interpretation layer, not part of `evaluate.ts`'s
  arbitration — obligations do not participate in primary recommendation arbitration.
  `evaluate.ts` must never import from it.
- `advisory.ts` (Intelligence Spine — I1, approved 2026-08-22) composes already-locked
  interpretation output (currently `obligationRelevance.ts`) into the informational-only
  `AdvisoryNote` contract (`domain/intelligence/types.ts`). One-way dependency: `advisory.ts`
  may import from `evaluate.ts`'s types and `obligationRelevance.ts`; neither of those may ever
  import from `advisory.ts` (regression-tested in `tests/engine/advisory.test.ts`). An
  `AdvisoryNote` is never a `Recommendation` — no `priority`, no `suggestedCommand`, nothing
  resembling `RecommendationKind` — and must never be wired anywhere that could let it be
  accepted, declined, or executed like one. It is read-only INTERPRET-stage material a future
  bounded advisor may consume alongside a Recommendation; it never feeds back into Engine
  arbitration and never overrides it or user authority.
- A meaningful change here (new recommendation kind, changed priority/selection logic, changed
  capacity thresholds, changed trace shape) is at least an Architectural Drop — see
  `.claude/skills/beyond-drop`. Escalate to the owner before changing recommendation-priority
  behavior at all.
