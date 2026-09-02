#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { campaignDigest, deriveNextAction, reconcileActiveDrops } from "./factory-autopilot-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function parseFrontmatterText(text, source) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`MALFORMED_ACTIVE_DROP: ${source} has no frontmatter.`);
  return Object.fromEntries(
    match[1].split(/\r?\n/).filter(Boolean).map((line) => {
      const at = line.indexOf(":");
      if (at < 1) throw new Error(`MALFORMED_ACTIVE_DROP: invalid line ${line}`);
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
}

function parseFrontmatter(path) {
  if (!existsSync(path)) return null;
  return parseFrontmatterText(readFileSync(path, "utf8"), path);
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    const parsed = value && !value.startsWith("--") ? argv[++i] : true;
    if (key === "escalation") flags[key] = [...(flags[key] ?? []), parsed];
    else flags[key] = parsed;
  }
  return flags;
}

function campaignPath(flags) {
  const campaignRoot = resolve(root, "docs/agent/campaigns");
  const validate = (path) => {
    const resolved = resolve(root, path);
    const withinCampaigns = relative(campaignRoot, resolved);
    if (!withinCampaigns || withinCampaigns.startsWith("..") || isAbsolute(withinCampaigns) || !resolved.endsWith(".json")) {
      throw new Error("CAMPAIGN_PATH_INVALID: manifest must be a JSON file under docs/agent/campaigns/.");
    }
    return resolved;
  };
  if (flags.campaign) return validate(flags.campaign);
  let pointerText;
  try { pointerText = git(["show", "origin/master:docs/agent/ACTIVE_CAMPAIGN.json"]); } catch { return null; }
  const parsed = JSON.parse(pointerText);
  if (parsed.schema_version !== 1 || typeof parsed.manifest !== "string") {
    throw new Error("MALFORMED_CAMPAIGN_POINTER: ACTIVE_CAMPAIGN.json requires schema_version 1 and manifest.");
  }
  return validate(parsed.manifest);
}

function repoRelative(path) {
  return path.slice(root.length + 1).replaceAll("\\", "/");
}

function discoverActiveDrop() {
  const local = parseFrontmatter(join(root, "docs/agent/ACTIVE_DROP.md"));
  const found = local?.status === "ACTIVE" ? [local] : [];
  const refs = git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"])
    .split("\n").filter((ref) => ref && ref !== "origin/HEAD");
  for (const ref of refs) {
    try { git(["merge-base", "--is-ancestor", ref, "origin/master"]); continue; } catch { /* unmerged */ }
    let text;
    try { text = git(["show", `${ref}:docs/agent/ACTIVE_DROP.md`]); } catch { continue; }
    const active = parseFrontmatterText(text, `${ref}:docs/agent/ACTIVE_DROP.md`);
    if (active.status === "ACTIVE") found.push(active);
  }
  const reconciled = reconcileActiveDrops(found);
  if (reconciled.error) throw new Error(`${reconciled.error}: ${reconciled.ids.join(", ")}`);
  return reconciled.active ?? local;
}

function parsePrNumber(url) {
  const match = String(url).match(/\/pull\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function githubToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  const filled = execFileSync("git", ["credential", "fill"], {
    cwd: root,
    input: "protocol=https\nhost=github.com\n\n",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return filled.match(/^password=(.+)$/m)?.[1] ?? null;
}

async function api(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "beyond-factory-autopilot" },
  });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}: ${path}`);
  return response.json();
}

async function apiAll(path, token) {
  const all = [];
  for (let page = 1; ; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const batch = await api(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(batch)) throw new Error(`GITHUB_API_SHAPE: expected array from ${path}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function apiAllCheckRuns(path, token) {
  const all = [];
  for (let page = 1; ; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await api(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(response.check_runs)) throw new Error(`GITHUB_API_SHAPE: expected check_runs from ${path}`);
    all.push(...response.check_runs);
    if (response.check_runs.length < 100 || all.length >= response.total_count) return all;
  }
}

async function livePrState(active) {
  if (!active?.pr) return null;
  const number = parsePrNumber(active.pr);
  if (!number) return null;
  const token = githubToken();
  if (!token) throw new Error("GITHUB_AUTH_UNAVAILABLE: set GH_TOKEN or configure git credentials.");
  const repo = "gavinlohnes/neo-beyond-lohnes";
  const pr = await api(`/repos/${repo}/pulls/${number}`, token);
  const [checks, reviews] = await Promise.all([
    apiAllCheckRuns(`/repos/${repo}/commits/${pr.head.sha}/check-runs`, token),
    apiAll(`/repos/${repo}/pulls/${number}/reviews`, token),
  ]);
  const confirmedPr = await api(`/repos/${repo}/pulls/${number}`, token);
  if (confirmedPr.head.sha !== pr.head.sha || confirmedPr.base.sha !== pr.base.sha || confirmedPr.state !== pr.state) {
    throw new Error("GITHUB_STATE_CHANGED: PR base/head/state changed while status was being derived; retry from fresh truth.");
  }
  return {
    url: pr.html_url,
    state: pr.merged ? "MERGED" : pr.state.toUpperCase(),
    is_draft: pr.draft,
    base_sha: pr.base.sha,
    head_sha: pr.head.sha,
    author_login: pr.user?.login,
    merge_sha: pr.merge_commit_sha,
    mergeable: pr.mergeable === true ? "MERGEABLE" : pr.mergeable === false ? "CONFLICTING" : "UNKNOWN",
    merge_state: String(pr.mergeable_state ?? "UNKNOWN").toUpperCase(),
    checks: checks.map((check) => ({
      id: check.id,
      name: check.name,
      status: check.status.toUpperCase(),
      conclusion: String(check.conclusion ?? "").toUpperCase(),
      head_sha: check.head_sha,
      url: check.html_url,
      started_at: check.started_at,
      completed_at: check.completed_at,
    })),
    reviews: reviews.map((review) => ({
      source: "FORMAL_GITHUB_REVIEW",
      id: review.id,
      state: review.state,
      commit_sha: review.commit_id,
      author_login: review.user?.login,
      author_association: review.author_association,
      submitted_at: review.submitted_at,
      body: review.body,
    })),
  };
}

function typedJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function liveCampaignAuthorization(campaign, authorizationCommit) {
  if (campaign?.schema_version !== 2) return null;
  const number = parsePrNumber(campaign.authorization?.pr);
  if (!number) throw new Error("CAMPAIGN_AUTHORIZATION_PR_REQUIRED: schema-v2 authorization requires a GitHub PR URL.");
  const token = githubToken();
  if (!token) throw new Error("GITHUB_AUTH_UNAVAILABLE: campaign authorization requires live GitHub evidence.");
  const repo = "gavinlohnes/neo-beyond-lohnes";
  const [reviews, comments] = await Promise.all([
    apiAll(`/repos/${repo}/pulls/${number}/reviews`, token),
    apiAll(`/repos/${repo}/issues/${number}/comments`, token),
  ]);
  const owner = campaign.authorization.owner_login;
  const approval = reviews
    .filter((review) => review.state === "APPROVED" && review.commit_id === authorizationCommit && review.user?.login === owner && review.author_association === "OWNER")
    .map((review) => ({ review, body: typedJson(review.body) }))
    .find(({ body }) => body?.type === "CAMPAIGN_AUTHORIZATION" && body.revision === campaign.authorization.revision && body.digest === campaign.authorization.digest);
  const lifecycle = comments
    .filter((comment) => comment.user?.login === owner && comment.author_association === "OWNER")
    .map((comment) => typedJson(comment.body))
    .filter((body) => body?.domain === "CAMPAIGN_AUTHORIZATION_EVENT")
    .map((body) => ({ type: body.type, revision: body.revision, digest: body.digest, author_login: owner, created_at: body.created_at, code: body.code }));
  if (!approval) return { source: "LIVE_GITHUB_CAMPAIGN_AUTHORIZATION", state: "MISSING", active_digest: campaignDigest(campaign), lifecycle };
  return {
    source: "LIVE_GITHUB_CAMPAIGN_AUTHORIZATION",
    domain: approval.body.type,
    state: approval.review.state,
    commit_sha: approval.review.commit_id,
    author_login: approval.review.user.login,
    author_association: approval.review.author_association,
    digest: approval.body.digest,
    revision: approval.body.revision,
    active_digest: campaignDigest(campaign),
    lifecycle,
    escalations: lifecycle.filter((event) => event.type === "ESCALATE").map((event) => event.code),
  };
}

function syntheticFixturePath(path) {
  const fixtureRoot = resolve(root, "tests/fixtures/factory-autopilot");
  const resolved = resolve(root, path);
  const within = relative(fixtureRoot, resolved);
  if (!within || within.startsWith("..") || isAbsolute(within) || !resolved.endsWith(".json")) {
    throw new Error("SYNTHETIC_FIXTURE_PATH_INVALID: fixture must be JSON under tests/fixtures/factory-autopilot/.");
  }
  return resolved;
}

function completedDrops(campaign) {
  const closed = new Set();
  const wanted = new Set((campaign?.drops ?? []).map((drop) => drop.id));
  if (wanted.size === 0) return [];
  let commits = [];
  try {
    commits = git(["log", "--format=%H", "origin/master", "--", "docs/agent/ACTIVE_DROP.md"]).split("\n").filter(Boolean);
  } catch { /* no Factory history */ }
  for (const commit of commits) {
    let text;
    try { text = git(["show", `${commit}:docs/agent/ACTIVE_DROP.md`]); } catch { continue; }
    const id = text.match(/^id:\s*(.+)$/m)?.[1]?.trim();
    const status = text.match(/^status:\s*(.+)$/m)?.[1]?.trim();
    if (id && wanted.has(id) && status === "CLOSED") closed.add(id);
  }
  return [...closed];
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags["github-state"] && !flags["diagnostic-synthetic"]) {
    throw new Error("SYNTHETIC_MODE_REQUIRED: --github-state is permitted only with --diagnostic-synthetic.");
  }
  if (flags["diagnostic-synthetic"] && !flags["github-state"]) {
    throw new Error("SYNTHETIC_FIXTURE_REQUIRED: diagnostic synthetic mode requires --github-state.");
  }
  const remote = git(["remote", "get-url", "origin"]);
  if (!/(^|[/:])gavinlohnes\/neo-beyond-lohnes(?:\.git)?$/i.test(remote.replaceAll("\\", "/"))) {
    throw new Error(`WRONG_REPOSITORY: origin is ${remote}`);
  }
  git(["fetch", "-q", "origin", "+refs/heads/*:refs/remotes/origin/*", "--prune"]);
  const masterSha = git(["rev-parse", "origin/master"]);
  const active = discoverActiveDrop();
  const manifestPath = campaignPath(flags);
  const relativeManifest = manifestPath ? repoRelative(manifestPath) : null;
  const campaign = manifestPath
    ? JSON.parse(flags.campaign ? readFileSync(manifestPath, "utf8") : git(["show", `origin/master:${relativeManifest}`]))
    : null;
  let authorizationCommitIsAncestor = false;
  let authorizationCommit = null;
  if (campaign && manifestPath) {
    try {
      const relative = relativeManifest;
      authorizationCommit = git(["log", "-1", "--format=%H", "origin/master", "--", relative]);
      if (!authorizationCommit) throw new Error("manifest is not committed on master");
      const remoteManifest = git(["show", `origin/master:${relative}`]);
      if (JSON.stringify(JSON.parse(remoteManifest)) !== JSON.stringify(campaign)) {
        throw new Error("working manifest differs from origin/master");
      }
      authorizationCommitIsAncestor = true;
    } catch { /* fail closed in resolver */ }
  }
  const pr = flags["github-state"]
    ? JSON.parse(readFileSync(syntheticFixturePath(flags["github-state"]), "utf8"))
    : await livePrState(active);
  const campaignAuthorization = flags["github-state"] ? null : await liveCampaignAuthorization(campaign, authorizationCommit);
  let output = deriveNextAction({
    campaign,
    master: { sha: masterSha, authorization_commit_is_ancestor: authorizationCommitIsAncestor, authorization_commit: authorizationCommit },
    active_drop: active,
    completed_drops: completedDrops(campaign),
    pr,
    required_check: "PR Verification",
    escalations: flags.escalation ?? [],
    campaign_authorization: campaignAuthorization,
  });
  const evidenceSource = flags["diagnostic-synthetic"] ? "SYNTHETIC_FIXTURE" : pr ? "LIVE_GITHUB" : "REPOSITORY_ONLY";
  if (evidenceSource === "SYNTHETIC_FIXTURE" && ["READY_FOR_INTEGRATION", "READY_FOR_CLOSURE"].includes(output.action)) {
    output = { ok: false, action: "ESCALATION_REQUIRED", escalation: { code: "SYNTHETIC_EVIDENCE_NOT_AUTHORIZING", detail: "Synthetic fixtures cannot authorize integration or closure." } };
  }
  console.log(JSON.stringify({
    schema_version: 1,
    generated_at: new Date().toISOString(),
    repository: "gavinlohnes/neo-beyond-lohnes",
    master_sha: masterSha,
    local_head: git(["rev-parse", "HEAD"]),
    local_branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    worktree_clean: git(["status", "--porcelain"]) === "",
    evidence_source: evidenceSource,
    diagnostic_mode: evidenceSource === "SYNTHETIC_FIXTURE",
    campaign: campaign?.id ?? null,
    active_drop: active?.id ?? null,
    ...output,
  }, null, 2));
  if (!output.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ schema_version: 1, ok: false, action: "ESCALATION_REQUIRED", escalation: { code: "FACTORY_STATUS_FAILED", detail: error.message } }, null, 2));
  process.exitCode = 2;
});
