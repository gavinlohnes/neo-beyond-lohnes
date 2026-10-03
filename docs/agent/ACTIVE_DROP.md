---
id: BODY-QUICK-001
status: CLOSED
baseline: e8908ef4c2fe39b1bc782b0730be34ce258a139c
branch: codex/body-quick-001
contract: docs/agent/drops/BODY-QUICK-001.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/146
builder: Codex, direct owner authorization 2026-10-03 DAILY-USE campaign
reviewer: Separate post-merge Reviewer session; exact incorporated head eafb5f44315e4c6ba5e49269a546ecc8ab0e74f3; PASS WITH GOVERNANCE RECONCILIATION REQUIRED
integrator: Codex, separately authorized governance reconciliation session 2026-10-03
integration_sha: 26e328496f89fc380abb6f98ed3dbcf7f8709727
closed_at: 2026-10-03T20:51:28.121Z
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
for this Drop live in `docs/agent/drops/BODY-QUICK-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
