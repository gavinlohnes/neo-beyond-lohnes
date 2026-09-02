import { describe, expect, it } from "vitest";
import { candidateIdentity, candidateMarker, parseCandidateMarker, reconcileCandidates } from "../../scripts/factory-candidate-core.mjs";

const target = { campaign_id: "FACTORY-PHASE-2", campaign_revision: "R1", campaign_digest: "d".repeat(64), drop_id: "DROP-1", baseline: "b".repeat(40), contract: { path: "docs/agent/drops/DROP-1.md", digest: "c".repeat(64) } };
const body = (value = target) => `<!-- BEYOND_FACTORY_CANDIDATE ${JSON.stringify(candidateMarker(value))} -->`;
const candidate = (overrides = {}) => ({ pr_url: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/1", state: "OPEN", head_sha: "a".repeat(40), base_sha: target.baseline, branch: "beyond-builder/candidate-x", author_login: "beyond-builder[bot]", author_type: "Bot", body: body(), stage: "BUILDING", ...overrides });

describe("Factory candidate reconciliation", () => {
  it("derives stable identity independent of object key order", () => {
    expect(candidateIdentity(target).key).toBe(candidateIdentity({ ...target, contract: { digest: target.contract.digest, path: target.contract.path } }).key);
  });
  it("creates one deterministic candidate when none exists", () => {
    const result: any = reconcileCandidates({ target, candidates: [] });
    expect(result).toMatchObject({ ok: true, action: "CREATE_CANDIDATE", role: "BUILDER", reuse: false, repository_launch_supported: false, approvals_transfer: false });
    expect(result.branch).toBe(`beyond-builder/candidate-${candidateIdentity(target).key.slice(0, 20)}`);
  });
  it("idempotently reuses the one valid building candidate", () => {
    expect(reconcileCandidates({ target, candidates: [candidate()] })).toMatchObject({ ok: true, action: "CONTINUE_CANDIDATE", role: "BUILDER", reuse: true });
  });
  it("dispatches an external independent Reviewer for a ready exact head", () => {
    expect(reconcileCandidates({ target, candidates: [candidate({ stage: "READY_FOR_REVIEW" })] })).toMatchObject({ ok: true, action: "REVIEW_EXACT_HEAD", role: "REVIEWER", repository_launch_supported: false, approvals_transfer: false });
  });
  it("preserves closed and merged candidates as obsolete evidence", () => {
    const result: any = reconcileCandidates({ target, candidates: [candidate({ state: "CLOSED", pr_url: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/2" })] });
    expect(result).toMatchObject({ ok: true, action: "CREATE_CANDIDATE", preserve_obsolete_evidence: true, obsolete_candidates: ["https://github.com/gavinlohnes/neo-beyond-lohnes/pull/2"] });
  });
  it.each([
    ["baseline", { base_sha: "a".repeat(40) }],
    ["campaign revision", { body: body({ ...target, campaign_revision: "R2" }) }],
    ["campaign digest", { body: body({ ...target, campaign_digest: "e".repeat(64) }) }],
    ["contract", { body: body({ ...target, contract: { ...target.contract, digest: "e".repeat(64) } }) }],
  ])("fails closed for divergent open %s", (_name, override) => {
    expect(reconcileCandidates({ target, candidates: [candidate(override)] })).toMatchObject({ ok: false, escalation: { code: "CONFLICTING_CANDIDATE_SCOPE" } });
  });
  it("fails closed for duplicate equivalent open candidates", () => {
    expect(reconcileCandidates({ target, candidates: [candidate(), candidate({ pr_url: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/2" })] })).toMatchObject({ ok: false, escalation: { code: "DUPLICATE_VALID_CANDIDATES" } });
  });
  it("rejects Owner-authored candidates", () => {
    expect(reconcileCandidates({ target, candidates: [candidate({ author_login: "gavinlohnes", author_type: "User" })] })).toMatchObject({ ok: false, escalation: { code: "BUILDER_IDENTITY_MISMATCH" } });
  });
  it.each(["", "<!-- BEYOND_FACTORY_CANDIDATE {} -->", `${body()}\n${body()}`])("rejects missing, forged, malformed, or ambiguous marker evidence", (candidateBody) => {
    expect(reconcileCandidates({ target, candidates: [candidate({ body: candidateBody })] })).toMatchObject({ ok: false, escalation: { code: "AMBIGUOUS_CANDIDATE" } });
  });
  it("rejects unknown state/stage and malformed targets", () => {
    expect(reconcileCandidates({ target, candidates: [candidate({ state: "PENDING" })] })).toMatchObject({ ok: false, escalation: { code: "AMBIGUOUS_CANDIDATE" } });
    expect(reconcileCandidates({ target, candidates: [candidate({ stage: "DONE" })] })).toMatchObject({ ok: false, escalation: { code: "AMBIGUOUS_CANDIDATE_STAGE" } });
    expect(reconcileCandidates({ target: { ...target, baseline: "bad" }, candidates: [] })).toMatchObject({ ok: false, escalation: { code: "MALFORMED_CANDIDATE_TARGET" } });
    expect(reconcileCandidates({ target: { ...target, campaign_digest: "bad" }, candidates: [] })).toMatchObject({ ok: false, escalation: { code: "MALFORMED_CANDIDATE_TARGET" } });
    expect(reconcileCandidates({ target: { ...target, contract: { ...target.contract, path: "../escape.md" } }, candidates: [] })).toMatchObject({ ok: false, escalation: { code: "MALFORMED_CANDIDATE_TARGET" } });
    expect(reconcileCandidates({ target, candidates: [candidate({ head_sha: "bad" })] })).toMatchObject({ ok: false, escalation: { code: "AMBIGUOUS_CANDIDATE" } });
  });
  it("does not accept title text as identity", () => {
    expect(parseCandidateMarker("AUTOPILOT CANDIDATE DISPATCH")).toEqual({ error: "MISSING_CANDIDATE_MARKER" });
  });
});
