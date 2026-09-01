const RISK_ORDER = Object.freeze({ ROUTINE: 0, ARCHITECTURAL: 1, "HIGH-RISK": 2 });
const CAMPAIGN_STATUSES = new Set(["DRAFT", "APPROVED", "COMPLETE"]);

export const NEXT_ACTION = Object.freeze({
  NO_CAMPAIGN: "NO_CAMPAIGN",
  DROP_READY: "DROP_READY",
  BUILD: "BUILD",
  WAITING_FOR_PR: "WAITING_FOR_PR",
  WAITING_FOR_CI: "WAITING_FOR_CI",
  FIX_VERIFICATION: "FIX_VERIFICATION",
  WAITING_FOR_REVIEW: "WAITING_FOR_REVIEW",
  STALE_APPROVAL: "STALE_APPROVAL",
  READY_FOR_INTEGRATION: "READY_FOR_INTEGRATION",
  READY_FOR_CLOSURE: "READY_FOR_CLOSURE",
  CAMPAIGN_COMPLETE: "CAMPAIGN_COMPLETE",
  LEGACY_DROP_ACTIVE: "LEGACY_DROP_ACTIVE",
  ESCALATION_REQUIRED: "ESCALATION_REQUIRED",
});

function result(action, extra = {}) {
  return { ok: action !== NEXT_ACTION.ESCALATION_REQUIRED, action, ...extra };
}

function escalation(code, detail) {
  return result(NEXT_ACTION.ESCALATION_REQUIRED, { escalation: { code, detail } });
}

export function reconcileActiveDrops(candidates) {
  const active = (candidates ?? []).filter((item) => item?.status === "ACTIVE");
  const byId = new Map();
  for (const item of active) {
    const current = byId.get(item.id);
    if (current && (current.baseline !== item.baseline || current.contract !== item.contract || current.pr !== item.pr)) {
      return { error: "MULTIPLE_ACTIVE_DROPS", ids: active.map((candidate) => candidate.id) };
    }
    byId.set(item.id, item);
  }
  const unique = [...byId.values()];
  if (unique.length > 1) return { error: "MULTIPLE_ACTIVE_DROPS", ids: unique.map((item) => item.id) };
  return { active: unique[0] ?? null };
}

function validateCampaign(campaign) {
  if (!campaign || typeof campaign !== "object" || Array.isArray(campaign)) {
    return escalation("MALFORMED_CAMPAIGN", "Campaign must be a JSON object.");
  }
  if (campaign.schema_version !== 1) {
    return escalation("UNSUPPORTED_CAMPAIGN_SCHEMA", "campaign.schema_version must equal 1.");
  }
  if (!campaign.id || !campaign.title || !CAMPAIGN_STATUSES.has(campaign.status)) {
    return escalation("MALFORMED_CAMPAIGN", "Campaign requires id, title, and DRAFT/APPROVED/COMPLETE status.");
  }
  if (!Object.hasOwn(RISK_ORDER, campaign.risk_ceiling)) {
    return escalation("MALFORMED_CAMPAIGN", "Campaign risk_ceiling must be ROUTINE, ARCHITECTURAL, or HIGH-RISK.");
  }
  if (!campaign.authorization || !campaign.authorization.owner_approved || !campaign.authorization.approved_by) {
    return escalation("CAMPAIGN_NOT_APPROVED", "Campaign lacks durable owner approval and approver identity.");
  }
  if (!Array.isArray(campaign.drops)) {
    return escalation("MALFORMED_CAMPAIGN", "Campaign drops must be an ordered array.");
  }
  const seen = new Set();
  for (const drop of campaign.drops) {
    if (!drop || !drop.id || !drop.title || !Object.hasOwn(RISK_ORDER, drop.risk_tier) || !Array.isArray(drop.depends_on)) {
      return escalation("MALFORMED_CAMPAIGN", "Each Drop requires id, title, risk_tier, and depends_on[].");
    }
    if (seen.has(drop.id)) return escalation("MALFORMED_CAMPAIGN", `Duplicate Drop id: ${drop.id}.`);
    if (RISK_ORDER[drop.risk_tier] > RISK_ORDER[campaign.risk_ceiling]) {
      return escalation("RISK_CEILING_EXCEEDED", `${drop.id} exceeds campaign risk ceiling ${campaign.risk_ceiling}.`);
    }
    if (drop.risk_tier === "HIGH-RISK" && (!drop.owner_ruling?.obtained || !drop.owner_ruling?.reference)) {
      return escalation("HIGH_RISK_OWNER_RULING_REQUIRED", `${drop.id} lacks a durable owner ruling.`);
    }
    for (const dependency of drop.depends_on) {
      if (!seen.has(dependency)) {
        return escalation("MALFORMED_CAMPAIGN", `${drop.id} depends on missing or later Drop ${dependency}.`);
      }
    }
    seen.add(drop.id);
  }
  return null;
}

function successfulRequiredCheck(pr, requiredCheck) {
  const matching = (pr.checks ?? [])
    .filter((candidate) => candidate.name === requiredCheck)
    .sort((a, b) => {
      const aTime = Date.parse(a.completed_at ?? a.started_at ?? "") || 0;
      const bTime = Date.parse(b.completed_at ?? b.started_at ?? "") || 0;
      return bTime - aTime || Number(b.id ?? 0) - Number(a.id ?? 0);
    });
  const check = matching[0];
  if (!check) return { state: "MISSING" };
  if (check.head_sha && check.head_sha !== pr.head_sha) return { state: "HEAD_MISMATCH", check };
  if (check.status !== "COMPLETED") return { state: "PENDING", check };
  return { state: check.conclusion === "SUCCESS" ? "SUCCESS" : "FAILED", check };
}

function exactHeadApproval(pr) {
  const eligibleAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
  const knownStates = new Set(["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"]);
  const formal = (pr.reviews ?? []).filter((review) => review.source === "FORMAL_GITHUB_REVIEW");
  const malformed = formal.some((review) =>
    !review.author_login || !review.commit_sha || !knownStates.has(review.state) || !review.submitted_at,
  );
  if (malformed) return { state: "UNPROVEN", reason: "MALFORMED_FORMAL_REVIEW" };

  const latestByAuthor = new Map();
  for (const review of formal) {
    const current = latestByAuthor.get(review.author_login);
    const currentTime = current ? Date.parse(current.submitted_at) : -1;
    const candidateTime = Date.parse(review.submitted_at);
    if (!current || candidateTime > currentTime || (candidateTime === currentTime && Number(review.id) > Number(current.id))) {
      latestByAuthor.set(review.author_login, review);
    }
  }
  const latest = [...latestByAuthor.values()];
  if (latest.some((review) => review.commit_sha === pr.head_sha && review.state === "CHANGES_REQUESTED")) {
    return { state: "CHANGES_REQUESTED" };
  }
  const authorApprovals = latest.filter(
    (review) => review.commit_sha === pr.head_sha && review.state === "APPROVED" && review.author_login === pr.author_login,
  );
  if (authorApprovals.length > 0) return { state: "UNPROVEN", reason: "PR_AUTHOR_REVIEW" };
  const exact = latest.filter((review) =>
    review.commit_sha === pr.head_sha &&
    review.state === "APPROVED" &&
    review.author_login !== pr.author_login &&
    eligibleAssociations.has(review.author_association),
  );
  if (exact.length > 0) return { state: "EXACT", reviewer_logins: exact.map((review) => review.author_login) };
  const ineligibleExact = latest.some((review) => review.commit_sha === pr.head_sha && review.state === "APPROVED");
  if (ineligibleExact) return { state: "UNPROVEN", reason: "REVIEWER_IDENTITY_INELIGIBLE" };
  const staleApprovals = latest.filter((review) => review.state === "APPROVED" && review.commit_sha !== pr.head_sha);
  if (staleApprovals.length > 0) return { state: "STALE", reviewed_shas: staleApprovals.map((review) => review.commit_sha) };
  return { state: "MISSING" };
}

export function deriveNextAction(input) {
  const { campaign, master, active_drop: activeDrop, completed_drops: completedDrops = [], pr = null } = input ?? {};

  if (!campaign) {
    if (activeDrop?.status === "ACTIVE") return result(NEXT_ACTION.LEGACY_DROP_ACTIVE, { drop_id: activeDrop.id });
    return result(NEXT_ACTION.NO_CAMPAIGN);
  }

  const validation = validateCampaign(campaign);
  if (validation) return validation;
  if (campaign.status === "DRAFT") return escalation("CAMPAIGN_NOT_APPROVED", `${campaign.id} is DRAFT.`);
  if (campaign.status === "COMPLETE") return result(NEXT_ACTION.CAMPAIGN_COMPLETE, { campaign_id: campaign.id });
  if (!master?.sha || master.authorization_commit_is_ancestor !== true) {
    return escalation("STALE_CAMPAIGN_AUTHORIZATION", "Campaign authorization commit is not verified in current master history.");
  }
  const suppliedEscalations = input.escalations ?? [];
  const declaredEscalations = new Set(campaign.escalation_conditions ?? []);
  const undeclared = suppliedEscalations.filter((code) => !declaredEscalations.has(code));
  if (undeclared.length > 0) {
    return escalation("UNDECLARED_ESCALATION", undeclared.join(", "));
  }
  if (suppliedEscalations.length > 0) {
    return escalation("OWNER_DECISION_REQUIRED", suppliedEscalations.join(", "));
  }

  const completed = new Set(completedDrops);
  const nextDrop = campaign.drops.find((drop) => !completed.has(drop.id));
  if (!nextDrop) return result(NEXT_ACTION.CAMPAIGN_COMPLETE, { campaign_id: campaign.id });

  for (const dependency of nextDrop.depends_on) {
    if (!completed.has(dependency)) {
      return escalation("STALE_CAMPAIGN_STATE", `${nextDrop.id} dependency ${dependency} is not closed.`);
    }
  }

  if (!activeDrop || activeDrop.status === "CLOSED") {
    return result(NEXT_ACTION.DROP_READY, { campaign_id: campaign.id, drop_id: nextDrop.id });
  }
  if (activeDrop.status !== "ACTIVE") {
    return escalation("MALFORMED_ACTIVE_DROP", `Unexpected ACTIVE_DROP status: ${activeDrop.status}.`);
  }
  if (activeDrop.id !== nextDrop.id) {
    return escalation("CONFLICTING_ACTIVE_DROP", `${activeDrop.id} is ACTIVE; campaign expects ${nextDrop.id}.`);
  }
  if (!activeDrop.pr || String(activeDrop.pr).startsWith("(pending")) {
    return result(NEXT_ACTION.WAITING_FOR_PR, { drop_id: nextDrop.id });
  }
  if (!pr) return escalation("GITHUB_STATE_UNAVAILABLE", `Live PR state is required for ${nextDrop.id}.`);
  if (pr.url !== activeDrop.pr) return escalation("PR_POINTER_MISMATCH", `ACTIVE_DROP points to ${activeDrop.pr}, live state is ${pr.url}.`);
  if (pr.base_sha !== activeDrop.baseline) {
    return escalation("BASELINE_MISMATCH", `PR base ${pr.base_sha} does not match Drop baseline ${activeDrop.baseline}.`);
  }
  if (!pr.head_sha) return escalation("MALFORMED_GITHUB_STATE", "PR head SHA is missing.");
  if (pr.state === "MERGED") return result(NEXT_ACTION.READY_FOR_CLOSURE, { drop_id: nextDrop.id, integration_sha: pr.merge_sha });
  if (pr.state !== "OPEN" || pr.is_draft) return escalation("PR_NOT_INTEGRATABLE", `PR state is ${pr.state}.`);

  const check = successfulRequiredCheck(pr, input.required_check ?? "PR Verification");
  if (check.state === "MISSING" || check.state === "PENDING") return result(NEXT_ACTION.WAITING_FOR_CI, { drop_id: nextDrop.id });
  if (check.state === "HEAD_MISMATCH") return escalation("CI_HEAD_MISMATCH", "Required CI is not bound to the current PR head.");
  if (check.state === "FAILED") return result(NEXT_ACTION.FIX_VERIFICATION, { drop_id: nextDrop.id });

  const approval = exactHeadApproval(pr);
  if (approval.state === "MISSING") return result(NEXT_ACTION.WAITING_FOR_REVIEW, { drop_id: nextDrop.id });
  if (approval.state === "STALE") return result(NEXT_ACTION.STALE_APPROVAL, { drop_id: nextDrop.id, reviewed_shas: approval.reviewed_shas });
  if (approval.state === "CHANGES_REQUESTED") return result(NEXT_ACTION.WAITING_FOR_REVIEW, { drop_id: nextDrop.id, review_state: "CHANGES_REQUESTED" });
  if (approval.state === "UNPROVEN") {
    return escalation("REVIEW_INDEPENDENCE_UNPROVEN", approval.reason);
  }
  if (pr.mergeable !== "MERGEABLE" || pr.merge_state !== "CLEAN") {
    return escalation("PR_NOT_CLEAN", `PR mergeability is ${pr.mergeable}/${pr.merge_state}.`);
  }
  return result(NEXT_ACTION.READY_FOR_INTEGRATION, {
    drop_id: nextDrop.id,
    head_sha: pr.head_sha,
    reviewer_logins: approval.reviewer_logins,
  });
}
