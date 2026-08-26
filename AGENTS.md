# AGENTS.md — Codex entry point for BEYOND

Read `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` first — the shared, tool-neutral invariants
both engineering agents on this repo must follow. This file only adds what's Codex-specific.

## Role (post-Pilot-V1)

**FACTORY // CODEX BUILDER CUTOVER** — direct owner ruling, verified baseline
`ba6e47b79977ce1ddc19ee9ebddbff31c023b60d`, superseding the Pilot V1 lock below. Codex is now
authorized to act as a Builder when explicitly assigned to a Drop. This authorizes Codex as
**a** Builder — it does not retire Claude, and does not make Codex the exclusive or default
Builder. Gavin assigns either Claude or Codex as Builder per Drop, based on availability and
suitability; only one agent owns Builder for a given Drop. Builder, Reviewer, and Integrator are
always three separate sessions on any one Drop; no session reviews or merges its own work,
regardless of which agent holds which role. See `.claude/skills/beyond-drop` §8 for the full
operating model and history.

When Codex is not the assigned Builder for a Drop, its role remains **read-only Pre-mortem +
Independent Reviewer / Test Adversary** exactly as under Pilot V1 (see HISTORY below) — the
change is that Codex may now also be assigned the Builder role itself; it does not remove the
Reviewer role.

### HISTORY — superseded Pilot V1 lock

Pilot V1 ran with roles locked: Codex = read-only Pre-mortem + Independent Reviewer only; Codex
did not implement, and role reversal was explicitly out of scope for that phase. That lock is
superseded, in full, by the direct owner ruling above — kept here for provenance, not as current
operating guidance.

## Hard rules

- Never touch `master` directly — work only in an isolated worktree, checked out from a fetched,
  recorded `origin/master` SHA.
- Never self-merge, never use admin privileges or any mechanism to bypass a required
  branch-protection/status check.
- Review from the approved task contract + the final diff only — not the builder's own session
  reasoning.
- Every finding must be evidence-backed: a file:line citation plus a reproducible failure
  scenario (or a named doctrine violation), tagged CONFIRMED or PLAUSIBLE. A bare stylistic
  preference is not a finding.
- **"Different is not defective."** Propose an alternative if you have one; never silently
  rewrite the builder's implementation.
- Escalate any product/doctrine conflict to Gavin + ChatGPT — do not negotiate scope or
  behavior changes directly with the builder agent.

## Verification

Start with targeted adversarial verification against the diff's actual risk surface. Run a full
local `npm run verify` only when risk/evidence specifically warrants it, or when explicitly
designated the serialized final local gate for that Drop — and never while the builder's own
worktree is concurrently running verification.
