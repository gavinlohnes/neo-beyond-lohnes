---
id: GLYPH-003
status: CLOSED
baseline: 71f73f7009a793fa823800181e4c1270a46fcc67
branch: claude/glyph-003-remaining-more-icons
contract: docs/agent/drops/GLYPH-003.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/101
builder: Claude, this session, per direct owner approval 2026-09-16
reviewer: independent Agent subagent (this session), CONFIRMED, zero blocking issues
integrator: Claude, this session
integration_sha: 1b1acb66d71b41db95350a19b63130753e25e4f1
closed_at: 2026-09-16T03:30:55.064Z
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
for this Drop live in `docs/agent/drops/GLYPH-003.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
