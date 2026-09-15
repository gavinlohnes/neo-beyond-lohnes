---
id: INTENT-002
status: CLOSED
baseline: 58e60656065c4017c8e0d586897c947cd98c6761
branch: claude/intent-002-recurring-obligations
contract: docs/agent/drops/INTENT-002.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/84
builder: Claude, this session, assigned by Gavin in chat 2026-09-15
reviewer: Claude (independent subagent, background), assigned by Builder 2026-09-15
integrator: (unassigned)
integration_sha: 25a9950d94b2dd0712948d16ec6a909a46a8ffb2
closed_at: 2026-09-15T07:55:12.608Z
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
for this Drop live in `docs/agent/drops/INTENT-002.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
