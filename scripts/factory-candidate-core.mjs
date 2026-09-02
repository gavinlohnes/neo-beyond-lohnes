import { createHash } from "node:crypto";

const STATES = new Set(["OPEN", "CLOSED", "MERGED"]);
const STAGES = new Set(["BUILDING", "READY_FOR_REVIEW"]);

function stable(value) {
  return Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
}

export function candidateIdentity(target) {
  const identity = {
    campaign_id: target?.campaign_id,
    campaign_revision: target?.campaign_revision,
    campaign_digest: target?.campaign_digest,
    drop_id: target?.drop_id,
    baseline: target?.baseline,
    contract: { path: target?.contract?.path, digest: target?.contract?.digest },
  };
  const missing = [];
  for (const [key, value] of Object.entries(identity)) if (key !== "contract" && !value) missing.push(key);
  if (!identity.contract.path) missing.push("contract.path");
  if (!/^docs\/agent\/drops\/[A-Z0-9-]+\.md$/.test(identity.contract.path ?? "")) missing.push("contract.path");
  if (!/^[0-9a-f]{64}$/.test(identity.contract.digest ?? "")) missing.push("contract.digest");
  if (!/^[0-9a-f]{64}$/.test(identity.campaign_digest ?? "")) missing.push("campaign_digest");
  if (!/^[0-9a-f]{40}$/.test(identity.baseline ?? "")) missing.push("baseline");
  if (missing.length) throw new Error(`MALFORMED_CANDIDATE_TARGET:${[...new Set(missing)].join(",")}`);
  const canonical = JSON.stringify(stable(identity));
  return { ...identity, key: createHash("sha256").update(canonical).digest("hex"), canonical };
}

export function candidateMarker(target) {
  const identity = candidateIdentity(target);
  return { type: "FACTORY_CANDIDATE", schema_version: 1, ...identity };
}

export function parseCandidateMarker(body) {
  const matches = [...String(body ?? "").matchAll(/<!--\s*BEYOND_FACTORY_CANDIDATE\s+(\{[^\r\n]+\})\s*-->/g)];
  if (matches.length !== 1) return { error: matches.length ? "DUPLICATE_CANDIDATE_MARKERS" : "MISSING_CANDIDATE_MARKER" };
  try {
    const marker = JSON.parse(matches[0][1]);
    if (marker.type !== "FACTORY_CANDIDATE" || marker.schema_version !== 1) return { error: "UNKNOWN_CANDIDATE_MARKER" };
    const derived = candidateIdentity(marker);
    if (marker.key !== derived.key || marker.canonical !== derived.canonical) return { error: "FORGED_CANDIDATE_IDENTITY" };
    return { marker };
  } catch { return { error: "MALFORMED_CANDIDATE_MARKER" }; }
}

function envelope(action, role, identity, extra = {}) {
  return {
    schema_version: 1,
    ok: true,
    action,
    role,
    candidate_identity: identity.key,
    repository_launch_supported: false,
    external_dispatch_required: true,
    approvals_transfer: false,
    ...extra,
  };
}

function refusal(code, identity, detail, candidates = []) {
  return { schema_version: 1, ok: false, action: "ESCALATION_REQUIRED", candidate_identity: identity?.key ?? null, escalation: { code, detail }, candidate_prs: candidates.map((candidate) => candidate.pr_url).filter(Boolean) };
}

export function reconcileCandidates({ target, candidates = [] }) {
  let identity;
  try { identity = candidateIdentity(target); } catch (error) { return refusal("MALFORMED_CANDIDATE_TARGET", null, error.message); }
  if (!Array.isArray(candidates)) return refusal("MALFORMED_CANDIDATE_SET", identity, "candidates must be an array");

  const relevant = [];
  for (const candidate of candidates) {
    if (!candidate || !STATES.has(candidate.state) || !/^https:\/\/github\.com\/gavinlohnes\/neo-beyond-lohnes\/pull\/\d+$/.test(candidate.pr_url ?? "") || !/^[0-9a-f]{40}$/.test(candidate.head_sha ?? "") || !/^[0-9a-f]{40}$/.test(candidate.base_sha ?? "") || !candidate.branch || !candidate.author_login || !candidate.author_type) {
      return refusal("AMBIGUOUS_CANDIDATE", identity, "candidate evidence is missing required GitHub fields", [candidate ?? {}]);
    }
    const parsed = parseCandidateMarker(candidate.body);
    if (parsed.error) return refusal("AMBIGUOUS_CANDIDATE", identity, parsed.error, [candidate]);
    if (parsed.marker.campaign_id === identity.campaign_id && parsed.marker.drop_id === identity.drop_id) relevant.push({ ...candidate, marker: parsed.marker });
  }

  const open = relevant.filter((candidate) => candidate.state === "OPEN");
  const divergent = open.filter((candidate) => candidate.marker.key !== identity.key || candidate.base_sha !== identity.baseline);
  if (divergent.length) return refusal("CONFLICTING_CANDIDATE_SCOPE", identity, "an open candidate differs in campaign revision/digest, baseline, contract, or Drop identity", divergent);
  const matching = open.filter((candidate) => candidate.marker.key === identity.key && candidate.base_sha === identity.baseline);
  if (matching.length > 1) return refusal("DUPLICATE_VALID_CANDIDATES", identity, "more than one open candidate has the canonical identity", matching);
  if (matching.length === 1) {
    const candidate = matching[0];
    if (candidate.author_type !== "Bot" || candidate.author_login !== "beyond-builder[bot]") {
      return refusal("BUILDER_IDENTITY_MISMATCH", identity, "canonical candidate is not authored by beyond-builder[bot]", [candidate]);
    }
    if (!STAGES.has(candidate.stage)) return refusal("AMBIGUOUS_CANDIDATE_STAGE", identity, "candidate stage is missing or unknown", [candidate]);
    const obsolete = relevant.filter((item) => item.state !== "OPEN").map((item) => item.pr_url);
    return candidate.stage === "READY_FOR_REVIEW"
      ? envelope("REVIEW_EXACT_HEAD", "REVIEWER", identity, { candidate: { pr_url: candidate.pr_url, head_sha: candidate.head_sha, branch: candidate.branch }, reuse: true, preserve_obsolete_evidence: true, obsolete_candidates: obsolete })
      : envelope("CONTINUE_CANDIDATE", "BUILDER", identity, { candidate: { pr_url: candidate.pr_url, head_sha: candidate.head_sha, branch: candidate.branch }, reuse: true, preserve_obsolete_evidence: true, obsolete_candidates: obsolete });
  }

  return envelope("CREATE_CANDIDATE", "BUILDER", identity, {
    reuse: false,
    branch: `beyond-builder/candidate-${identity.key.slice(0, 20)}`,
    marker: candidateMarker(target),
    preserve_obsolete_evidence: true,
    obsolete_candidates: relevant.filter((candidate) => candidate.state !== "OPEN").map((candidate) => candidate.pr_url),
  });
}
