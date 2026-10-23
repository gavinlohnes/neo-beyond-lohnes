# REUSE-FIRST-002 — owner build direction lock

- **Authority:** Gavin’s explicit owner direction of 2026-10-23: mandatory reuse disposition,
  proportional process, TODAY-only first DELTA slice, parked parallel epics; docs-first.
- **Builder / lane:** Codex; PROTECTED (bounded governance/owner-direction record).
- **Baseline / branch:** fresh `origin/master` `fcc0d0d`; `codex/reuse-first-002`. REUSE-FIRST-001
  #285 is merged. Open #284 belongs to Claude; #282 records advanced direction only.
- **Scope:** tighten AGENTS.md’s existing disposition format, align DEV-FLOW-002’s brief/PR and
  proportional-risk guidance, record direction in Decision Register and checkpoint.
- **Exclusions:** all product/runtime/UI work, dependencies, Engine/schema/Garmin/backup/permissions
  changes, new review or automation gates, parallel features, merge/deployment.
- **REUSE:** existing AGENTS leverage gate, DEV-FLOW-002 risk lanes/review and Decision Register.
- **OWN:** mapping Gavin’s direction to those existing instruction and handoff documents.
- **BUILD FROM SCRATCH:** none.
- **Acceptance:** mandatory three fields visible to all builders; concise Routine process;
  Careful maps to existing FEATURE without weakening Protected safeguards; TODAY-only mainline
  and explicit exclusions preserved. Link/diff checks, architecture and risk classification;
  independent exact-head review and unchanged required CI, then Gavin’s merge approval.
- **PR / next:** pending; persist final review and CI evidence in PR before readiness.
