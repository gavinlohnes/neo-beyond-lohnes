import { describe, expect, it } from "vitest";
import { candidateIdentity, encodeCandidateMarker, parseCandidateMarker, protectedContractIdentity, reconcileCandidates } from "../../scripts/factory-candidate-dispatch-core.mjs";

const sha = (char: string) => char.repeat(40);
const digest = (char: string) => char.repeat(64);
const expected = candidateIdentity({
  campaign_id: "FACTORY-PHASE-2", campaign_revision: "FACTORY-PHASE-2-R1", campaign_digest: digest("a"),
  drop_id: "AUTOPILOT-CANDIDATE-DISPATCH-002", activation_baseline: sha("b"),
  protected_contract: { path: "docs/agent/drops/AUTOPILOT-CANDIDATE-DISPATCH-002.md", sha256: digest("c") },
});
const candidate = (overrides: Record<string, unknown> = {}) => ({
  number: 100, url: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/100", state: "OPEN",
  branch: "beyond-builder/autopilot-candidate-dispatch-002-abc", head_sha: sha("d"), base_sha: expected.activation_baseline,
  author_login: "beyond-builder[bot]", identity: expected, ...overrides,
});
const reconcile = (candidates: Array<Record<string, unknown>> = []) => reconcileCandidates({
  expected_identity: expected, expected_builder_login: "beyond-builder[bot]", candidates,
});

describe("Factory candidate identity", () => {
  it("binds protected contract content and round-trips one machine marker", () => {
    const protectedContract = protectedContractIdentity({ path: expected.protected_contract.path, content: "protected content\n" });
    expect(protectedContract.sha256).toHaveLength(64);
    expect(parseCandidateMarker(`text\n${encodeCandidateMarker({ ...expected, protected_contract: protectedContract })}`)).toMatchObject({
      state: "VALID", identity: { drop_id: expected.drop_id, protected_contract: protectedContract },
    });
  });

  it.each([
    ["missing", "", "MISSING"],
    ["malformed", `<!-- BEYOND_FACTORY_CANDIDATE_V1 nope -->`, "MALFORMED"],
    ["multiple", `${encodeCandidateMarker(expected)}\n${encodeCandidateMarker(expected)}`, "MALFORMED"],
  ])("reports %s marker evidence", (_name, body, state) => expect(parseCandidateMarker(body)).toMatchObject({ state }));
});

describe("Factory candidate reconciliation", () => {
  it("dispatches creation when no candidate exists", () => {
    expect(reconcile()).toMatchObject({ ok: true, action: "CREATE_CANDIDATE", role: "BUILDER", external_session_required: true });
  });

  it("reuses one exact open candidate idempotently", () => {
    expect(reconcile([candidate()])).toMatchObject({ ok: true, action: "REUSE_CANDIDATE", candidate: { number: 100 } });
  });

  it("routes a merged candidate to an external Integrator for closure", () => {
    expect(reconcile([candidate({ state: "MERGED" })])).toMatchObject({ ok: true, action: "ROUTE_EXISTING_CANDIDATE", role: "INTEGRATOR" });
  });

  it("creates a clean replacement for a stale closed candidate without carrying evidence", () => {
    expect(reconcile([candidate({ state: "CLOSED" })])).toMatchObject({ ok: true, action: "CREATE_REPLACEMENT_CANDIDATE", stale_candidates: [{ number: 100 }] });
  });

  it("preserves obsolete baseline candidates while allowing a new candidate", () => {
    const obsolete = candidate({ identity: { ...expected, activation_baseline: sha("e") }, state: "CLOSED" });
    expect(reconcile([obsolete])).toMatchObject({ action: "CREATE_CANDIDATE", obsolete_candidates: [{ number: 100 }] });
  });

  it("preserves a closed pre-marker candidate as legacy obsolete evidence", () => {
    const legacy = { number: 54, url: "https://github.com/example/pull/54", state: "CLOSED", branch: "codex/autopilot-candidate-dispatch-002", body: "pre-ruling" };
    expect(reconcile([legacy])).toMatchObject({ action: "CREATE_CANDIDATE", obsolete_candidates: [{ number: 54 }] });
  });

  it.each([
    ["equivalent duplicate", [candidate(), candidate({ number: 101 })], "EQUIVALENT_DUPLICATE_CANDIDATES"],
    ["divergent duplicate", [candidate(), candidate({ number: 101, head_sha: sha("e") })], "DIVERGENT_CANDIDATES"],
    ["protected contract mismatch", [candidate({ identity: { ...expected, protected_contract: { ...expected.protected_contract, sha256: digest("e") } } })], "PROTECTED_CONTRACT_MISMATCH"],
    ["campaign mismatch", [candidate({ identity: { ...expected, campaign_digest: digest("e") } })], "CAMPAIGN_IDENTITY_MISMATCH"],
    ["campaign id mismatch", [candidate({ identity: { ...expected, campaign_id: "OTHER-CAMPAIGN" } })], "CAMPAIGN_IDENTITY_MISMATCH"],
    ["base mismatch", [candidate({ base_sha: sha("e") })], "CANDIDATE_BASELINE_MISMATCH"],
    ["human-authored candidate", [candidate({ author_login: "gavinlohnes" })], "CANDIDATE_AUTHOR_MISMATCH"],
  ])("fails closed for %s", (_name, candidates, code) => {
    expect(reconcile(candidates)).toMatchObject({ ok: false, action: "ESCALATION_REQUIRED", escalation: { code } });
  });

  it("fails closed for ambiguous malformed evidence on a candidate-shaped branch", () => {
    const malformed = { number: 102, state: "OPEN", branch: "builder/autopilot-candidate-dispatch-002", body: "bad" };
    expect(reconcile([malformed])).toMatchObject({ escalation: { code: "AMBIGUOUS_CANDIDATE_EVIDENCE" } });
  });

  it("refuses malformed expected scope and baseline", () => {
    expect(reconcileCandidates({ expected_identity: { ...expected, activation_baseline: "master" }, expected_builder_login: "beyond-builder[bot]" })).toMatchObject({ escalation: { code: "MALFORMED_EXPECTED_IDENTITY" } });
  });

  it("requires the configured Builder App rather than any bot account", () => {
    expect(reconcile([candidate({ author_login: "dependabot[bot]" })])).toMatchObject({ escalation: { code: "CANDIDATE_AUTHOR_MISMATCH" } });
    expect(reconcileCandidates({ expected_identity: expected, expected_builder_login: "" })).toMatchObject({ escalation: { code: "MALFORMED_EXPECTED_BUILDER" } });
  });
});
