---
id: GLYPH-002
status: CLOSED
baseline: 54164d2a828f8e7f85cfad9c2ca740ed47804491
branch: claude/glyph-002-more-nav-icons
contract: docs/agent/drops/GLYPH-002.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/98
builder: Claude, this session, per direct owner glyph review and approval ('Search B and backup A, ship it') 2026-09-16
reviewer: Claude (independent subagent, background), assigned by Builder 2026-09-16
integrator: Claude (this session), 2026-09-16
integration_sha: 1ac6bf2fac27cdde8c636040f556447c6719310c
closed_at: 2026-09-16T00:09:27.419Z
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
for this Drop live in `docs/agent/drops/GLYPH-002.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
