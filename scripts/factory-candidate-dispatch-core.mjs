import { createHash } from "node:crypto";

export const CANDIDATE_STATE = Object.freeze({
  NONE: "NO_CANDIDATE",
  REUSABLE: "REUSABLE_CANDIDATE",
  EQUIVALENT: "EQUIVALENT_CANDIDATES",
  OBSOLETE: "OBSOLETE_CANDIDATES",
  DIVERGENT: "DIVERGENT_CANDIDATES",
  MALFORMED: "MALFORMED_CANDIDATE_EVIDENCE",
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function candidateIdentity(input) {
  const identity = {
    campaign_id: input?.campaign_id,
    campaign_revision: input?.campaign_revision,
    campaign_digest: input?.campaign_digest,
    drop_id: input?.drop_id,
    activation_baseline: input?.activation_baseline,
    contract_path: input?.contract_path,
    contract_digest: input?.contract_digest,
  };
  if (Object.values(identity).some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error("MALFORMED_CANDIDATE_IDENTITY");
  }
  return Object.freeze({
    schema_version: 1,
    ...identity,
    candidate_key: createHash("sha256").update(JSON.stringify(stable(identity))).digest("hex"),
  });
}

export function candidateMarker(identity, headSha, sourceHeadSha = headSha) {
  if (!/^[0-9a-f]{40}$/.test(headSha ?? "")) throw new Error("INVALID_CANDIDATE_HEAD");
  if (!/^[0-9a-f]{40}$/.test(sourceHeadSha ?? "")) throw new Error("INVALID_SOURCE_HEAD");
  return { domain: "BEYOND_FACTORY_CANDIDATE", schema_version: 1, ...identity, source_head_sha: sourceHeadSha, head_sha: headSha };
}

function sameIdentity(candidate, expected) {
  return candidate.candidate_key === expected.candidate_key && sameIdentityFields(candidate, expected);
}

function sameIdentityFields(candidate, expected) {
  return candidate.campaign_id === expected.campaign_id &&
    candidate.campaign_revision === expected.campaign_revision &&
    candidate.campaign_digest === expected.campaign_digest &&
    candidate.drop_id === expected.drop_id &&
    candidate.activation_baseline === expected.activation_baseline &&
    candidate.contract_path === expected.contract_path &&
    candidate.contract_digest === expected.contract_digest;
}

function malformed(candidate) {
  return !candidate || candidate.domain !== "BEYOND_FACTORY_CANDIDATE" || candidate.schema_version !== 1 ||
    !Number.isInteger(candidate.pr_number) || candidate.pr_number < 1 ||
    typeof candidate.pr_url !== "string" || typeof candidate.branch !== "string" ||
    !/^[0-9a-f]{40}$/.test(candidate.head_sha ?? "") || !/^[0-9a-f]{40}$/.test(candidate.source_head_sha ?? "") ||
    typeof candidate.author_type !== "string" || typeof candidate.author_login !== "string" ||
    typeof candidate.candidate_key !== "string";
}

export function reconcileCandidates({ expected, candidates = [], builder_login: builderLogin, source_head_sha: sourceHeadSha = null }) {
  if (!expected?.candidate_key || !builderLogin) return { ok: false, state: CANDIDATE_STATE.MALFORMED, reason: "TRUSTED_INPUT_REQUIRED" };
  if (!Array.isArray(candidates)) return { ok: false, state: CANDIDATE_STATE.MALFORMED, reason: "CANDIDATES_MUST_BE_ARRAY" };
  const malformedEvidence = candidates.filter(malformed);
  if (malformedEvidence.length) {
    return { ok: false, state: CANDIDATE_STATE.MALFORMED, reason: "UNTRUSTED_CANDIDATE_SHAPE", pr_numbers: malformedEvidence.map((item) => item?.pr_number).filter(Boolean).sort((a, b) => a - b) };
  }

  const sameDrop = candidates.filter((candidate) => candidate.drop_id === expected.drop_id);
  const sameRevision = sameDrop.filter((candidate) => sameIdentity(candidate, expected));
  const current = sourceHeadSha ? sameRevision.filter((candidate) => candidate.source_head_sha === sourceHeadSha) : sameRevision;
  const priorSources = sourceHeadSha ? sameRevision.filter((candidate) => candidate.source_head_sha !== sourceHeadSha) : [];
  const conflictingIdentity = sameDrop.filter((candidate) =>
    !sameIdentity(candidate, expected) && (candidate.candidate_key === expected.candidate_key || sameIdentityFields(candidate, expected)),
  );
  if (conflictingIdentity.length) {
    return { ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "CANONICAL_IDENTITY_CONFLICT", pr_numbers: conflictingIdentity.map((item) => item.pr_number).sort((a, b) => a - b) };
  }
  const obsolete = [...sameDrop.filter((candidate) => !sameIdentity(candidate, expected)), ...priorSources];
  const invalidCurrent = current.filter((candidate) =>
    candidate.author_login !== builderLogin || candidate.base_sha !== expected.activation_baseline || candidate.marker_head_sha !== candidate.head_sha,
  );
  if (invalidCurrent.length) {
    return { ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "CURRENT_IDENTITY_EVIDENCE_CONFLICT", pr_numbers: invalidCurrent.map((item) => item.pr_number).sort((a, b) => a - b) };
  }
  const heads = new Set(current.map((candidate) => candidate.head_sha));
  if (heads.size > 1) {
    return { ok: false, state: CANDIDATE_STATE.DIVERGENT, reason: "SAME_KEY_DIFFERENT_HEADS", pr_numbers: current.map((item) => item.pr_number).sort((a, b) => a - b) };
  }
  if (current.length > 1) {
    const ordered = [...current].sort((a, b) => a.pr_number - b.pr_number);
    return { ok: true, state: CANDIDATE_STATE.EQUIVALENT, canonical: ordered[0], duplicates: ordered.slice(1), obsolete };
  }
  if (current.length === 1) return { ok: true, state: CANDIDATE_STATE.REUSABLE, canonical: current[0], obsolete };
  if (obsolete.length) return { ok: true, state: CANDIDATE_STATE.OBSOLETE, obsolete };
  return { ok: true, state: CANDIDATE_STATE.NONE, obsolete: [] };
}

export function dispatchEnvelope({ reconciliation, identity, evidence_source = "LIVE_GITHUB", candidate = null }) {
  const refused = !reconciliation?.ok;
  const reusable = reconciliation?.state === CANDIDATE_STATE.REUSABLE || reconciliation?.state === CANDIDATE_STATE.EQUIVALENT;
  const action = refused ? "REFUSE_DISPATCH" : reusable ? "REUSE_CANDIDATE" : "CREATE_CANDIDATE";
  return {
    schema_version: 1,
    ok: !refused,
    state: reconciliation?.state ?? CANDIDATE_STATE.MALFORMED,
    action,
    role: "BUILDER",
    candidate_identity: identity,
    candidate: candidate ?? reconciliation?.canonical ?? null,
    evidence_source,
    external_session: {
      required: true,
      launcher_available: false,
      launch_performed: false,
      statement: "Repository output describes work for an external role-capable session; it does not launch Codex or Claude sessions.",
    },
    required_inputs: ["trusted_master", "live_campaign_authorization", "live_github_candidates"],
    ...(refused ? { refusal: { code: reconciliation.state, reason: reconciliation.reason } } : {}),
  };
}
