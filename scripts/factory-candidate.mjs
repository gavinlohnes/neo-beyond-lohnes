#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { reconcileCandidates } from "./factory-candidate-core.mjs";

const git = (args, input) => execFileSync("git", args, { encoding: "utf8", input, stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] }).trim();
const root = new URL("..", import.meta.url);
const manifest = JSON.parse(git(["show", "origin/master:docs/agent/campaigns/FACTORY-PHASE-2.json"]));
const active = readFileSync(new URL("docs/agent/ACTIVE_DROP.md", root), "utf8");
const field = (name) => active.match(new RegExp(`^${name}:\\s+(.+)$`, "m"))?.[1]?.trim();
const dropId = field("id");
const baseline = field("baseline");
const contractPath = field("contract");
if (field("status") !== "ACTIVE" || !dropId || !baseline || !contractPath) throw new Error("ACTIVE_DROP_REQUIRED");
const drop = manifest.drops.find((item) => item.id === dropId);
if (!drop) throw new Error("ACTIVE_DROP_NOT_IN_CAMPAIGN");
const contract = git(["show", `HEAD:${contractPath}`]);
const target = { campaign_id: manifest.id, campaign_revision: manifest.authorization.revision, campaign_digest: manifest.authorization.digest, drop_id: dropId, baseline, contract: { path: contractPath, digest: createHash("sha256").update(contract).digest("hex") } };

const fixtureAt = process.argv.indexOf("--fixture");
let candidates = [];
let evidence_source = "LIVE_GITHUB";
if (fixtureAt >= 0) {
  const path = process.argv[fixtureAt + 1];
  if (!path?.startsWith("tests/fixtures/factory-candidate/")) throw new Error("SYNTHETIC_FIXTURE_PATH_REQUIRED");
  candidates = JSON.parse(readFileSync(new URL(path, root), "utf8"));
  evidence_source = "SYNTHETIC_FIXTURE";
} else {
  const filled = git(["credential", "fill"], "protocol=https\nhost=github.com\n\n");
  const token = filled.match(/^password=(.+)$/m)?.[1];
  if (!token) throw new Error("GITHUB_AUTH_UNAVAILABLE");
  const api = async (path) => {
    const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "beyond-factory-candidate" } });
    if (!response.ok) throw new Error(`GITHUB_API_${response.status}`);
    return response.json();
  };
  const pulls = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/repos/gavinlohnes/neo-beyond-lohnes/pulls?state=all&sort=created&direction=desc&per_page=100&page=${page}`);
    pulls.push(...batch);
    if (batch.length < 100) break;
  }
  candidates = pulls.filter((pr) => String(pr.body ?? "").includes("BEYOND_FACTORY_CANDIDATE")).map((pr) => ({
    pr_url: pr.html_url, state: pr.merged_at ? "MERGED" : pr.state.toUpperCase(), head_sha: pr.head.sha,
    base_sha: pr.base.sha, branch: pr.head.ref, author_login: pr.user?.login, author_type: pr.user?.type,
    body: pr.body, stage: pr.body?.includes("BEYOND_FACTORY_STAGE READY_FOR_REVIEW") ? "READY_FOR_REVIEW" : "BUILDING",
  }));
}
console.log(JSON.stringify({ evidence_source, ...reconcileCandidates({ target, candidates }) }, null, 2));
