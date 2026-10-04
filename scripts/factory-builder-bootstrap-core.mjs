export function verifyBuilderInstallation({ installation, expectedAppId, expectedInstallationId, expectedSlug }) {
  const errors = [];
  if (String(installation?.id) !== String(expectedInstallationId)) errors.push("INSTALLATION_ID_MISMATCH");
  if (String(installation?.app_id) !== String(expectedAppId)) errors.push("APP_ID_MISMATCH");
  if (installation?.app_slug !== expectedSlug) errors.push("APP_SLUG_MISMATCH");
  if (errors.length) throw new Error(errors.join(","));
  return { app_slug: installation.app_slug, installation_id: installation.id };
}

export function verifyBuilderBot(user, expectedSlug) {
  const expectedLogin = `${expectedSlug}[bot]`;
  if (user?.type !== "Bot" || user?.login !== expectedLogin || user.login.toLowerCase() === "gavinlohnes") throw new Error("AUTHENTICATED_IDENTITY_NOT_EXPECTED_BUILDER_BOT");
  return user.login;
}

export function candidateBranchName(dropId, sourceSha) {
  if (!/^[A-Z0-9-]+$/.test(dropId ?? "")) throw new Error("INVALID_DROP_ID");
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error("INVALID_SOURCE_SHA");
  return `beyond-builder/${dropId.toLowerCase()}-${sourceSha.slice(0, 12)}`;
}

export const replacementBranchName = (sourceSha) => candidateBranchName("FACTORY-AUTOPILOT-001", sourceSha);

export function routeCandidate(text, { dropId, sourceBranch, candidateUrl, candidateBranch }) {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`^id:\\s+${escape(dropId)}$`, "m").test(text)) throw new Error("DROP_ID_MISMATCH");
  if (!new RegExp(`^branch:\\s+${escape(sourceBranch)}$`, "m").test(text)) throw new Error("SOURCE_BRANCH_POINTER_MISMATCH");
  if (!/^pr:\s+\(pending[^\r\n]*\)$/m.test(text)) throw new Error("SOURCE_PR_POINTER_MISMATCH");
  return text.replace(/^pr:\s+.+$/m, `pr: ${candidateUrl}`).replace(/^branch:\s+.+$/m, `branch: ${candidateBranch}`);
}

export function replaceCandidateRouting(text, replacementUrl, replacementBranch) {
  return routeCandidate(text, { dropId: "FACTORY-AUTOPILOT-001", sourceBranch: "codex/factory-autopilot-001-owner-work-reduction", candidateUrl: replacementUrl, candidateBranch: replacementBranch });
}
