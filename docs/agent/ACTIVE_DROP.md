---
id: FIELD-NAV-001
status: CLOSED
baseline: e0ccb40350eaa4e87bcc90c25d9ff9379d0507e0
branch: codex/field-nav-001
contract: docs/agent/drops/FIELD-NAV-001.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/149
builder: Codex Builder, direct owner authorization 2026-10-04
reviewer: Claude Code, independent exact-head review of db17d60 (owner session 2026-10-04)
integrator: Claude Code, direct owner instruction 2026-10-04
integration_sha: cd733d780a0c54e46ac09e4fb0d1ec82c7bc0055
closed_at: 2026-10-04T01:16:55.596Z
---

# ACTIVE_DROP

This file identifies the single currently-authorized BEYOND Drop, for recovery by a fresh
agent/session without the owner relaying state by hand. It is a routing/authorization
pointer only — it never duplicates a fact Git/GitHub/CI can already prove (current HEAD, CI
status, mergeability, PR review state). Run `node scripts/factory-drop.mjs status` to see
this file's recorded facts alongside the live git facts derived at that moment; check the
`pr` field's actual CI/review state directly on GitHub. See
`.claude/skills/beyond-drop/SKILL.md` §9 for the full mechanism.

Full authorized scope, exclusions, invariants, acceptance criteria, and role expectations
for this Drop live in `docs/agent/drops/FIELD-NAV-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
