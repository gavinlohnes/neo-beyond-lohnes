---
id: EMBLEM-001
status: CLOSED
baseline: 8dbebfb4b6aeae0d3b8297a00451a76dd77905de
branch: claude/emblem-001-primary-mark
contract: docs/agent/drops/EMBLEM-001.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/75
builder: Claude, direct owner assignment in this session
reviewer: (unassigned)
integrator: (unassigned)
integration_sha: e0f8be9cbeda0430dc984a94ccdb42664973e521
closed_at: 2026-09-11T03:56:00.000Z
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
for this Drop live in `docs/agent/drops/EMBLEM-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
