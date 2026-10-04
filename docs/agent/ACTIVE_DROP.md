---
id: FOUNDATION-A-F1
status: CLOSED
baseline: 449c152181b3afddf3f6bfc2093473ee2dbff545
branch: ccr-22d7c0f8-rqhhjm
contract: docs/agent/drops/FOUNDATION-A-F1.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/152
builder: Claude Code, direct owner approval 2026-10-04
reviewer: (unassigned)
integrator: Owner merge of PR #152, 2026-10-04
integration_sha: 2052f3ff2d2d0bf3d110bf68bc3d22ea629bcca3
closed_at: 2026-10-04T03:40:03.164Z
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
for this Drop live in `docs/agent/drops/FOUNDATION-A-F1.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
