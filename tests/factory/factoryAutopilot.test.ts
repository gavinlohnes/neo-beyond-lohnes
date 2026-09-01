import { describe, expect, it } from "vitest";
import { deriveNextAction, normalizeReviewEvidence } from "../../scripts/factory-autopilot-core.mjs";

const SHA = {
  auth: "a".repeat(40),
  base: "b".repeat(40),
  head: "c".repeat(40),
  stale: "d".repeat(40),
  merge: "e".repeat(40),
};

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    id: "C-001",
    title: "Test campaign",
    status: "APPROVED",
    risk_ceiling: "ARCHITECTURAL",
    authorization: { owner_approved: true, approved_by: "Owner" },
    invariants: ["no weakened gates"],
    non_goals: [],
    escalation_conditions: [],
    drops: [
      { id: "DROP-001", title: "First", risk_tier: "ROUTINE", depends_on: [] },
      { id: "DROP-002", title: "Second", risk_tier: "ARCHITECTURAL", depends_on: ["DROP-001"] },
    ],
    ...overrides,
  };
}

function active(overrides: Record<string, unknown> = {}) {
  return { id: "DROP-001", status: "ACTIVE", baseline: SHA.base, pr: "https://github.com/acme/repo/pull/7", ...overrides };
}

function pr(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://github.com/acme/repo/pull/7",
    state: "OPEN",
    is_draft: false,
    base_sha: SHA.base,
    head_sha: SHA.head,
    mergeable: "MERGEABLE",
    merge_state: "CLEAN",
    checks: [{ name: "PR Verification", status: "COMPLETED", conclusion: "SUCCESS", head_sha: SHA.head }],
    reviews: [{ reviewed_sha: SHA.head, verdict: "APPROVED", findings: "none", merge_readiness: "READY" }],
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    campaign: campaign(),
    master: { sha: SHA.base, authorization_commit_is_ancestor: true },
    active_drop: active(),
    completed_drops: [],
    pr: pr(),
    required_check: "PR Verification",
    escalations: [],
    ...overrides,
  };
}

describe("Factory Autopilot next-action derivation", () => {
  it("identifies the next authorized Drop after a prior Drop closes", () => {
    const result = deriveNextAction(input({ active_drop: null, completed_drops: ["DROP-001"] }));
    expect(result).toMatchObject({ ok: true, action: "DROP_READY", drop_id: "DROP-002" });
  });

  it("blocks a conflicting ACTIVE Drop", () => {
    const result = deriveNextAction(input({ active_drop: active({ id: "OTHER-001" }) }));
    expect(result).toMatchObject({ ok: false, action: "ESCALATION_REQUIRED", escalation: { code: "CONFLICTING_ACTIVE_DROP" } });
  });

  it("cannot advance when required verification fails", () => {
    const result = deriveNextAction(input({ pr: pr({ checks: [{ name: "PR Verification", status: "COMPLETED", conclusion: "FAILURE", head_sha: SHA.head }] }) }));
    expect(result).toMatchObject({ ok: true, action: "FIX_VERIFICATION" });
  });

  it("cannot advance without required independent review", () => {
    const result = deriveNextAction(input({ pr: pr({ reviews: [] }) }));
    expect(result).toMatchObject({ ok: true, action: "WAITING_FOR_REVIEW" });
  });

  it("invalidates approval after the PR head changes", () => {
    const result = deriveNextAction(input({ pr: pr({ reviews: [{ reviewed_sha: SHA.stale, verdict: "APPROVED", findings: "none", merge_readiness: "READY" }] }) }));
    expect(result).toMatchObject({ ok: true, action: "STALE_APPROVAL", reviewed_shas: [SHA.stale] });
  });

  it("fails closed when CI is bound to a different head", () => {
    const result = deriveNextAction(input({ pr: pr({ checks: [{ name: "PR Verification", status: "COMPLETED", conclusion: "SUCCESS", head_sha: SHA.stale }] }) }));
    expect(result).toMatchObject({ ok: false, escalation: { code: "CI_HEAD_MISMATCH" } });
  });

  it("refuses autonomous progression when owner escalation is present", () => {
    const result = deriveNextAction(input({ escalations: ["PRIVACY_BOUNDARY_CHANGE"] }));
    expect(result).toMatchObject({ ok: false, escalation: { code: "OWNER_DECISION_REQUIRED" } });
  });

  it.each([
    ["unsupported schema", campaign({ schema_version: 99 }), "UNSUPPORTED_CAMPAIGN_SCHEMA"],
    ["stale authorization", campaign(), "STALE_CAMPAIGN_AUTHORIZATION"],
    ["risk ceiling", campaign({ risk_ceiling: "ROUTINE" }), "RISK_CEILING_EXCEEDED"],
    ["later dependency", campaign({ drops: [{ id: "DROP-002", title: "Second", risk_tier: "ROUTINE", depends_on: ["DROP-001"] }] }), "MALFORMED_CAMPAIGN"],
    ["high-risk without owner ruling", campaign({ risk_ceiling: "HIGH-RISK", drops: [{ id: "DROP-HIGH", title: "High", risk_tier: "HIGH-RISK", depends_on: [] }] }), "HIGH_RISK_OWNER_RULING_REQUIRED"],
  ])("fails closed for %s", (_name, candidate, code) => {
    const overrides = code === "STALE_CAMPAIGN_AUTHORIZATION"
      ? { campaign: candidate, master: { sha: SHA.base, authorization_commit_is_ancestor: false } }
      : { campaign: candidate };
    expect(deriveNextAction(input(overrides))).toMatchObject({ ok: false, escalation: { code } });
  });

  it("recovers ready-for-integration from complete exact-head evidence", () => {
    expect(deriveNextAction(input())).toMatchObject({ ok: true, action: "READY_FOR_INTEGRATION", head_sha: SHA.head });
  });

  it.each([
    ["PR pointer mismatch", pr({ url: "https://github.com/acme/repo/pull/8" }), "PR_POINTER_MISMATCH"],
    ["baseline mismatch", pr({ base_sha: SHA.stale }), "BASELINE_MISMATCH"],
    ["unclean merge", pr({ mergeable: "CONFLICTING", merge_state: "DIRTY" }), "PR_NOT_CLEAN"],
  ])("fails closed for %s", (_name, state, code) => {
    expect(deriveNextAction(input({ pr: state }))).toMatchObject({ ok: false, escalation: { code } });
  });

  it("derives closure after GitHub reports the PR merged", () => {
    expect(deriveNextAction(input({ pr: pr({ state: "MERGED", merge_sha: SHA.merge }) }))).toMatchObject({ ok: true, action: "READY_FOR_CLOSURE", integration_sha: SHA.merge });
  });

  it("keeps the existing single-Drop workflow compatible when no campaign is active", () => {
    expect(deriveNextAction({ campaign: null, active_drop: active() })).toMatchObject({ ok: true, action: "LEGACY_DROP_ACTIVE", drop_id: "DROP-001" });
    expect(deriveNextAction({ campaign: null, active_drop: null })).toMatchObject({ ok: true, action: "NO_CAMPAIGN" });
  });
});

describe("durable review evidence parser", () => {
  it("accepts only the exact four-field evidence contract", () => {
    expect(normalizeReviewEvidence(`Reviewed SHA: ${SHA.head}\nVerdict: APPROVED\nFindings: none\nMerge readiness: READY`)).toEqual({
      reviewed_sha: SHA.head,
      verdict: "APPROVED",
      findings: "none",
      merge_readiness: "READY",
    });
    expect(normalizeReviewEvidence(`Verdict: APPROVED\nFindings: none`)).toBeNull();
  });
});
