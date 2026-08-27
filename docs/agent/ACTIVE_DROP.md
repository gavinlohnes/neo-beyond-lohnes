---
id: FACTORY-002
status: CLOSED
baseline: bc28f2093cf3f006df1306020bf9c9fd04e6f9fc
branch: factory-002-development-factory-v1
contract: docs/agent/drops/FACTORY-002.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/34
builder: Claude (assigned by Gavin, this Drop only)
reviewer: (unassigned)
integrator: Codex (assigned by Gavin, FACTORY-002 closure only)
integration_sha: 6a21da419c03b67773452cf2bd602e0212d7a3ac
closed_at: 2026-08-27T08:51:04.574Z
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
for this Drop live in `docs/agent/drops/FACTORY-002.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
