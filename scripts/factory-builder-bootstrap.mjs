#!/usr/bin/env node
import { replacementBranchName, verifyBuilderBot, verifyBuilderInstallation } from "./factory-builder-bootstrap-core.mjs";

const required = ["GITHUB_TOKEN", "GITHUB_REPOSITORY", "GITHUB_SHA", "EXPECTED_APP_ID", "EXPECTED_INSTALLATION_ID", "APP_SLUG"];
for (const name of required) if (!process.env[name]) throw new Error(`MISSING_${name}`);
if (process.env.GITHUB_REPOSITORY !== "gavinlohnes/neo-beyond-lohnes") throw new Error("WRONG_REPOSITORY");

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const api = async (path, options = {}) => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "beyond-builder-bootstrap", ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${path}`);
  return response.status === 204 ? null : response.json();
};

const [installation, sourcePr] = await Promise.all([
  api("/installation"),
  api(`/repos/${repo}/pulls/47`),
]);
const identity = verifyBuilderInstallation({
  installation,
  expectedAppId: process.env.EXPECTED_APP_ID,
  expectedInstallationId: process.env.EXPECTED_INSTALLATION_ID,
  expectedSlug: process.env.APP_SLUG,
});
if (sourcePr.state !== "open" || sourcePr.head.sha !== process.env.GITHUB_SHA || sourcePr.user.login !== "gavinlohnes") {
  throw new Error("SOURCE_PR_STATE_MISMATCH");
}

const branch = replacementBranchName(process.env.GITHUB_SHA);
await api(`/repos/${repo}/git/refs`, {
  method: "POST",
  body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: process.env.GITHUB_SHA }),
  headers: { "Content-Type": "application/json" },
});
const replacement = await api(`/repos/${repo}/pulls`, {
  method: "POST",
  body: JSON.stringify({
    title: sourcePr.title,
    head: branch,
    base: "master",
    body: `${sourcePr.body ?? ""}\n\nSupersedes #47 solely to establish a mechanically distinct Builder App PR author. Candidate ancestry and Factory scope are unchanged. No prior review approval carries forward.`,
  }),
  headers: { "Content-Type": "application/json" },
});
const botLogin = verifyBuilderBot(replacement.user, identity.app_slug);
if (replacement.head.sha !== process.env.GITHUB_SHA) {
  throw new Error("REPLACEMENT_IDENTITY_OR_HEAD_MISMATCH");
}

console.log(JSON.stringify({ ok: true, authenticated_builder: botLogin, app_slug: identity.app_slug, installation_id: String(identity.installation_id), replacement_pr: replacement.html_url, replacement_head: replacement.head.sha }));
