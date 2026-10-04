import { createHash } from "node:crypto";

export const CANDIDATE_MARKER = "BEYOND_FACTORY_CANDIDATE_V1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function protectedContractIdentity({ path, content }) {
  if (!/^docs\/agent\/drops\/[A-Z0-9-]+\.md$/.test(path ?? "") || typeof content !== "string" || !content) {
    throw new Error("INVALID_PROTECTED_CONTRACT");
  }
  return { path, sha256: createHash("sha256").update(content).digest("hex") };
}

export function candidateIdentity(input) {
  const identity = {
    campaign_id: input?.campaign_id,
    campaign_revision: input?.campaign_revision,
    campaign_digest: input?.campaign_digest,
    drop_id: input?.drop_id,
    activation_baseline: input?.activation_baseline,
    protected_contract: input?.protected_contract,
  };
  const validSha = (value) => /^[0-9a-f]{40}$/.test(value ?? "");
  const validDigest = (value) => /^[0-9a-f]{64}$/.test(value ?? "");
  if (!identity.campaign_id || !identity.campaign_revision || !identity.drop_id ||
      !validDigest(identity.campaign_digest) || !validSha(identity.activation_baseline) ||
      !identity.protected_contract?.path || !validDigest(identity.protected_contract?.sha256)) {
    throw new Error("MALFORMED_CANDIDATE_IDENTITY");
  }
  return stable(identity);
}

export function encodeCandidateMarker(identity) {
  return `<!-- ${CANDIDATE_MARKER} ${JSON.stringify(candidateIdentity(identity))} -->`;
}

export function parseCandidateMarker(body) {
  const matches = [...String(body ?? "").matchAll(new RegExp(`<!--\\s*${CANDIDATE_MARKER}\\s+([\\s\\S]*?)\\s*-->`, "g"))];
  if (matches.length === 0) return { state: "MISSING" };
  if (matches.length !== 1) return { state: "MALFORMED", code: "MULTIPLE_IDENTITY_MARKERS" };
  try {
    return { state: "VALID", identity: candidateIdentity(JSON.parse(matches[0][1])) };
  } catch {
    return { state: "MALFORMED", code: "MALFORMED_IDENTITY_MARKER" };
  }
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function dispatch(action, role, identity, evidence, extra = {}) {
  return {
    schema_version: 1,
    ok: action !== "ESCALATION_REQUIRED",
    action,
    role,
    external_session_required: true,
    candidate_identity: identity,
    evidence_source: evidence,
    ...extra,
  };
}

function fail(code, identity, evidence, candidates) {
  return dispatch("ESCALATION_REQUIRED", "OWNER", identity, evidence, {
    escalation: { code },
    candidates,
    required_inputs: ["Resolve the conflicting candidate evidence; no candidate was selected."],
  });
}

export function reconcileCandidates({ expected_identity, expected_builder_login, candidates = [], evidence_source = "LIVE_GITHUB" }) {
  let expected;
  try { expected = candidateIdentity(expected_identity); } catch {
    return fail("MALFORMED_EXPECTED_IDENTITY", expected_identity ?? null, evidence_source, []);
  }
  if (!/^[a-z0-9-]+\[bot\]$/i.test(expected_builder_login ?? "")) {
    return fail("MALFORMED_EXPECTED_BUILDER", expected, evidence_source, []);
  }
  if (!Array.isArray(candidates)) return fail("MALFORMED_CANDIDATE_SET", expected, evidence_source, []);

  const relevant = [];
  const legacyObsolete = [];
  for (const item of candidates) {
    const parsed = item?.identity ? (() => {
      try { return { state: "VALID", identity: candidateIdentity(item.identity) }; } catch { return { state: "MALFORMED" }; }
    })() : parseCandidateMarker(item?.body);
    const branchClaimsDrop = String(item?.branch ?? "").toLowerCase().includes(expected.drop_id.toLowerCase());
    if (parsed.state !== "VALID") {
      if (branchClaimsDrop && item?.state === "CLOSED") {
        legacyObsolete.push({ number: item?.number, url: item?.url, state: item.state, branch: item.branch });
        continue;
      }
      if (branchClaimsDrop) return fail("AMBIGUOUS_CANDIDATE_EVIDENCE", expected, evidence_source, [{ number: item?.number, state: parsed.state }]);
      continue;
    }
    if (parsed.identity.drop_id === expected.drop_id) {
      relevant.push({ ...item, identity: parsed.identity });
    }
  }

  const exact = relevant.filter((item) => same(item.identity, expected));
  const invalidExact = exact.filter((item) =>
    item.base_sha !== expected.activation_baseline || item.author_login !== expected_builder_login);
  if (invalidExact.length) {
    const code = invalidExact.some((item) => item.base_sha !== expected.activation_baseline)
      ? "CANDIDATE_BASELINE_MISMATCH" : "CANDIDATE_AUTHOR_MISMATCH";
    return fail(code, expected, evidence_source, invalidExact);
  }
  const contractDivergent = relevant.filter((item) =>
    item.identity.activation_baseline === expected.activation_baseline &&
    !same(item.identity.protected_contract, expected.protected_contract));
  if (contractDivergent.length) return fail("PROTECTED_CONTRACT_MISMATCH", expected, evidence_source, contractDivergent);

  const campaignDivergent = relevant.filter((item) =>
    item.identity.campaign_id !== expected.campaign_id || item.identity.campaign_revision !== expected.campaign_revision ||
    item.identity.campaign_digest !== expected.campaign_digest);
  if (campaignDivergent.length) return fail("CAMPAIGN_IDENTITY_MISMATCH", expected, evidence_source, campaignDivergent);

  const obsolete = relevant.filter((item) => item.identity.activation_baseline !== expected.activation_baseline);
  const openExact = exact.filter((item) => item.state === "OPEN");
  const mergedExact = exact.filter((item) => item.state === "MERGED");
  const closedExact = exact.filter((item) => item.state === "CLOSED");

  if (mergedExact.length > 1) return fail("DUPLICATE_MERGED_CANDIDATES", expected, evidence_source, mergedExact);
  if (mergedExact.length === 1) {
    return dispatch("ROUTE_EXISTING_CANDIDATE", "INTEGRATOR", expected, evidence_source, {
      candidate: mergedExact[0], required_inputs: ["Verify protected integration and perform truthful Drop closure."],
      obsolete_candidates: [...obsolete, ...legacyObsolete],
    });
  }
  if (openExact.length > 1) {
    const heads = new Set(openExact.map((item) => item.head_sha));
    return fail(heads.size === 1 ? "EQUIVALENT_DUPLICATE_CANDIDATES" : "DIVERGENT_CANDIDATES", expected, evidence_source, openExact);
  }
  if (openExact.length === 1) {
    return dispatch("REUSE_CANDIDATE", "BUILDER", expected, evidence_source, {
      candidate: openExact[0], required_inputs: ["Continue only on the exact candidate head; prior-head reviews do not carry."],
      obsolete_candidates: [...obsolete, ...legacyObsolete],
    });
  }
  if (closedExact.length) {
    return dispatch("CREATE_REPLACEMENT_CANDIDATE", "BUILDER", expected, evidence_source, {
      stale_candidates: closedExact,
      obsolete_candidates: [...obsolete, ...legacyObsolete],
      required_inputs: ["Create a new candidate; no review or CI evidence carries from a closed candidate."],
    });
  }
  return dispatch("CREATE_CANDIDATE", "BUILDER", expected, evidence_source, {
    obsolete_candidates: [...obsolete, ...legacyObsolete],
    required_inputs: ["Create one Builder-App candidate from the activation baseline and protected contract identity."],
  });
}
