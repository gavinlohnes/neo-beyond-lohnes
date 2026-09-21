---
id: TODAY-QUICKACTIONS-001
status: CLOSED
baseline: c91a7f710499af6e1a71e5d193bfea05aeffd7df
branch: claude/today-quickactions-001-night-shift
contract: docs/agent/drops/TODAY-QUICKACTIONS-001.md
builder: Claude, this session, direct owner authorization 2026-09-20/21 (NEXT DROP SCOPING mission, all 3 items picked, build order 1,2,3)
integration_sha: 6ba6cc2d6b4194f6bb4041a49c4b7c95daee1cdf
closed_at: 2026-09-21T09:48:20.058Z
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
for this Drop live in `docs/agent/drops/TODAY-QUICKACTIONS-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
