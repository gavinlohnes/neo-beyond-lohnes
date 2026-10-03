#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { candidateIdentity, parseCandidateMarker, protectedContractIdentity, reconcileCandidates } from "./factory-candidate-dispatch-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = "gavinlohnes/neo-beyond-lohnes";
const git = (args, options = {}) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: [options.input ? "pipe" : "ignore", "pipe", "pipe"], ...options }).trim();

function frontmatter(text, source) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`MALFORMED_FRONTMATTER:${source}`);
  return Object.fromEntries(match[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const at = line.indexOf(":");
    if (at < 1) throw new Error(`MALFORMED_FRONTMATTER:${source}`);
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  }));
}

function token() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  const filled = git(["credential", "fill"], { input: "protocol=https\nhost=github.com\n\n" });
  return filled.match(/^password=(.+)$/m)?.[1] ?? null;
}

async function api(path, auth) {
  const response = await fetch(`https://api.github.com${path}`, { headers: {
    Accept: "application/vnd.github+json", Authorization: `Bearer ${auth}`, "User-Agent": "beyond-candidate-dispatch",
  } });
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${path}`);
  return response.json();
}

async function allPulls(auth) {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`, auth);
    result.push(...batch);
    if (batch.length < 100) return result;
  }
}

async function main() {
  const remote = git(["remote", "get-url", "origin"]);
  if (!/(^|[/:])gavinlohnes\/neo-beyond-lohnes(?:\.git)?$/i.test(remote.replaceAll("\\", "/"))) throw new Error("WRONG_REPOSITORY");
  git(["fetch", "-q", "origin", "master"]);
  const master = git(["rev-parse", "origin/master"]);
  const activeText = git(["show", "HEAD:docs/agent/ACTIVE_DROP.md"]);
  const active = frontmatter(activeText, "ACTIVE_DROP.md");
  if (active.status !== "ACTIVE" || !/^[0-9a-f]{40}$/.test(active.baseline) || !active.contract) throw new Error("ACTIVE_DROP_NOT_DISPATCHABLE");

  const protectedContract = git(["show", `origin/master:${active.contract}`]);
  const contract = frontmatter(protectedContract, active.contract);
  if (contract.id !== active.id || contract.baseline !== "AT_ACTIVATION") throw new Error("PROTECTED_CONTRACT_MISMATCH");
  const pointer = JSON.parse(git(["show", "origin/master:docs/agent/ACTIVE_CAMPAIGN.json"]));
  const campaign = JSON.parse(git(["show", `origin/master:${pointer.manifest}`]));
  if (campaign.status !== "APPROVED" || !campaign.drops?.some((drop) => drop.id === active.id)) throw new Error("CAMPAIGN_SCOPE_MISMATCH");

  const expected = candidateIdentity({
    campaign_id: campaign.id,
    campaign_revision: campaign.authorization?.revision,
    campaign_digest: campaign.authorization?.digest,
    drop_id: active.id,
    activation_baseline: active.baseline,
    protected_contract: protectedContractIdentity({ path: active.contract, content: protectedContract }),
  });
  const auth = token();
  if (!auth) throw new Error("GITHUB_AUTH_UNAVAILABLE");
  const pulls = await allPulls(auth);
  const candidates = pulls.map((pr) => {
    const parsed = parseCandidateMarker(pr.body);
    return {
      number: pr.number, url: pr.html_url, state: pr.merged_at ? "MERGED" : pr.state.toUpperCase(),
      branch: pr.head.ref, head_sha: pr.head.sha, base_sha: pr.base.sha, author_login: pr.user?.login,
      body: pr.body, identity: parsed.state === "VALID" ? parsed.identity : undefined,
    };
  });
  const output = reconcileCandidates({ expected_identity: expected, candidates, evidence_source: "LIVE_GITHUB_AND_PROTECTED_MASTER" });
  console.log(JSON.stringify({
    ...output, generated_at: new Date().toISOString(), repository: repo, protected_master_sha: master,
    evidence_digest: createHash("sha256").update(JSON.stringify({ expected, candidates: candidates.filter((item) => item.identity) })).digest("hex"),
  }, null, 2));
  if (!output.ok) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ schema_version: 1, ok: false, action: "ESCALATION_REQUIRED", external_session_required: true,
    escalation: { code: "CANDIDATE_DISPATCH_FAILED", detail: error.message } }, null, 2));
  process.exitCode = 2;
});
