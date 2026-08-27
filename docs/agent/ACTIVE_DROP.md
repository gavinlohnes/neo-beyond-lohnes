---
id: FACTORY-002
status: ACTIVE
baseline: bc28f2093cf3f006df1306020bf9c9fd04e6f9fc
branch: factory-002-development-factory-v1
contract: docs/agent/drops/FACTORY-002.md
pr: (pending — set by Builder immediately after opening the PR)
builder: Claude (assigned by Gavin, this Drop only)
reviewer: (unassigned)
integrator: (unassigned)
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

At most one Drop may be `status: ACTIVE` here at a time —
`node scripts/factory-drop.mjs validate|init` refuses to launch a different Drop while one
is already ACTIVE. Closing (`node scripts/factory-drop.mjs close`) flips this file's status
to CLOSED; it never deletes or rewrites the historical Drop Contract file itself.
