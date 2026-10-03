#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { candidateBranchName, routeCandidate, verifyBuilderBot, verifyBuilderInstallation } from "./factory-builder-bootstrap-core.mjs";
import { candidateIdentity, encodeCandidateMarker, parseCandidateMarker, protectedContractIdentity } from "./factory-candidate-dispatch-core.mjs";

const required = ["GITHUB_TOKEN", "GITHUB_REPOSITORY", "GITHUB_SHA", "GITHUB_REF_NAME", "EXPECTED_APP_ID", "EXPECTED_INSTALLATION_ID", "ACTUAL_INSTALLATION_ID", "APP_SLUG"];
for (const name of required) if (!process.env[name]) throw new Error(`MISSING_${name}`);
if (process.env.GITHUB_REPOSITORY !== "gavinlohnes/neo-beyond-lohnes") throw new Error("WRONG_REPOSITORY");
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const api = async (path, options = {}) => {
  const response = await fetch(`https://api.github.com${path}`, { ...options, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "beyond-builder-bootstrap", ...(options.headers ?? {}) } });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${path}`);
  return response.status === 204 ? null : response.json();
};
const git = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const frontmatter = (text) => Object.fromEntries(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1].split(/\r?\n/).filter(Boolean).map((line) => {
  const at = line.indexOf(":"); return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
}) ?? []);

const installation = verifyBuilderInstallation({
  installation: { id: process.env.ACTUAL_INSTALLATION_ID, app_id: process.env.EXPECTED_APP_ID, app_slug: process.env.APP_SLUG },
  expectedAppId: process.env.EXPECTED_APP_ID, expectedInstallationId: process.env.EXPECTED_INSTALLATION_ID, expectedSlug: process.env.APP_SLUG,
});
git(["fetch", "-q", "origin", "master"]);
const activeText = readFileSync("docs/agent/ACTIVE_DROP.md", "utf8");
const active = frontmatter(activeText);
if (active.status !== "ACTIVE" || active.branch !== process.env.GITHUB_REF_NAME || active.baseline !== git(["merge-base", process.env.GITHUB_SHA, "origin/master"])) throw new Error("SOURCE_DROP_STATE_MISMATCH");
const contractText = git(["show", `origin/master:${active.contract}`]);
if (git(["show", `${active.baseline}:${active.contract}`]) !== contractText) throw new Error("ACTIVATION_CONTRACT_NOT_PROTECTED");
const contract = frontmatter(contractText);
if (contract.id !== active.id || contract.baseline !== "AT_ACTIVATION") throw new Error("PROTECTED_CONTRACT_MISMATCH");
const pointer = JSON.parse(git(["show", "origin/master:docs/agent/ACTIVE_CAMPAIGN.json"]));
const campaign = JSON.parse(git(["show", `origin/master:${pointer.manifest}`]));
if (campaign.status !== "APPROVED" || !campaign.drops?.some((drop) => drop.id === active.id)) throw new Error("CAMPAIGN_SCOPE_MISMATCH");
const expected = candidateIdentity({ campaign_id: campaign.id, campaign_revision: campaign.authorization.revision,
  campaign_digest: campaign.authorization.digest, drop_id: active.id, activation_baseline: active.baseline,
  protected_contract: protectedContractIdentity({ path: active.contract, content: contractText }) });

const openPulls = await api(`/repos/${repo}/pulls?state=open&per_page=100`);
const matching = openPulls.filter((pull) => {
  const marker = parseCandidateMarker(pull.body);
  return marker.state === "VALID" && JSON.stringify(marker.identity) === JSON.stringify(expected);
});
if (matching.length > 1) throw new Error("DUPLICATE_CANDIDATES");
let candidate = matching[0];
let branch = candidate?.head.ref ?? candidateBranchName(active.id, process.env.GITHUB_SHA);
let replacingHead = false;
if (candidate) {
  verifyBuilderBot(candidate.user, installation.app_slug);
  const headCommit = await api(`/repos/${repo}/git/commits/${candidate.head.sha}`);
  if (headCommit.parents?.[0]?.sha === process.env.GITHUB_SHA) {
  console.log(JSON.stringify({ ok: true, reused: true, authenticated_builder: `${installation.app_slug}[bot]`, candidate_pr: candidate.html_url, candidate_head: candidate.head.sha, candidate_identity: expected }));
  process.exit(0);
  }
  replacingHead = true;
} else {
  let ref;
  try { ref = await api(`/repos/${repo}/git/ref/heads/${branch}`); } catch (error) {
    if (!String(error.message).startsWith("GITHUB_API_404")) throw error;
    ref = await api(`/repos/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: process.env.GITHUB_SHA }), headers: { "Content-Type": "application/json" } });
  }
  if (ref.object.sha !== process.env.GITHUB_SHA) throw new Error("CANDIDATE_BRANCH_COLLISION");
  candidate = await api(`/repos/${repo}/pulls`, { method: "POST", body: JSON.stringify({
    title: `${active.id}: Candidate Dispatch`, head: branch, base: "master",
    body: `Canonical Builder-App candidate for protected Drop contract \`${active.contract}\`.\n\n${encodeCandidateMarker(expected)}\n\nNo prior-head review or CI evidence carries to this candidate.`,
  }), headers: { "Content-Type": "application/json" } });
  verifyBuilderBot(candidate.user, installation.app_slug);
  if (candidate.head.sha !== process.env.GITHUB_SHA) throw new Error("CANDIDATE_HEAD_MISMATCH");
}

const routed = routeCandidate(activeText, { dropId: active.id, sourceBranch: active.branch, candidateUrl: candidate.html_url, candidateBranch: branch });
const sourceCommit = await api(`/repos/${repo}/git/commits/${process.env.GITHUB_SHA}`);
const blob = await api(`/repos/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: routed, encoding: "utf-8" }), headers: { "Content-Type": "application/json" } });
const tree = await api(`/repos/${repo}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: sourceCommit.tree.sha, tree: [{ path: "docs/agent/ACTIVE_DROP.md", mode: "100644", type: "blob", sha: blob.sha }] }), headers: { "Content-Type": "application/json" } });
const commit = await api(`/repos/${repo}/git/commits`, { method: "POST", body: JSON.stringify({ message: `chore(factory): route active Drop to PR #${candidate.number}`, tree: tree.sha, parents: [process.env.GITHUB_SHA] }), headers: { "Content-Type": "application/json" } });
await api(`/repos/${repo}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: replacingHead }), headers: { "Content-Type": "application/json" } });
console.log(JSON.stringify({ ok: true, authenticated_builder: `${installation.app_slug}[bot]`, candidate_pr: candidate.html_url, candidate_head: commit.sha, candidate_identity: expected }));
