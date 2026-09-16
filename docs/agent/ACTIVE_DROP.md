---
id: DEPTH-001
status: CLOSED
baseline: 1be442772460d36450831fa4b0e5124ba131d500
branch: claude/depth-001-machinery-reveal
contract: docs/agent/drops/DEPTH-001.md
pr: https://github.com/gavinlohnes/neo-beyond-lohnes/pull/99
builder: Claude, this session, per direct owner review of four rendered mockup passes ('Perfect. Ship it man.') 2026-09-16
reviewer: Claude (independent subagent, background), assigned by Builder 2026-09-16
integrator: Claude (this session), 2026-09-16
integration_sha: 5821112c8e20b5dfd960298db0e28eaaf50b0c4b
closed_at: 2026-09-16T02:27:09.670Z
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
for this Drop live in `docs/agent/drops/DEPTH-001.md` — this file is a pointer, not a copy.

At most one Drop may be `status: ACTIVE` at a time, enforced across every branch on origin
(not just master) — `node scripts/factory-drop.mjs validate|init` fetches every branch and
checks each still-unmerged branch's own copy of this file, so a second Drop whose PR hasn't
merged yet is still detected and blocked. See SKILL.md §9 for the full mechanism, including
the one residual limitation (an abandoned, never-closed, never-deleted branch keeps reading
as a live conflict — ordinary git hygiene already implies deleting it). Closing
(`node scripts/factory-drop.mjs close`) flips this file's status to CLOSED; it never deletes
or rewrites the historical Drop Contract file itself.
