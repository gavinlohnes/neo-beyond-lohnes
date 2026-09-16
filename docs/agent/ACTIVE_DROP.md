---
id: FOUNDATION-1A
status: CLOSED
baseline: f32482a3c70eb2fddb9b17f8c306db849c444b13
branch: claude/foundation-1a-iy32gy
contract: docs/agent/drops/FOUNDATION-1A.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/106
builder: Claude, this session, direct owner authorization 2026-09-16 (doctrine/architecture reconciliation)
reviewer: PR #106 review (duplicate ACTIVE_DROP heading found and corrected in commit 5b93021); approved for integration by direct owner ruling 2026-09-16
integrator: Claude, this session, direct owner authorization to merge 2026-09-16
integration_sha: b51df9a34c4ad617e914344065a7311c0c8c38f3
closed_at: 2026-09-16T08:50:01.440Z
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
for this Drop live in `docs/agent/drops/FOUNDATION-1A.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
