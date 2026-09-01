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
  if (user?.type !== "Bot" || user?.login !== expectedLogin || user.login.toLowerCase() === "gavinlohnes") {
    throw new Error("AUTHENTICATED_IDENTITY_NOT_EXPECTED_BUILDER_BOT");
  }
  return user.login;
}

export function replacementBranchName(sourceSha) {
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error("INVALID_SOURCE_SHA");
  return `beyond-builder/factory-autopilot-001-${sourceSha.slice(0, 12)}`;
}

export function replaceCandidateRouting(text, replacementUrl, replacementBranch) {
  if (!/^pr:\s+https:\/\/github\.com\/gavinlohnes\/neo-beyond-lohnes\/pull\/47$/m.test(text)) {
    throw new Error("SOURCE_PR_POINTER_MISMATCH");
  }
  if (!/^branch:\s+codex\/factory-autopilot-001-owner-work-reduction$/m.test(text)) {
    throw new Error("SOURCE_BRANCH_POINTER_MISMATCH");
  }
  return text
    .replace(/^pr:\s+.+$/m, `pr: ${replacementUrl}`)
    .replace(/^branch:\s+.+$/m, `branch: ${replacementBranch}`);
}
