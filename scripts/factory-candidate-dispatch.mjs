#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { campaignDigest, validateCampaignAuthorization } from "./factory-autopilot-core.mjs";
import { candidateIdentity, candidateMarker, dispatchEnvelope, reconcileCandidates } from "./factory-candidate-dispatch-core.mjs";
import { verifyBuilderBot, verifyBuilderInstallation } from "./factory-builder-bootstrap-core.mjs";

const REPO = "gavinlohnes/neo-beyond-lohnes";
const DROP_ID = "AUTOPILOT-CANDIDATE-DISPATCH-002";
const CONTRACT_PATH = `docs/agent/drops/${DROP_ID}.md`;
const MARKER_OPEN = "<!-- BEYOND_FACTORY_CANDIDATE_V1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
}

function parseJson(text, code) {
  try { return JSON.parse(text); } catch { throw new Error(code); }
}

function markerText(marker) {
  return `${MARKER_OPEN}\n${JSON.stringify(marker)}\n-->`;
}

export function markerFromBody(body) {
  const match = String(body ?? "").match(/<!-- BEYOND_FACTORY_CANDIDATE_V1\r?\n([^\r\n]+)\r?\n-->/);
  if (!match) return null;
  const parsed = parseJson(match[1], "MALFORMED_CANDIDATE_MARKER");
  if (parsed.domain !== "BEYOND_FACTORY_CANDIDATE" || parsed.schema_version !== 1) throw new Error("MALFORMED_CANDIDATE_MARKER");
  return parsed;
}

async function api(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "beyond-factory-candidate-dispatch", ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${path}`);
  return response.status === 204 ? null : response.json();
}

async function apiAll(path, token) {
  const all = [];
  for (let page = 1; ; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const batch = await api(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(batch)) throw new Error(`GITHUB_API_SHAPE:${path}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function waitForCandidatePr(number, token, expectedHead) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const pr = await api(`/repos/${REPO}/pulls/${number}`, token);
    if (pr.head.sha === expectedHead) return pr;
    if (attempt < 5) await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error("FINAL_CANDIDATE_HEAD_NOT_OBSERVED");
}

function trustedJson(path) {
  return parseJson(git(["show", `origin/master:${path}`]), `MALFORMED_TRUSTED_JSON:${path}`);
}

async function trustedContext(ownerToken) {
  git(["fetch", "-q", "origin", "master"]);
  const remote = git(["remote", "get-url", "origin"]);
  if (!/(^|[/:])gavinlohnes\/neo-beyond-lohnes(?:\.git)?$/i.test(remote.replaceAll("\\", "/"))) throw new Error("WRONG_REPOSITORY");
  const baseline = git(["rev-parse", "origin/master"]);
  const sourceHead = required("GITHUB_SHA");
  try { git(["merge-base", "--is-ancestor", baseline, sourceHead]); } catch { throw new Error("SOURCE_NOT_DESCENDED_FROM_TRUSTED_MASTER"); }

  const pointer = trustedJson("docs/agent/ACTIVE_CAMPAIGN.json");
  if (pointer.schema_version !== 1 || !/^docs\/agent\/campaigns\/[A-Za-z0-9._-]+\.json$/.test(pointer.manifest ?? "")) throw new Error("MALFORMED_TRUSTED_CAMPAIGN_POINTER");
  const campaign = trustedJson(pointer.manifest);
  const drops = (campaign.drops ?? []).filter((drop) => drop?.id === DROP_ID);
  if (drops.length !== 1) throw new Error("TRUSTED_CAMPAIGN_DROP_NOT_UNIQUE");
  const contract = git(["show", `origin/master:${CONTRACT_PATH}`]);
  if (!/^baseline:\s*AT_ACTIVATION$/m.test(contract)) throw new Error("PROTECTED_CONTRACT_NOT_PREREGISTERED");
  const contractDigest = createHash("sha256").update(contract).digest("hex");
  const authorizationCommit = git(["log", "-1", "--format=%H", "origin/master", "--", pointer.manifest]);
  if (!authorizationCommit) throw new Error("AUTHORIZATION_COMMIT_NOT_IN_TRUSTED_MASTER");

  const prNumber = Number(String(campaign.authorization?.pr ?? "").match(/\/pull\/(\d+)$/)?.[1]);
  if (!prNumber) throw new Error("CAMPAIGN_AUTHORIZATION_PR_REQUIRED");
  const [reviews, comments] = await Promise.all([
    apiAll(`/repos/${REPO}/pulls/${prNumber}/reviews`, ownerToken),
    apiAll(`/repos/${REPO}/issues/${prNumber}/comments`, ownerToken),
  ]);
  const owner = campaign.authorization.owner_login;
  const approval = reviews
    .filter((review) => review.state === "APPROVED" && review.commit_id === authorizationCommit && review.user?.login === owner && review.author_association === "OWNER")
    .map((review) => ({ review, body: (() => { try { return JSON.parse(review.body); } catch { return null; } })() }))
    .find(({ body }) => body?.type === "CAMPAIGN_AUTHORIZATION" && body.revision === campaign.authorization.revision && body.digest === campaign.authorization.digest);
  const lifecycle = comments
    .filter((comment) => comment.user?.login === owner && comment.author_association === "OWNER")
    .map((comment) => { try { return JSON.parse(comment.body); } catch { return null; } })
    .filter((body) => body?.domain === "CAMPAIGN_AUTHORIZATION_EVENT")
    .map((body) => ({ type: body.type, revision: body.revision, digest: body.digest, author_login: owner, created_at: body.created_at, code: body.code }));
  const evidence = approval ? {
    source: "LIVE_GITHUB_CAMPAIGN_AUTHORIZATION", domain: approval.body.type, state: approval.review.state,
    commit_sha: approval.review.commit_id, author_login: approval.review.user.login,
    author_association: approval.review.author_association, digest: approval.body.digest,
    revision: approval.body.revision, active_digest: campaignDigest(campaign), lifecycle,
    escalations: lifecycle.filter((event) => event.type === "ESCALATE").map((event) => event.code),
  } : { source: "LIVE_GITHUB_CAMPAIGN_AUTHORIZATION", state: "MISSING", active_digest: campaignDigest(campaign), lifecycle };
  const authority = validateCampaignAuthorization({
    campaign, evidence, candidate_drop: drops[0],
    master: { sha: baseline, authorization_commit: authorizationCommit, authorization_commit_is_ancestor: true },
  });
  if (authority.state !== "AUTHORIZED") throw new Error(`CAMPAIGN_AUTHORITY_${authority.state}:${authority.reason ?? ""}`);
  return {
    sourceHead, baseline, campaign, drop: drops[0], contract,
    identity: candidateIdentity({
      campaign_id: campaign.id,
      campaign_revision: campaign.authorization.revision,
      campaign_digest: campaign.authorization.digest,
      drop_id: DROP_ID,
      activation_baseline: baseline,
      contract_path: CONTRACT_PATH,
      contract_digest: contractDigest,
    }),
  };
}

async function liveCandidates(token) {
  const pulls = await apiAll(`/repos/${REPO}/pulls?state=open&base=master`, token);
  const candidates = [];
  for (const pr of pulls) {
    let marker;
    try { marker = markerFromBody(pr.body); } catch {
      if (String(pr.body ?? "").includes(MARKER_OPEN)) candidates.push({ pr_number: pr.number });
      continue;
    }
    if (!marker) continue;
    candidates.push({
      ...marker,
      pr_number: pr.number,
      pr_url: pr.html_url,
      branch: pr.head.ref,
      base_sha: pr.base.sha,
      head_sha: pr.head.sha,
      marker_head_sha: marker.head_sha,
      author_login: pr.user?.login,
      author_type: pr.user?.type,
    });
  }
  return candidates;
}

function routedActiveDrop(prUrl, branch) {
  const text = readFileSync("docs/agent/ACTIVE_DROP.md", "utf8");
  if (!new RegExp(`^id:\\s+${DROP_ID}$`, "m").test(text) || !/^pr:\s+\(pending/m.test(text)) throw new Error("SOURCE_ACTIVE_DROP_NOT_PENDING");
  return text.replace(/^pr:\s+.+$/m, `pr: ${prUrl}`).replace(/^branch:\s+.+$/m, `branch: ${branch}`);
}

async function publish() {
  if (required("GITHUB_REPOSITORY") !== REPO) throw new Error("WRONG_REPOSITORY");
  const token = required("GITHUB_TOKEN");
  const context = await trustedContext(token);
  const installation = verifyBuilderInstallation({
    installation: { id: required("ACTUAL_INSTALLATION_ID"), app_id: required("EXPECTED_APP_ID"), app_slug: required("APP_SLUG") },
    expectedAppId: required("EXPECTED_APP_ID"), expectedInstallationId: required("EXPECTED_INSTALLATION_ID"), expectedSlug: required("APP_SLUG"),
  });
  const builderLogin = `${installation.app_slug}[bot]`;
  const candidates = await liveCandidates(token);
  const reconciliation = reconcileCandidates({ expected: context.identity, candidates, builder_login: builderLogin, source_head_sha: context.sourceHead });
  if (!reconciliation.ok) {
    console.log(JSON.stringify(dispatchEnvelope({ reconciliation, identity: context.identity }), null, 2));
    throw new Error(`${reconciliation.state}:${reconciliation.reason}`);
  }
  if (reconciliation.canonical) {
    console.log(JSON.stringify(dispatchEnvelope({ reconciliation, identity: context.identity, candidate: reconciliation.canonical }), null, 2));
    return;
  }

  const branch = `beyond-builder/candidate-${context.identity.candidate_key.slice(0, 10)}-${context.sourceHead.slice(0, 10)}`;
  await api(`/repos/${REPO}/git/refs`, token, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: context.sourceHead }),
  });
  const initialMarker = candidateMarker(context.identity, context.sourceHead, context.sourceHead);
  const replacement = await api(`/repos/${REPO}/pulls`, token, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `${DROP_ID}: deterministic candidate dispatch`, head: branch, base: "master",
      body: `Canonical Builder-App candidate for ${DROP_ID}. No review, approval, CI, or evidence transfers from superseded candidates.\n\n${markerText(initialMarker)}`,
    }),
  });
  const botLogin = verifyBuilderBot(replacement.user, installation.app_slug);
  if (replacement.head.sha !== context.sourceHead || replacement.base.sha !== context.baseline) throw new Error("CREATED_CANDIDATE_IDENTITY_MISMATCH");

  const activeDrop = routedActiveDrop(replacement.html_url, branch);
  const sourceCommit = await api(`/repos/${REPO}/git/commits/${context.sourceHead}`, token);
  const blob = await api(`/repos/${REPO}/git/blobs`, token, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: activeDrop, encoding: "utf-8" }),
  });
  const tree = await api(`/repos/${REPO}/git/trees`, token, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: sourceCommit.tree.sha, tree: [{ path: "docs/agent/ACTIVE_DROP.md", mode: "100644", type: "blob", sha: blob.sha }] }),
  });
  const routingCommit = await api(`/repos/${REPO}/git/commits`, token, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `chore(factory): route active Drop to PR #${replacement.number}`, tree: tree.sha, parents: [context.sourceHead] }),
  });
  await api(`/repos/${REPO}/git/refs/heads/${branch}`, token, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: routingCommit.sha, force: false }),
  });
  const finalMarker = candidateMarker(context.identity, routingCommit.sha, context.sourceHead);
  await api(`/repos/${REPO}/pulls/${replacement.number}`, token, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: `Canonical Builder-App candidate for ${DROP_ID}. No review, approval, CI, or evidence transfers from superseded candidates.\n\n${markerText(finalMarker)}` }),
  });
  const finalPr = await waitForCandidatePr(replacement.number, token, routingCommit.sha);
  if (verifyBuilderBot(finalPr.user, installation.app_slug) !== botLogin || finalPr.head.sha !== routingCommit.sha || finalPr.base.sha !== context.baseline) {
    throw new Error("FINAL_CANDIDATE_IDENTITY_MISMATCH");
  }
  const canonical = { ...finalMarker, pr_number: finalPr.number, pr_url: finalPr.html_url, branch, base_sha: finalPr.base.sha, head_sha: finalPr.head.sha, marker_head_sha: finalMarker.head_sha, author_login: finalPr.user.login, author_type: finalPr.user.type };
  console.log(JSON.stringify(dispatchEnvelope({ reconciliation: { ok: true, state: "REUSABLE_CANDIDATE", canonical }, identity: context.identity, candidate: canonical }), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  publish().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
