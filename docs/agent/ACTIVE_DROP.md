---
id: TODAY-007
status: CLOSED
baseline: 925b826c07812a9fea5b42822be6a92449019f06
branch: claude/today-screen-flake-fix-wip
contract: docs/agent/drops/TODAY-007.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/85
builder: Claude, this session, per direct owner instruction 2026-09-15
reviewer: Claude (independent subagent, background), assigned by Builder 2026-09-15
integrator: (unassigned)
integration_sha: affd0bdc08def9e338958cf9a32591f0b161dee2
closed_at: 2026-09-15T08:20:22.918Z
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
for this Drop live in `docs/agent/drops/TODAY-007.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
