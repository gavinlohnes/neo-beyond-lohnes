import { describe, expect, it } from "vitest";
import {
  CANDIDATE_STATE,
  candidateIdentity,
  candidateMarker,
  dispatchEnvelope,
  reconcileCandidates,
} from "../../scripts/factory-candidate-dispatch-core.mjs";

const SHA = {
  baseline: "1".repeat(40),
  head: "2".repeat(40),
  other: "3".repeat(40),
  contract: "4".repeat(64),
  campaign: "5".repeat(64),
};

function identity(overrides: Record<string, unknown> = {}) {
  return candidateIdentity({
    campaign_id: "FACTORY-PHASE-2",
    campaign_revision: "FACTORY-PHASE-2-R1",
    campaign_digest: SHA.campaign,
    drop_id: "AUTOPILOT-CANDIDATE-DISPATCH-002",
    activation_baseline: SHA.baseline,
    contract_path: "docs/agent/drops/AUTOPILOT-CANDIDATE-DISPATCH-002.md",
    contract_digest: SHA.contract,
    ...overrides,
  });
}

function candidate(overrides: Record<string, unknown> = {}) {
  const expected = identity();
  return {
    domain: "BEYOND_FACTORY_CANDIDATE",
    schema_version: 1,
    ...expected,
    pr_number: 70,
    pr_url: "https://github.com/gavinlohnes/neo-beyond-lohnes/pull/70",
    branch: `beyond-builder/candidate-${String(expected.candidate_key).slice(0, 12)}`,
    base_sha: SHA.baseline,
    head_sha: SHA.head,
    source_head_sha: SHA.other,
    marker_head_sha: SHA.head,
    author_login: "beyond-builder[bot]",
    author_type: "Bot",
    ...overrides,
  };
}

function reconcile(candidates: Array<Record<string, unknown>>, expected = identity()) {
  return reconcileCandidates({ expected, candidates, builder_login: "beyond-builder[bot]", source_head_sha: SHA.other });
}

describe("Factory candidate identity", () => {
  it("is deterministic and changes for every trusted identity dimension", () => {
    const base = identity();
    expect(identity()).toEqual(base);
    const dimensions: Array<[string, string]> = [
      ["campaign_id", "OTHER"], ["campaign_revision", "R2"], ["campaign_digest", "6".repeat(64)],
      ["drop_id", "OTHER-DROP"], ["activation_baseline", "7".repeat(40)],
      ["contract_path", "docs/agent/drops/OTHER.md"], ["contract_digest", "8".repeat(64)],
    ];
    for (const [field, value] of dimensions) {
      expect(identity({ [field]: value }).candidate_key).not.toBe(base.candidate_key);
    }
  });

  it("refuses incomplete trusted identity", () => {
    expect(() => identity({ campaign_digest: "" })).toThrow("MALFORMED_CANDIDATE_IDENTITY");
    expect(() => candidateMarker(identity(), "not-a-sha")).toThrow("INVALID_CANDIDATE_HEAD");
  });
});

describe("Factory candidate reconciliation", () => {
  it("reports no candidate deterministically", () => {
    expect(reconcile([])).toMatchObject({ ok: true, state: CANDIDATE_STATE.NONE });
  });

  it("reuses one exact Builder-App candidate", () => {
    expect(reconcile([candidate()])).toMatchObject({ ok: true, state: CANDIDATE_STATE.REUSABLE, canonical: { pr_number: 70 } });
  });

  it("chooses the lowest PR number only for byte-equivalent duplicate heads", () => {
    const result = reconcile([candidate({ pr_number: 72 }), candidate({ pr_number: 71 })]);
    expect(result).toMatchObject({ ok: true, state: CANDIDATE_STATE.EQUIVALENT, canonical: { pr_number: 71 }, duplicates: [{ pr_number: 72 }] });
  });

  it("fails closed when the same canonical key has divergent heads", () => {
    expect(reconcile([candidate(), candidate({ pr_number: 71, head_sha: SHA.other, marker_head_sha: SHA.other })]))
      .toMatchObject({ ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "SAME_KEY_DIFFERENT_HEADS" });
  });

  it("preserves an older source head as obsolete and permits a fresh replacement", () => {
    expect(reconcileCandidates({ expected: identity(), candidates: [candidate()], builder_login: "beyond-builder[bot]", source_head_sha: SHA.head }))
      .toMatchObject({ ok: true, state: CANDIDATE_STATE.OBSOLETE, obsolete: [{ pr_number: 70 }] });
  });

  it.each([
    ["wrong Builder identity", { author_login: "gavinlohnes", author_type: "User" }],
    ["wrong base", { base_sha: SHA.other }],
    ["marker/head mismatch", { marker_head_sha: SHA.other }],
  ])("fails closed for %s", (_name, override) => {
    expect(reconcile([candidate(override)])).toMatchObject({ ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "CURRENT_IDENTITY_EVIDENCE_CONFLICT" });
  });

  it("separates obsolete trusted revisions from the current candidate", () => {
    const old = identity({ campaign_revision: "FACTORY-PHASE-2-R0" });
    const obsolete = candidate({ ...old, candidate_key: old.candidate_key });
    expect(reconcile([obsolete])).toMatchObject({ ok: true, state: CANDIDATE_STATE.OBSOLETE, obsolete: [{ pr_number: 70 }] });
    expect(reconcile([obsolete, candidate({ pr_number: 71 })])).toMatchObject({ ok: true, state: CANDIDATE_STATE.REUSABLE, canonical: { pr_number: 71 }, obsolete: [{ pr_number: 70 }] });
  });

  it("refuses a forged key or altered tuple that claims the current identity", () => {
    expect(reconcile([candidate({ candidate_key: "f".repeat(64) })]))
      .toMatchObject({ ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "CANONICAL_IDENTITY_CONFLICT" });
    expect(reconcile([candidate({ campaign_digest: "f".repeat(64) })]))
      .toMatchObject({ ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "CANONICAL_IDENTITY_CONFLICT" });
  });

  it("rejects malformed or non-Bot evidence rather than guessing", () => {
    const malformed = candidate();
    delete (malformed as Record<string, unknown>).head_sha;
    expect(reconcile([malformed])).toMatchObject({ ok: false, state: CANDIDATE_STATE.MALFORMED, reason: "UNTRUSTED_CANDIDATE_SHAPE" });
  });
});

describe("Factory dispatch envelope", () => {
  it("truthfully requires an external role-capable session", () => {
    const expected = identity();
    const envelope = dispatchEnvelope({ reconciliation: reconcile([]), identity: expected });
    expect(envelope).toMatchObject({
      ok: true,
      action: "CREATE_CANDIDATE",
      role: "BUILDER",
      external_session: { required: true, launcher_available: false, launch_performed: false },
    });
    expect(JSON.stringify(envelope)).not.toMatch(/launched|session_id/i);
  });

  it("emits a stable refusal instead of dispatching divergent candidates", () => {
    const expected = identity();
    const divergent = reconcile([candidate(), candidate({ pr_number: 71, head_sha: SHA.other, marker_head_sha: SHA.other })]);
    expect(dispatchEnvelope({ reconciliation: divergent, identity: expected })).toMatchObject({
      ok: false,
      action: "REFUSE_DISPATCH",
      refusal: { code: CANDIDATE_STATE.DIVERGENT, reason: "SAME_KEY_DIFFERENT_HEADS" },
      external_session: { launch_performed: false },
    });
  });
});
