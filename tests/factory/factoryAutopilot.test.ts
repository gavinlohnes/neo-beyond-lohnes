import { describe, expect, it } from "vitest";
import { campaignDigest, deriveNextAction, reconcileActiveDrops, validateCampaignAuthorization } from "../../scripts/factory-autopilot-core.mjs";

const SHA = {
  auth: "a".repeat(40),
  base: "b".repeat(40),
  head: "c".repeat(40),
  stale: "d".repeat(40),
  merge: "e".repeat(40),
};

function campaign(overrides: Record<string, unknown> = {}) {
  const value = {
    schema_version: 2,
    id: "C-001",
    title: "Test campaign",
    status: "APPROVED",
    risk_ceiling: "ARCHITECTURAL",
    authorization: { type: "CAMPAIGN_AUTHORIZATION", revision: SHA.auth, digest: "digest-1", owner_login: "gavinlohnes", allowed_work_classes: ["FACTORY"], risk_ceiling: "ARCHITECTURAL", prohibited_boundaries: ["PERSISTENCE"] },
    invariants: ["no weakened gates"],
    non_goals: [],
    escalation_conditions: ["PRIVACY_BOUNDARY_CHANGE"],
    drops: [
      { id: "DROP-001", title: "First", work_class: "FACTORY", risk_tier: "ROUTINE", boundaries: [], depends_on: [] },
      { id: "DROP-002", title: "Second", work_class: "FACTORY", risk_tier: "ARCHITECTURAL", boundaries: [], depends_on: ["DROP-001"] },
    ],
    ...overrides,
  };
  if (overrides.authorization) value.authorization = { type: "CAMPAIGN_AUTHORIZATION", revision: SHA.auth, digest: "", owner_login: "gavinlohnes", allowed_work_classes: ["FACTORY"], risk_ceiling: "ARCHITECTURAL", prohibited_boundaries: ["PERSISTENCE"], ...(overrides.authorization as Record<string, unknown>) };
  value.authorization.digest = campaignDigest(value);
  return value;
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
    author_login: "builder",
    mergeable: "MERGEABLE",
    merge_state: "CLEAN",
    checks: [{ name: "PR Verification", status: "COMPLETED", conclusion: "SUCCESS", head_sha: SHA.head }],
    reviews: [review()],
    ...overrides,
  };
}

function review(overrides: Record<string, unknown> = {}) {
  return { source: "FORMAL_GITHUB_REVIEW", id: 1, state: "APPROVED", commit_sha: SHA.head, author_login: "reviewer", author_association: "COLLABORATOR", submitted_at: "2026-09-01T00:00:00Z", ...overrides };
}

function input(overrides: Record<string, unknown> = {}) {
  const manifest = campaign();
  return {
    campaign: manifest,
    master: { sha: SHA.base, authorization_commit_is_ancestor: true, authorization_commit: SHA.auth },
    campaign_authorization: { source: "LIVE_GITHUB_CAMPAIGN_AUTHORIZATION", domain: "CAMPAIGN_AUTHORIZATION", state: "APPROVED", commit_sha: SHA.auth, revision: SHA.auth, author_login: "gavinlohnes", author_association: "OWNER", digest: manifest.authorization.digest, active_digest: manifest.authorization.digest, lifecycle: [] },
    active_drop: active(),
    completed_drops: [],
    pr: pr(),
    required_check: "PR Verification",
    escalations: [],
    ...overrides,
  };
}

describe("Factory Autopilot next-action derivation", () => {
  it("reconciles local and cross-branch ACTIVE Drops without a local short circuit", () => {
    expect(reconcileActiveDrops([active(), active()])).toMatchObject({ active: { id: "DROP-001" } });
    expect(reconcileActiveDrops([active(), active({ id: "OTHER-001" })])).toMatchObject({ error: "MULTIPLE_ACTIVE_DROPS" });
    expect(reconcileActiveDrops([])).toEqual({ active: null });
  });
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
    const result = deriveNextAction(input({ pr: pr({ reviews: [review({ commit_sha: SHA.stale })] }) }));
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

  it("rejects an undeclared escalation", () => {
    expect(deriveNextAction(input({ escalations: ["INVENTED"] }))).toMatchObject({ ok: false, escalation: { code: "UNDECLARED_ESCALATION" } });
  });

  it.each([
    ["unsupported schema", campaign({ schema_version: 99 }), "INVALID_AUTHORIZATION"],
    ["stale authorization", campaign(), "STALE_AUTHORIZATION"],
    ["risk ceiling", campaign({ risk_ceiling: "ROUTINE" }), "RISK_CEILING_EXCEEDED"],
    ["later dependency", campaign({ drops: [{ id: "DROP-002", title: "Second", work_class: "FACTORY", risk_tier: "ROUTINE", boundaries: [], depends_on: ["DROP-001"] }] }), "MALFORMED_CAMPAIGN"],
    ["high-risk without owner ruling", campaign({ risk_ceiling: "HIGH-RISK", authorization: { ...campaign().authorization, risk_ceiling: "HIGH-RISK" }, drops: [{ id: "DROP-HIGH", title: "High", work_class: "FACTORY", risk_tier: "HIGH-RISK", boundaries: [], depends_on: [] }] }), "HIGH_RISK_OWNER_RULING_REQUIRED"],
  ])("fails closed for %s", (_name, candidate, code) => {
    const overrides = code === "STALE_AUTHORIZATION"
      ? { campaign: candidate, master: { sha: SHA.base, authorization_commit_is_ancestor: false } }
      : { campaign: candidate };
    expect(deriveNextAction(input(overrides))).toMatchObject({ ok: false, escalation: { code } });
  });

  it("recovers ready-for-integration from complete exact-head evidence", () => {
    expect(deriveNextAction(input())).toMatchObject({ ok: true, action: "READY_FOR_INTEGRATION", head_sha: SHA.head });
  });

  it("rejects PR-author approval", () => {
    expect(deriveNextAction(input({ pr: pr({ reviews: [review({ author_login: "builder" })] }) }))).toMatchObject({ ok: false, escalation: { code: "REVIEW_INDEPENDENCE_UNPROVEN" } });
  });

  it("ignores arbitrary issue-comment-shaped evidence", () => {
    expect(deriveNextAction(input({ pr: pr({ reviews: [], comments: [{ body: `Reviewed SHA: ${SHA.head}\nVerdict: APPROVED` }] }) }))).toMatchObject({ action: "WAITING_FOR_REVIEW" });
  });

  it.each(["COMMENTED", "DISMISSED", "PENDING"])("does not accept %s as approval", (state) => {
    expect(deriveNextAction(input({ pr: pr({ reviews: [review({ state })] }) }))).toMatchObject({ action: "WAITING_FOR_REVIEW" });
  });

  it("blocks current-head requested changes", () => {
    expect(deriveNextAction(input({ pr: pr({ reviews: [review({ state: "CHANGES_REQUESTED" })] }) }))).toMatchObject({ action: "WAITING_FOR_REVIEW", review_state: "CHANGES_REQUESTED" });
  });

  it("resolves each reviewer's latest formal state, while any current request-changes blocks", () => {
    const superseded = [review({ id: 1, state: "CHANGES_REQUESTED" }), review({ id: 2, state: "APPROVED", submitted_at: "2026-09-01T01:00:00Z" })];
    expect(deriveNextAction(input({ pr: pr({ reviews: superseded }) }))).toMatchObject({ action: "READY_FOR_INTEGRATION" });
    const blocked = [...superseded, review({ id: 3, author_login: "reviewer-2", state: "CHANGES_REQUESTED", submitted_at: "2026-09-01T02:00:00Z" })];
    expect(deriveNextAction(input({ pr: pr({ reviews: blocked }) }))).toMatchObject({ action: "WAITING_FOR_REVIEW" });
  });

  it("uses the newest required check and can see it beyond the first 100 entries", () => {
    const unrelated = Array.from({ length: 101 }, (_, id) => ({ id, name: `other-${id}`, status: "COMPLETED", conclusion: "SUCCESS", head_sha: SHA.head }));
    const checks = [...unrelated, { id: 200, name: "PR Verification", status: "COMPLETED", conclusion: "SUCCESS", head_sha: SHA.head, completed_at: "2026-09-01T02:00:00Z" }];
    expect(deriveNextAction(input({ pr: pr({ checks }) }))).toMatchObject({ action: "READY_FOR_INTEGRATION" });
    checks.push({ id: 201, name: "PR Verification", status: "COMPLETED", conclusion: "FAILURE", head_sha: SHA.head, completed_at: "2026-09-01T03:00:00Z" });
    expect(deriveNextAction(input({ pr: pr({ checks }) }))).toMatchObject({ action: "FIX_VERIFICATION" });
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

  it.each([
    ["synthetic", { synthetic: true }, "INVALID_AUTHORIZATION"],
    ["stale revision", { commit_sha: SHA.stale }, "INVALID_AUTHORIZATION"],
    ["wrong owner", { author_login: "builder" }, "INVALID_AUTHORIZATION"],
    ["digest drift", { active_digest: "changed" }, "SCOPE_MISMATCH"],
    ["paused", { lifecycle: [{ type: "PAUSE", revision: SHA.auth, digest: "digest-1", author_login: "gavinlohnes" }] }, "PAUSED"],
    ["revoked", { lifecycle: [{ type: "REVOKE", revision: SHA.auth, digest: "digest-1", author_login: "gavinlohnes" }] }, "REVOKED"],
  ])("fails closed for campaign authority: %s", (_name, override, state) => {
    const manifest: any = campaign();
    const evidence: any = { ...input().campaign_authorization as Record<string, unknown>, digest: manifest.authorization.digest, active_digest: manifest.authorization.digest, ...override };
    if (Array.isArray(evidence.lifecycle)) evidence.lifecycle = evidence.lifecycle.map((event: Record<string, unknown>) => ({ ...event, digest: manifest.authorization.digest }));
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0] })).toMatchObject({ state });
  });

  it("allows unchanged pause/resume but never resumes a revoked revision", () => {
    const baseEvent = { revision: SHA.auth, digest: "digest-1", author_login: "gavinlohnes" };
    const manifest = campaign();
    baseEvent.digest = manifest.authorization.digest;
    const evidence = { ...input().campaign_authorization as Record<string, unknown>, digest: manifest.authorization.digest, active_digest: manifest.authorization.digest, lifecycle: [{ ...baseEvent, type: "PAUSE" }, { ...baseEvent, type: "RESUME" }] };
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0] })).toMatchObject({ state: "AUTHORIZED" });
    evidence.lifecycle.push({ ...baseEvent, type: "REVOKE" }, { ...baseEvent, type: "RESUME" });
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0] })).toMatchObject({ state: "REVOKED" });
  });

  it.each([
    ["work class", { work_class: "PRODUCT" }, {}, "SCOPE_MISMATCH"],
    ["risk ceiling", { risk_tier: "HIGH-RISK", owner_ruling: { obtained: true, reference: "owner" } }, {}, "RISK_CEILING_EXCEEDED"],
    ["prohibited boundary", { boundaries: ["PERSISTENCE"] }, {}, "PROHIBITED_BOUNDARY"],
    ["high-risk ruling", { risk_tier: "HIGH-RISK" }, { authorization: { risk_ceiling: "HIGH-RISK" } }, "ESCALATION_REQUIRED"],
  ])("enforces candidate authority boundary: %s", (_name, dropOverride, campaignOverride, state) => {
    const manifest = campaign(campaignOverride);
    const evidence = { ...input().campaign_authorization as Record<string, unknown>, digest: manifest.authorization.digest, active_digest: manifest.authorization.digest };
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: { ...manifest.drops[0], ...dropOverride } })).toMatchObject({ state });
  });

  it("expires and escalates explicitly", () => {
    const manifest: any = campaign({ authorization: { ...campaign().authorization, expires_at: "2026-01-01T00:00:00Z" } });
    const evidence: any = { ...input().campaign_authorization as Record<string, unknown>, digest: manifest.authorization.digest, active_digest: manifest.authorization.digest };
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0], now: "2026-09-01T00:00:00Z" })).toMatchObject({ state: "EXPIRED" });
    delete manifest.authorization.expires_at;
    manifest.authorization.digest = campaignDigest(manifest);
    evidence.digest = manifest.authorization.digest;
    evidence.active_digest = manifest.authorization.digest;
    evidence.escalations = ["DOCTRINE_CONFLICT"];
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0] })).toMatchObject({ state: "OWNER_DECISION_REQUIRED" });
  });

  it("rejects malformed authorization timestamps", () => {
    const manifest: any = campaign({ authorization: { ...campaign().authorization, expires_at: "not-a-timestamp" } });
    const evidence: any = { ...input().campaign_authorization as Record<string, unknown>, digest: manifest.authorization.digest, active_digest: manifest.authorization.digest };
    expect(validateCampaignAuthorization({ campaign: manifest, evidence, master: input().master, candidate_drop: manifest.drops[0] })).toMatchObject({ state: "INVALID_AUTHORIZATION", reason: "MALFORMED_EXPIRY" });
  });
});
