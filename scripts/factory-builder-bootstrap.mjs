#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { replacePrPointer, replacementBranchName, verifyBuilderBot, verifyBuilderInstallation } from "./factory-builder-bootstrap-core.mjs";

const required = ["GITHUB_TOKEN", "GITHUB_REPOSITORY", "GITHUB_SHA", "EXPECTED_APP_ID", "EXPECTED_INSTALLATION_ID", "ACTUAL_INSTALLATION_ID", "APP_SLUG"];
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

const sourcePr = await api(`/repos/${repo}/pulls/47`);
const identity = verifyBuilderInstallation({
  installation: { id: process.env.ACTUAL_INSTALLATION_ID, app_id: process.env.EXPECTED_APP_ID, app_slug: process.env.APP_SLUG },
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

const activeDrop = replacePrPointer(readFileSync("docs/agent/ACTIVE_DROP.md", "utf8"), replacement.html_url);
const sourceCommit = await api(`/repos/${repo}/git/commits/${process.env.GITHUB_SHA}`);
const blob = await api(`/repos/${repo}/git/blobs`, {
  method: "POST",
  body: JSON.stringify({ content: activeDrop, encoding: "utf-8" }),
  headers: { "Content-Type": "application/json" },
});
const tree = await api(`/repos/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: sourceCommit.tree.sha, tree: [{ path: "docs/agent/ACTIVE_DROP.md", mode: "100644", type: "blob", sha: blob.sha }] }),
  headers: { "Content-Type": "application/json" },
});
const routingCommit = await api(`/repos/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({ message: `chore(factory): route active Drop to PR #${replacement.number}`, tree: tree.sha, parents: [process.env.GITHUB_SHA] }),
  headers: { "Content-Type": "application/json" },
});
await api(`/repos/${repo}/git/refs/heads/${branch}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: routingCommit.sha, force: false }),
  headers: { "Content-Type": "application/json" },
});

console.log(JSON.stringify({ ok: true, authenticated_builder: botLogin, app_slug: identity.app_slug, installation_id: String(identity.installation_id), replacement_pr: replacement.html_url, replacement_head: routingCommit.sha }));
