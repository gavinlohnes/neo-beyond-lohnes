import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * FACTORY-002 (Development Factory V1): automated proof of scripts/
 * factory-drop.mjs's recovery and failure paths — not just the happy
 * path (per this Drop's own acceptance criteria B-F). Every test drives
 * the real CLI as a subprocess against a hermetic, fully-local fixture
 * repo (a real `git init --bare` "origin" + a real working clone, no
 * network access required) rather than importing internals, so this
 * proves exactly what a fresh agent/session would actually run.
 */

const FACTORY_DROP_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts/factory-drop.mjs");

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

interface Fixture {
  tmp: string;
  workDir: string;
  bareDir: string;
  headSha: string;
  expectedRepoSlug: string;
}

function preregisterCampaignDrop(fixture: Fixture, id: string, riskTier = "ARCHITECTURAL"): void {
  mkdirSync(join(fixture.workDir, "docs/agent/campaigns"), { recursive: true });
  writeFileSync(
    join(fixture.workDir, "docs/agent/ACTIVE_CAMPAIGN.json"),
    `${JSON.stringify({ schema_version: 1, manifest: "docs/agent/campaigns/TEST.json" }, null, 2)}\n`,
  );
  writeFileSync(
    join(fixture.workDir, "docs/agent/campaigns/TEST.json"),
    `${JSON.stringify({ schema_version: 2, id: "TEST", drops: [{ id, risk_tier: riskTier }] }, null, 2)}\n`,
  );
  writeFileSync(
    join(fixture.workDir, "docs/agent/drops", `${id}.md`),
    validContractText({ id, baseline: "AT_ACTIVATION", riskTier }),
  );
  git(fixture.workDir, ["add", "docs/agent/ACTIVE_CAMPAIGN.json", "docs/agent/campaigns/TEST.json", `docs/agent/drops/${id}.md`]);
  git(fixture.workDir, ["commit", "-m", `preregister ${id}`]);
  git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
  fixture.headSha = git(fixture.workDir, ["rev-parse", "HEAD"]);
}

function makeFixtureRepo(): Fixture {
  const tmp = mkdtempSync(join(tmpdir(), "factory-drop-"));
  const workDir = join(tmp, "work");
  const bareDir = join(tmp, "acme", "widget.git");
  mkdirSync(workDir, { recursive: true });
  mkdirSync(dirname(bareDir), { recursive: true });
  git(tmp, ["init", "--bare", "-q", "-b", "master", bareDir]);
  git(workDir, ["init", "-q", "-b", "master"]);
  git(workDir, ["config", "user.email", "factory-drop-test@example.com"]);
  git(workDir, ["config", "user.name", "Factory Drop Test"]);
  mkdirSync(join(workDir, "docs/agent/drops"), { recursive: true });
  writeFileSync(join(workDir, "README.md"), "fixture repo\n");
  git(workDir, ["add", "."]);
  git(workDir, ["commit", "-m", "initial"]);
  git(workDir, ["remote", "add", "origin", bareDir]);
  git(workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
  git(workDir, ["fetch", "-q", "origin", "master"]);
  const headSha = git(workDir, ["rev-parse", "HEAD"]);
  return { tmp, workDir, bareDir, headSha, expectedRepoSlug: "acme/widget" };
}

function validContractText(opts: { id: string; baseline: string; riskTier?: string }): string {
  const riskTier = opts.riskTier ?? "ARCHITECTURAL";
  return `---
id: ${opts.id}
baseline: ${opts.baseline}
risk_tier: ${riskTier}
---

# ${opts.id} // Test Drop

## Mission
Test fixture Drop contract.

## Approved baseline
\`${opts.baseline}\`

## Risk classification
${riskTier}

## Authorized scope
- test

## Explicit exclusions
- everything else

## Relevant authority / references
- none

## Required invariants
- none

## Acceptance criteria
- passes

## Required verification
- none

## Builder expectations
- test

## Reviewer expectations
- test

## Integrator expectations
- test

## Stop / escalation conditions
- never
`;
}

// Committed immediately, matching real usage: a Drop Contract (and any
// ACTIVE_DROP.md change) is committed before validate/init/close runs
// against it — these commands report on git-tracked repository state,
// not on a caller's own uncommitted scratch edits. Not committing here
// would make every fixture's own setup trip the dirty-tree refusal.
// Simulates the real lifecycle: this Drop's own commits (contract,
// ACTIVE_DROP.md activation, etc.) land on a real topic branch, pushed
// to origin, then a real --no-ff merge into master (mirroring this
// repo's own ship procedure) produces the actual integration commit —
// so `close --integration-sha <merge-sha>` is exercised against a
// genuine merge, not a bare fast-forward.
function beginDropBranch(fixture: Fixture, branch: string): void {
  git(fixture.workDir, ["checkout", "-q", "-b", branch]);
}

function mergeDropBranchToOrigin(fixture: Fixture, branch: string): string {
  git(fixture.workDir, ["push", "-q", "origin", `HEAD:refs/heads/${branch}`]);
  git(fixture.workDir, ["checkout", "-q", "master"]);
  git(fixture.workDir, ["merge", "--no-ff", "-q", "-m", `Merge branch '${branch}'`, branch]);
  git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
  return git(fixture.workDir, ["rev-parse", "HEAD"]);
}

/**
 * FACTORY-003: simulates this repository's own confirmed master-history
 * discontinuity (`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s
 * "Historical-branch disposition rule") inside the hermetic fixture — a
 * fresh orphan commit carrying master's exact current tree (so file
 * content, including any already-merged Drop contract, survives), but no
 * parent linkage to anything merged before it. Force-pushed to the
 * fixture's bare origin, exactly like the real repo's own reset. Returns
 * the new root commit's SHA (the fixture's new baseline).
 */
function simulateHistoryRewrite(fixture: Fixture): string {
  // Also drop the stale mid-flight ACTIVE_DROP.md snapshot from the new tree — a real rewrite
  // carries master's *current* ACTIVE_DROP.md (whatever Drop closed most recently), never some
  // older Drop's own frozen "still ACTIVE" copy. Without this, the fixture's local checkout would
  // trip the unrelated same-checkout conflict check before ever reaching the cross-branch logic
  // this test suite exists to exercise.
  rmSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), { force: true });
  git(fixture.workDir, ["add", "-A"]);
  const tree = git(fixture.workDir, ["write-tree"]);
  const newRoot = git(fixture.workDir, ["commit-tree", tree, "-m", "rewritten root (simulated history reset)"]);
  git(fixture.workDir, ["checkout", "-q", "-B", "master", newRoot]);
  git(fixture.workDir, ["push", "-q", "--force", "origin", "HEAD:refs/heads/master"]);
  fixture.headSha = newRoot;
  return newRoot;
}

interface MockGitHubResponse {
  status: number;
  body: unknown;
  /** Optional artificial delay before responding — used only to open a deterministic wall-clock
   *  window in the race-condition regression, never needed for the other cases. */
  delayMs?: number;
}

/**
 * Hermetic mock GitHub API — no real network access, and deliberately run as a genuinely
 * separate sibling child process rather than an in-process `http.createServer` living inside
 * this vitest worker. This sandbox's network policy does not let the real
 * `scripts/factory-drop.mjs` subprocess (itself spawned via `execFileSync`, a child of this
 * worker) reach a server bound directly inside the worker process, even over plain loopback —
 * confirmed by isolated reproduction. A server run as its own sibling child process is reachable
 * from another sibling child without issue, so that's the shape used here.
 *
 * Responds `response` for any request path starting with `pathPrefix`; 404s otherwise.
 */
function startMockGitHubApi(pathPrefix: string, response: MockGitHubResponse): Promise<{ url: string; close: () => void }> {
  const serverScript = `
    const { createServer } = require("node:http");
    const prefix = process.env.MOCK_PATH_PREFIX;
    const response = JSON.parse(process.env.MOCK_RESPONSE_JSON);
    const delayMs = Number(process.env.MOCK_DELAY_MS || "0");
    const server = createServer((req, res) => {
      if (!req.url || !req.url.startsWith(prefix)) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "not found" }));
        return;
      }
      setTimeout(() => {
        res.writeHead(response.status, { "content-type": "application/json" });
        res.end(JSON.stringify(response.body));
      }, delayMs);
    });
    server.listen(0, "127.0.0.1", () => { console.log("PORT=" + server.address().port); });
  `;
  return new Promise((resolveServer, reject) => {
    const child: ChildProcess = spawn(process.execPath, ["-e", serverScript], {
      stdio: ["ignore", "pipe", "ignore"],
      env: {
        ...process.env,
        MOCK_PATH_PREFIX: pathPrefix,
        MOCK_RESPONSE_JSON: JSON.stringify(response),
        MOCK_DELAY_MS: String(response.delayMs ?? 0),
      },
    });
    let buf = "";
    const timer = setTimeout(() => reject(new Error("mock GitHub API server did not report a port in time")), 5000);
    child.stdout?.on("data", (d: Buffer) => {
      buf += d.toString();
      const m = buf.match(/PORT=(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolveServer({ url: `http://127.0.0.1:${m[1]}`, close: () => child.kill() });
      }
    });
    child.on("error", reject);
  });
}

/** An address nothing is listening on — proves a code path never even attempts a network call
 *  (if it had, the request would hang/refuse rather than fail via the mocked NO_PR_NUMBER/no-match
 *  short-circuit the test actually asserts on). */
const UNREACHABLE_GITHUB_API_BASE = "http://127.0.0.1:1";

/** Sets up a Drop whose branch was genuinely merged (its contract lands on master, matching
 *  content) and then orphaned by a simulated history rewrite — the exact shape of the 11 known
 *  real false positives. Records a real-looking PR URL in the branch's own frozen ACTIVE_DROP.md
 *  before merging, exactly as a real Builder session does after opening a PR. */
/**
 * Merges a Drop into master the ordinary way (no history rewrite) — safe to call more than once
 * in sequence in the same fixture, since each merge keeps the previous Drop's branch a normal
 * ancestor of master (auto-skipped by the cross-branch check), rather than leaving it orphaned
 * and therefore a live candidate that could block a *later* Drop's own setup-phase `init`.
 */
function mergeDropNormally(fixture: Fixture, id: string, prNumber: number): { branchTip: string; branch: string; mergeSha: string } {
  const branch = `${id.toLowerCase()}-branch`;
  writeContract(fixture, id, validContractText({ id, baseline: fixture.headSha }));
  beginDropBranch(fixture, branch);
  runFactoryDrop(["init", id, "--baseline", fixture.headSha, "--branch", branch], fixture);
  const withPr = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8").replace(
    "pr: (pending — set by Builder immediately after opening the PR)",
    `pr: https://github.com/${fixture.expectedRepoSlug}/pull/${prNumber}`,
  );
  writeFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), withPr);
  commitActiveDrop(fixture, `record PR #${prNumber}`);
  const branchTip = git(fixture.workDir, ["rev-parse", "HEAD"]);
  const mergeSha = mergeDropBranchToOrigin(fixture, branch);
  fixture.headSha = mergeSha; // keep in sync — a second sequential mergeDropNormally/close call
  // in the same fixture must see this merge as its own new baseline, not a stale earlier one.
  return { branchTip, branch: `origin/${branch}`, mergeSha };
}

/** Closes a normally-merged Drop on master (flips its LOCAL ACTIVE_DROP.md to CLOSED and pushes)
 *  — needed before a second Drop's own setup-phase `init` can run in the same fixture, since that
 *  reads the same-checkout ACTIVE_DROP.md and would otherwise see the prior Drop still ACTIVE.
 *  The prior Drop's own branch keeps its frozen ACTIVE snapshot regardless — closing only ever
 *  touches master's copy, exactly matching real closure semantics. */
function closeDropNormally(fixture: Fixture, id: string, mergeSha: string): void {
  runFactoryDrop(["close", id, "--integration-sha", mergeSha], fixture);
  commitActiveDrop(fixture, `close ${id}`);
  git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
  fixture.headSha = git(fixture.workDir, ["rev-parse", "HEAD"]); // the close commit is the new baseline
}

/** Sets up a Drop whose branch was genuinely merged (its contract lands on master, matching
 *  content) and then immediately orphaned by a simulated history rewrite — the exact shape of
 *  the 11 known real false positives. For more than one simultaneously-orphaned candidate in a
 *  single fixture, merge each normally first (mergeDropNormally) and call
 *  simulateHistoryRewrite once at the end instead — see the [case 5b] regression. */
function setupOrphanedMergedDrop(fixture: Fixture, id: string, prNumber: number): { branchTip: string; branch: string; baseline: string } {
  const { branchTip, branch } = mergeDropNormally(fixture, id, prNumber);
  const baseline = simulateHistoryRewrite(fixture);
  return { branchTip, branch, baseline };
}

function writeContract(fixture: Fixture, id: string, text: string): void {
  writeFileSync(join(fixture.workDir, "docs/agent/drops", `${id}.md`), text);
  git(fixture.workDir, ["add", `docs/agent/drops/${id}.md`]);
  git(fixture.workDir, ["commit", "-m", `add ${id} contract`]);
}

function commitActiveDrop(fixture: Fixture, message: string): void {
  git(fixture.workDir, ["add", "docs/agent/ACTIVE_DROP.md"]);
  git(fixture.workDir, ["commit", "-m", message]);
}

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runFactoryDrop(args: string[], fixture: Fixture, extraEnv: Record<string, string> = {}): RunResult {
  try {
    const stdout = execFileSync(process.execPath, [FACTORY_DROP_SCRIPT, ...args], {
      cwd: fixture.workDir,
      encoding: "utf8",
      env: {
        ...process.env,
        FACTORY_DROP_ROOT: fixture.workDir,
        FACTORY_DROP_EXPECTED_REPO: fixture.expectedRepoSlug,
        ...extraEnv,
      },
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

/** Async twin of runFactoryDrop, needed only so a test can race a concurrent git push against
 *  this subprocess's own execution window — every other test uses the simpler sync form. */
function runFactoryDropAsync(args: string[], fixture: Fixture, extraEnv: Record<string, string> = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [FACTORY_DROP_SCRIPT, ...args], {
      cwd: fixture.workDir,
      env: {
        ...process.env,
        FACTORY_DROP_ROOT: fixture.workDir,
        FACTORY_DROP_EXPECTED_REPO: fixture.expectedRepoSlug,
        ...extraEnv,
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code) => resolve({ status: code ?? 1, stdout, stderr }));
  });
}

/**
 * Pushes one new commit onto `branch` from a *separate* clone of the fixture's bare origin —
 * deliberately not `fixture.workDir`, so that checkout's own cached `refs/remotes/origin/<branch>`
 * stays exactly as stale as it was before this call. Used to prove a corroboration decision reads
 * live remote state at decision time rather than trusting an earlier bulk fetch.
 */
function pushRaceCommit(fixture: Fixture, branch: string): void {
  const scratch = mkdtempSync(join(tmpdir(), "factory-drop-race-"));
  git(scratch, ["clone", "-q", "--branch", branch, fixture.bareDir, "."]);
  git(scratch, ["config", "user.email", "race-commit@example.com"]);
  git(scratch, ["config", "user.name", "Race Commit"]);
  writeFileSync(join(scratch, "race-commit.txt"), "post-merge commit, must never be cleared\n");
  git(scratch, ["add", "race-commit.txt"]);
  git(scratch, ["commit", "-q", "-m", "post-merge commit pushed during corroboration"]);
  git(scratch, ["push", "-q", "origin", `HEAD:refs/heads/${branch}`]);
  rmSync(scratch, { recursive: true, force: true });
}

let fixture: Fixture;

beforeEach(() => {
  fixture = makeFixtureRepo();
});

afterEach(() => {
  rmSync(fixture.tmp, { recursive: true, force: true });
});

describe("launch/bootstrap safety", () => {
  it.each(["../EVIL", "CAMPAIGN/EVIL", "campaign-001", "CAMPAIGN--001", "CAMPAIGN_001"])(
    "rejects malformed or traversal-capable Drop ID %s before path resolution",
    (id) => {
      const result = runFactoryDrop(["validate", id, "--baseline", fixture.headSha], fixture);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("INVALID_DROP_ID");
    },
  );

  it("validates CRLF repository authority at the exact fetched baseline", () => {
    const contract = validContractText({ id: "TEST-001", baseline: fixture.headSha }).replace(/\n/g, "\r\n");
    writeContract(fixture, "TEST-001", contract);
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("VALID");
  });

  it("refuses launch from the wrong repository", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture, {
      FACTORY_DROP_EXPECTED_REPO: "someone-else/other-repo",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WRONG_REPOSITORY");
  });

  it("refuses launch from the wrong baseline, naming both SHAs", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    const wrongSha = "0".repeat(40);
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", wrongSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WRONG_BASELINE");
    expect(result.stderr).toContain(fixture.headSha);
    expect(result.stderr).toContain(wrongSha);
  });

  it("refuses launch when the contract's own declared baseline disagrees with --baseline", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: "f".repeat(40) }));
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONTRACT_BASELINE_MISMATCH");
  });
});

describe("protected campaign contract preregistration", () => {
  it("binds the build baseline at activation while reading authorization from protected master", () => {
    preregisterCampaignDrop(fixture, "CAMPAIGN-001");
    beginDropBranch(fixture, "builder/campaign-001");
    const result = runFactoryDrop(
      ["init", "CAMPAIGN-001", "--baseline", fixture.headSha, "--branch", "builder/campaign-001"],
      fixture,
    );
    expect(result.status).toBe(0);
    const active = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(active).toContain(`baseline: ${fixture.headSha}`);
    expect(active).toContain("contract: docs/agent/drops/CAMPAIGN-001.md");
  });

  it("rejects a Builder commit that changes the protected contract content or baseline", () => {
    preregisterCampaignDrop(fixture, "CAMPAIGN-001");
    beginDropBranch(fixture, "builder/campaign-001");
    writeFileSync(
      join(fixture.workDir, "docs/agent/drops/CAMPAIGN-001.md"),
      validContractText({ id: "CAMPAIGN-001", baseline: fixture.headSha, riskTier: "ARCHITECTURAL" }),
    );
    git(fixture.workDir, ["add", "docs/agent/drops/CAMPAIGN-001.md"]);
    git(fixture.workDir, ["commit", "-m", "attempt to redefine authorization"]);
    const result = runFactoryDrop(["validate", "CAMPAIGN-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("BUILDER_CONTRACT_MUTATION");
  });

  it("rejects a campaign Drop whose contract exists only in Builder-controlled HEAD", () => {
    mkdirSync(join(fixture.workDir, "docs/agent/campaigns"), { recursive: true });
    writeFileSync(join(fixture.workDir, "docs/agent/ACTIVE_CAMPAIGN.json"), '{"schema_version":1,"manifest":"docs/agent/campaigns/TEST.json"}\n');
    writeFileSync(join(fixture.workDir, "docs/agent/campaigns/TEST.json"), '{"schema_version":2,"id":"TEST","drops":[{"id":"CAMPAIGN-001","risk_tier":"ARCHITECTURAL"}]}\n');
    git(fixture.workDir, ["add", "docs/agent/ACTIVE_CAMPAIGN.json", "docs/agent/campaigns/TEST.json"]);
    git(fixture.workDir, ["commit", "-m", "register campaign without contract"]);
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
    fixture.headSha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    beginDropBranch(fixture, "builder/campaign-001");
    writeContract(fixture, "CAMPAIGN-001", validContractText({ id: "CAMPAIGN-001", baseline: "AT_ACTIVATION" }));
    const result = runFactoryDrop(["validate", "CAMPAIGN-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TRUSTED_CONTRACT_REQUIRED");
  });

  it("ignores Builder-controlled ACTIVE_DROP routing as contract authority", () => {
    preregisterCampaignDrop(fixture, "CAMPAIGN-001");
    beginDropBranch(fixture, "builder/campaign-001");
    mkdirSync(join(fixture.workDir, "docs/agent"), { recursive: true });
    writeFileSync(
      join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"),
      `---\nid: CAMPAIGN-001\nstatus: CLOSED\nbaseline: ${"f".repeat(40)}\ncontract: docs/agent/drops/EVIL.md\n---\n`,
    );
    git(fixture.workDir, ["add", "docs/agent/ACTIVE_DROP.md"]);
    git(fixture.workDir, ["commit", "-m", "tamper with routing state"]);
    const result = runFactoryDrop(["validate", "CAMPAIGN-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("VALID");
  });
});

describe("unsafe local state is never destroyed or silently modified", () => {
  it("refuses launch over a dirty working tree by default", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeFileSync(join(fixture.workDir, "someone-elses-work.txt"), "uncommitted work in progress\n");
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("UNSAFE_LOCAL_STATE");
    // Never touched — the script only ever reads git state and writes ACTIVE_DROP.md.
    expect(readFileSync(join(fixture.workDir, "someone-elses-work.txt"), "utf8")).toBe(
      "uncommitted work in progress\n",
    );
  });

  it("--allow-dirty explicitly overrides the dirty-tree refusal without touching the dirty file", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeFileSync(join(fixture.workDir, "someone-elses-work.txt"), "still here\n");
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha, "--allow-dirty"], fixture);
    expect(result.status).toBe(0);
    expect(readFileSync(join(fixture.workDir, "someone-elses-work.txt"), "utf8")).toBe("still here\n");
  });
});

describe("malformed/missing Drop contract fails safely", () => {
  it("refuses a nonexistent contract", () => {
    const result = runFactoryDrop(["validate", "NO-SUCH-DROP", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("MALFORMED_CONTRACT");
    expect(result.stderr).toContain("CONTRACT_NOT_FOUND");
  });

  it("refuses a contract missing a required section", () => {
    writeFileSync(
      join(fixture.workDir, "docs/agent/drops/TEST-001.md"),
      `---\nid: TEST-001\nbaseline: ${fixture.headSha}\nrisk_tier: ROUTINE\n---\n\n# Incomplete\n\n## Mission\nMissing everything else.\n`,
    );
    git(fixture.workDir, ["add", "docs/agent/drops/TEST-001.md"]);
    git(fixture.workDir, ["commit", "-m", "add incomplete contract"]);
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("MISSING_SECTION");
  });

  it("refuses a contract with an invalid risk tier", () => {
    writeContract(
      fixture,
      "TEST-001",
      validContractText({ id: "TEST-001", baseline: fixture.headSha, riskTier: "SUPER-DUPER-RISK" }),
    );
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INVALID_RISK_TIER");
  });

  it("refuses a contract whose declared id doesn't match its filename", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "WRONG-ID", baseline: fixture.headSha }));
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONTRACT_ID_MISMATCH");
  });
});

describe("active-Drop semantics — at most one active Drop", () => {
  it("init launches a Drop and records it as ACTIVE_DROP", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    const result = runFactoryDrop(
      ["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"],
      fixture,
    );
    expect(result.status).toBe(0);
    const activeDropText = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropText).toContain("id: TEST-001");
    expect(activeDropText).toContain("status: ACTIVE");
    expect(activeDropText).toContain(`baseline: ${fixture.headSha}`);
  });

  it("refuses to launch a second Drop while one is already ACTIVE", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");

    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"],
      fixture,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
  });

  it("re-running init/validate for the SAME already-active Drop is idempotent, not a conflict", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(0);
  });

  it("re-running init for the already-active Drop preserves recorded pr/reviewer/integrator routing facts", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");

    // Simulate routing facts recorded after the initial activation (a PR
    // number becoming known, a reviewer/integrator being assigned) —
    // exactly what a same-id re-init must never silently erase.
    const beforeReinit = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8").replace(
      "pr: (pending — set by Builder immediately after opening the PR)",
      "pr: https://github.com/acme/widget/pull/7",
    );
    writeFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), beforeReinit);
    commitActiveDrop(fixture, "record PR #7");

    const result = runFactoryDrop(
      ["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"],
      fixture,
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("re-initialized");

    const activeDropAfter = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropAfter).toContain("pr: https://github.com/acme/widget/pull/7"); // preserved, not reset
  });

  it("a second Drop can launch once the first is closed", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const mergeSha = mergeDropBranchToOrigin(fixture, "test-001-branch");

    const closeResult = runFactoryDrop(["close", "TEST-001", "--integration-sha", mergeSha], fixture);
    expect(closeResult.status).toBe(0);
    commitActiveDrop(fixture, "close TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);

    // TEST-002 is a genuinely new Drop launched after TEST-001's own
    // merge — its baseline is master's current state, not the original
    // fixture baseline (which TEST-001's own merge has since moved past).
    const newBaseline = git(fixture.workDir, ["rev-parse", "HEAD"]);
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: newBaseline }));
    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", newBaseline, "--branch", "test-002-branch"],
      fixture,
    );
    expect(result.status).toBe(0);
  });
});

describe("activation and closure evidence cannot be fabricated or misapplied", () => {
  // Regression coverage for independent-review findings: a Drop's own
  // ACTIVE_DROP activation commit must never land directly on
  // `origin/master` ahead of that Drop's own merge — if it did, the
  // Drop's declared baseline (fixed at authorization time) would
  // immediately stop matching a freshly-fetched origin/master, and every
  // subsequent validate/init/status call for that same Drop would
  // legitimately fail with WRONG_BASELINE. This proves that failure mode
  // is real (confirming why SKILL.md §9 requires activation to be part
  // of the Builder's own branch/PR instead), not merely documented.
  it("pushing ACTIVE_DROP activation directly to origin/master breaks the Drop's own baseline check", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");

    // The rejected pattern: push this Drop's own activation commits
    // straight to the shared origin/master, as if a "steady-state"
    // process had landed them there ahead of the Builder's branch.
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);

    const result = runFactoryDrop(["validate", "TEST-001", "--baseline", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WRONG_BASELINE");
  });

  // Second half of the same known-limitation boundary: proves the
  // documented tradeoff is real and intentional, not silently glossed
  // over — a second, unrelated Drop launched from master's own current
  // state DOES succeed while a first Drop's own activation still lives
  // only inside its own unmerged branch (never pushed to origin/master).
  it("a second Drop IS blocked while a first Drop's activation still only lives on its own unmerged, pushed branch", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/test-001-branch"]); // PR pushed, not merged
    git(fixture.workDir, ["checkout", "-q", "master"]); // back to master, which never saw TEST-001's activation

    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"],
      fixture,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
    expect(result.stderr).toContain("test-001-branch");
  });

  it("an old, already-merged branch's stale ACTIVE snapshot never blocks an unrelated later Drop", () => {
    // TEST-001 merges and is properly closed on master, but its own topic
    // branch is left lying around undeleted (its frozen snapshot still
    // says status: ACTIVE, since close only ever updates master). A
    // second, unrelated Drop must not be blocked by that stale snapshot.
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const mergeSha = mergeDropBranchToOrigin(fixture, "test-001-branch"); // merges + pushes master; branch ref stays on origin

    runFactoryDrop(["close", "TEST-001", "--integration-sha", mergeSha], fixture);
    commitActiveDrop(fixture, "close TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
    const newBaseline = git(fixture.workDir, ["rev-parse", "HEAD"]);

    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: newBaseline }));
    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", newBaseline, "--branch", "test-002-branch"],
      fixture,
    );
    expect(result.status).toBe(0);
  });
});

// Every test in this block spawns at least one real subprocess (the script under test) plus,
// for several, a second subprocess mock GitHub server — measured at 8-13s per case on a Windows
// review worktree (process-spawn overhead, not network latency). Vitest's 5000ms default would
// flake there; 20s leaves comfortable margin cross-platform.
describe("FACTORY-003: historical-merge fallback for rewrite-orphaned branches", { timeout: 20_000 }, () => {
  it("[case 1] a normal ancestor-connected historical branch is skipped without any GitHub call", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const mergeSha = mergeDropBranchToOrigin(fixture, "test-001-branch"); // ordinary merge, no rewrite — stays an ancestor
    runFactoryDrop(["close", "TEST-001", "--integration-sha", mergeSha], fixture);
    commitActiveDrop(fixture, "close TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/master"]);
    const newBaseline = git(fixture.workDir, ["rev-parse", "HEAD"]);

    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: newBaseline }));
    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", newBaseline, "--branch", "test-002-branch"],
      fixture,
      { FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE }, // proves the ancestor fast path never dials out
    );
    expect(result.status).toBe(0);
  });

  it("[case 2] a genuinely unmerged ACTIVE branch is still a conflict, with no GitHub call attempted", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/test-001-branch"]); // PR pushed, never merged
    git(fixture.workDir, ["checkout", "-q", "master"]);

    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"],
      fixture,
      { FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE, GH_TOKEN: "irrelevant-token" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
    // TEST-001's contract never reached master (never merged), so the local pre-filter alone
    // decides this — no GitHub call is even attempted, matching today's shipped behavior exactly.
    expect(result.stderr).not.toContain("historical merge");
  });

  it("[case 3] rewrite-orphaned + contract match + merged PR at the exact head SHA -> safely skipped", async () => {
    const { branchTip, baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    const mock = await startMockGitHubApi("/repos/acme/widget/pulls/7", { status: 200, body: { merged: true, head: { sha: branchTip } } });
    try {
      writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
      const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
        GH_TOKEN: "fake-test-token",
        FACTORY_DROP_GITHUB_API_BASE: mock.url,
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("TEST-002");
    } finally {
      mock.close();
    }
  });

  it("[case 4] rewrite-orphaned + contract match + PR not merged -> conflict", async () => {
    const { baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    const mock = await startMockGitHubApi("/repos/acme/widget/pulls/7", { status: 200, body: { merged: false, head: { sha: "0".repeat(40) } } });
    try {
      writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
      const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
        GH_TOKEN: "fake-test-token",
        FACTORY_DROP_GITHUB_API_BASE: mock.url,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
      expect(result.stderr).toContain("TEST-001");
      expect(result.stderr).toContain("historical merge");
    } finally {
      mock.close();
    }
  });

  it("[case 5] rewrite-orphaned + contract match + merged PR but a DIFFERENT head SHA -> conflict (the mandatory-invariant regression)", async () => {
    // Models a branch merged once, then given a new commit afterward: the PR still reads
    // "merged", but its recorded head SHA no longer equals the branch's current tip.
    const { baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    // deliberately not this branch's real tip
    const mock = await startMockGitHubApi("/repos/acme/widget/pulls/7", { status: 200, body: { merged: true, head: { sha: "f".repeat(40) } } });
    try {
      writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
      const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
        GH_TOKEN: "fake-test-token",
        FACTORY_DROP_GITHUB_API_BASE: mock.url,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
      expect(result.stderr).toContain("TEST-001");
    } finally {
      mock.close();
    }
  });

  it("[case 5b] a post-merge commit pushed DURING corroboration must still be a conflict (TOCTOU regression)", async () => {
    // Two candidates in one run: TEST-DECOY (branch name sorts first, so it's processed first)
    // has a deliberately delayed mocked GitHub response, buying wall-clock time. While DECOY's
    // corroboration is still waiting on that delay, a new commit is pushed onto TEST-RACE's own
    // branch from a separate clone — exactly the window the confirmed review finding named: the
    // enumeration loop's one bulk fetch happens once at the very start, so a branch processed
    // later can receive a real new commit before its own corroboration decision runs. RACE's
    // mocked PR reports its *original* (pre-race) head SHA, so only a fresh, per-branch fetch at
    // decision time (not the stale bulk-fetch snapshot) can correctly still see it as a conflict.
    const decoy = mergeDropNormally(fixture, "TEST-DECOY", 20);
    closeDropNormally(fixture, "TEST-DECOY", decoy.mergeSha); // clears master's own copy only —
    // DECOY's branch keeps its frozen ACTIVE snapshot, so it's still a real candidate below
    const race = mergeDropNormally(fixture, "TEST-RACE", 21);
    const baseline = simulateHistoryRewrite(fixture); // orphans BOTH branches in a single rewrite
    const raceBranchName = race.branch.replace(/^origin\//, "");

    const serverScript = `
      const { createServer } = require("node:http");
      const server = createServer((req, res) => {
        const url = req.url || "";
        if (url.startsWith("/repos/acme/widget/pulls/20")) {
          setTimeout(() => {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ merged: true, head: { sha: process.env.DECOY_TIP } }));
          }, 3000);
          return;
        }
        if (url.startsWith("/repos/acme/widget/pulls/21")) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ merged: true, head: { sha: process.env.RACE_ORIGINAL_TIP } }));
          return;
        }
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ message: "not found" }));
      });
      server.listen(0, "127.0.0.1", () => { console.log("PORT=" + server.address().port); });
    `;
    const mockChild = spawn(process.execPath, ["-e", serverScript], {
      stdio: ["ignore", "pipe", "ignore"],
      env: { ...process.env, DECOY_TIP: decoy.branchTip, RACE_ORIGINAL_TIP: race.branchTip },
    });
    const mockUrl = await new Promise<string>((resolve, reject) => {
      let buf = "";
      const timer = setTimeout(() => reject(new Error("mock server did not report a port in time")), 5000);
      mockChild.stdout?.on("data", (d: Buffer) => {
        buf += d.toString();
        const m = buf.match(/PORT=(\d+)/);
        if (m) {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${m[1]}`);
        }
      });
    });

    try {
      writeContract(fixture, "TEST-003", validContractText({ id: "TEST-003", baseline: baseline }));
      const runPromise = runFactoryDropAsync(
        ["init", "TEST-003", "--baseline", baseline, "--branch", "test-003-branch"],
        fixture,
        { GH_TOKEN: "fake-test-token", FACTORY_DROP_GITHUB_API_BASE: mockUrl },
      );
      // Well before DECOY's mocked 3000ms delay elapses, but comfortably after the subprocess's
      // own bulk fetch + reaching DECOY's corroboration attempt should have completed.
      await new Promise((r) => setTimeout(r, 800));
      pushRaceCommit(fixture, raceBranchName);

      const result = await runPromise;
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
      expect(result.stderr).toContain("TEST-RACE");
    } finally {
      mockChild.kill();
    }
  });

  it("[case 5c] a post-merge commit pushed DURING the GitHub API wait (same candidate) must still be a conflict (TOCTOU regression, second window)", async () => {
    // A second, narrower version of the same race, named exactly by the reviewer's confirmed
    // finding against [case 5b]'s fix: that fix re-fetches the branch fresh right before the
    // GitHub call, but a push landing *during* the network wait (fetch already done, API still
    // in flight) would still be invisible to a comparison against that pre-wait tip. There is
    // only one candidate here — no decoy needed — because the window under test is this
    // candidate's own API round-trip, not the earlier bulk-fetch-to-per-branch-turn gap [case 5b]
    // covers. The mocked PR response reports the branch's *original* (pre-push) head SHA; only
    // resolving the tip *after* the API response comes back (not before it was sent) can still
    // correctly see the pushed commit and report a conflict.
    const { branchTip, branch } = setupOrphanedMergedDrop(fixture, "TEST-RACE", 30);
    const branchName = branch.replace(/^origin\//, "");
    const baseline = fixture.headSha;
    const mock = await startMockGitHubApi("/repos/acme/widget/pulls/30", {
      status: 200,
      body: { merged: true, head: { sha: branchTip } }, // the pre-push tip — stale by the time this arrives
      delayMs: 2000,
    });
    try {
      writeContract(fixture, "TEST-003", validContractText({ id: "TEST-003", baseline }));
      const runPromise = runFactoryDropAsync(
        ["init", "TEST-003", "--baseline", baseline, "--branch", "test-003-branch"],
        fixture,
        { GH_TOKEN: "fake-test-token", FACTORY_DROP_GITHUB_API_BASE: mock.url },
      );
      // Well before the mocked 2000ms delay elapses, but comfortably after the subprocess should
      // have already sent its GitHub request for this, its only, candidate.
      await new Promise((r) => setTimeout(r, 400));
      pushRaceCommit(fixture, branchName);

      const result = await runPromise;
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
      expect(result.stderr).toContain("TEST-RACE");
    } finally {
      mock.close();
    }
  });

  it("[case 6] matching contract but no token available -> conflict, no network attempted", () => {
    const { baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
    const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
      GH_TOKEN: "", // explicitly clear — the fixture's own process.env may otherwise inherit one
      GITHUB_TOKEN: "",
      FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
    expect(result.stderr).toContain("historical merge");
  });

  it("[case 7] matching contract but the GitHub API call fails -> conflict, never a hard crash", () => {
    const { baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
    const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
      GH_TOKEN: "fake-test-token",
      FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE, // nothing listening -> connection refused
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
    expect(result.stderr).toContain("historical merge");
  });

  it("[case 8] a branch with no parseable PR reference yet -> conflict, no network attempted", () => {
    // Mirrors real branches before a PR exists: `init` writes the literal pending placeholder,
    // not a URL — never merged, so no history rewrite is even simulated here.
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const branchTip = git(fixture.workDir, ["rev-parse", "HEAD"]);
    mergeDropBranchToOrigin(fixture, "test-001-branch");
    // Force a rewrite even though the branch's own ACTIVE_DROP.md still carries the placeholder
    // pr: text (never updated) — proves contractBlobsMatch alone can't reach the network step.
    const baseline = simulateHistoryRewrite(fixture);
    void branchTip;

    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline }));
    const result = runFactoryDrop(["init", "TEST-002", "--baseline", baseline, "--branch", "test-002-branch"], fixture, {
      GH_TOKEN: "fake-test-token",
      FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
    expect(result.stderr).toContain("historical merge");
  });

  it("[case 9] contract absent from master entirely -> conflict without any GitHub override", () => {
    // TEST-001 is pushed but never merged at all — its contract never reaches master, so the
    // local pre-filter alone, correctly, never even considers a historical-merge explanation.
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    git(fixture.workDir, ["push", "-q", "origin", "HEAD:refs/heads/test-001-branch"]);
    git(fixture.workDir, ["checkout", "-q", "master"]);

    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"],
      fixture,
      { GH_TOKEN: "fake-test-token", FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).not.toContain("historical merge");
  });

  it("[case 9b] contract present on master under the same id but with DIFFERENT content -> conflict, no GitHub override", () => {
    const { baseline } = setupOrphanedMergedDrop(fixture, "TEST-001", 7);
    // Simulate the (otherwise-never-happens, contracts are documented as never rewritten)
    // defensive case: master's copy of the contract has since diverged from the branch's own.
    const mutated = validContractText({ id: "TEST-001", baseline: fixture.headSha, riskTier: "HIGH-RISK" });
    writeFileSync(join(fixture.workDir, "docs/agent/drops/TEST-001.md"), mutated);
    git(fixture.workDir, ["add", "docs/agent/drops/TEST-001.md"]);
    git(fixture.workDir, ["commit", "-q", "-m", "diverge master's copy of TEST-001's contract"]);
    git(fixture.workDir, ["push", "-q", "--force", "origin", "HEAD:refs/heads/master"]);
    const newBaseline = git(fixture.workDir, ["rev-parse", "HEAD"]);

    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: newBaseline }));
    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", newBaseline, "--branch", "test-002-branch"],
      fixture,
      { GH_TOKEN: "fake-test-token", FACTORY_DROP_GITHUB_API_BASE: UNREACHABLE_GITHUB_API_BASE },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).not.toContain("historical merge");
  });

  it("[case 10] existing second-active-Drop protection remains intact (regression)", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");

    const result = runFactoryDrop(["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CONFLICTING_ACTIVE_DROP");
    expect(result.stderr).toContain("TEST-001");
  });
});

describe("closure preserves historical Drop authority", () => {
  it("closing retires ACTIVE_DROP without touching the Drop Contract file", () => {
    const contractText = validContractText({ id: "TEST-001", baseline: fixture.headSha });
    writeContract(fixture, "TEST-001", contractText);
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    const mergeSha = mergeDropBranchToOrigin(fixture, "test-001-branch");

    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", mergeSha], fixture);
    expect(result.status).toBe(0);

    const contractAfter = readFileSync(join(fixture.workDir, "docs/agent/drops/TEST-001.md"), "utf8");
    expect(contractAfter).toBe(contractText); // byte-identical — never rewritten

    const activeDropAfter = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropAfter).toContain("status: CLOSED");
    expect(activeDropAfter).toContain(`integration_sha: ${mergeSha}`);
  });

  it("refuses to close using the Drop's own pre-implementation baseline as if it were the integration commit", () => {
    // The exact false-positive an earlier version of this script allowed:
    // fixture.headSha is real and trivially reachable from origin/master
    // (it predates and is an ancestor of everything), but it is this
    // Drop's own baseline, not evidence of anything having been merged.
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    mergeDropBranchToOrigin(fixture, "test-001-branch");

    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INVALID_INTEGRATION_SHA");

    const activeDropAfter = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropAfter).toContain("status: ACTIVE"); // never closed on a non-integration SHA
  });

  it("refuses to close when the Drop's recorded branch can no longer be fetched from origin", () => {
    // A real, meaningful edge case (not merely hypothetical): this
    // repo's own ship procedure deletes the topic branch once merged.
    // If the remote branch is gone by the time closure runs, `close`
    // must fail closed rather than fall back to a weaker check (e.g.
    // "reachable from origin/master", which every pre-existing commit
    // trivially satisfies and is not proof of this Drop's integration).
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    beginDropBranch(fixture, "test-001-branch");
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const mergeSha = mergeDropBranchToOrigin(fixture, "test-001-branch");

    git(fixture.workDir, ["push", "-q", "origin", "--delete", "test-001-branch"]);

    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", mergeSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INVALID_INTEGRATION_SHA");
    expect(result.stderr).toContain("test-001-branch");
  });

  it("refuses to close with an integration SHA that doesn't resolve to any known commit", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);

    const fabricatedSha = "1".repeat(40);
    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", fabricatedSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INVALID_INTEGRATION_SHA");

    const activeDropAfter = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropAfter).toContain("status: ACTIVE"); // never closed on a fabricated SHA
  });

  it("refuses to close with a real commit that isn't reachable from origin/master", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);

    // A real commit that exists locally but was never merged/pushed to
    // origin/master — e.g. an abandoned branch, or a PR that never
    // actually landed.
    git(fixture.workDir, ["checkout", "-q", "-b", "unmerged-side-branch"]);
    writeFileSync(join(fixture.workDir, "unmerged.txt"), "never merged\n");
    git(fixture.workDir, ["add", "unmerged.txt"]);
    git(fixture.workDir, ["commit", "-q", "-m", "unmerged work"]);
    const unmergedSha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    git(fixture.workDir, ["checkout", "-q", "master"]);

    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", unmergedSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("INVALID_INTEGRATION_SHA");
  });

  it("refuses to close a Drop that isn't the currently-active one", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);

    const result = runFactoryDrop(["close", "TEST-999", "--integration-sha", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ID_MISMATCH");
  });

  it("refuses to close when nothing is active", () => {
    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", fixture.headSha], fixture);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NOTHING_TO_CLOSE");
  });
});

describe("fresh-agent recovery — `status` alone is enough to recover authorized state", () => {
  it("reports the active Drop's id, baseline, branch, and contract path, plus live git facts", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);

    const result = runFactoryDrop(["status"], fixture);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("TEST-001");
    expect(result.stdout).toContain(fixture.headSha);
    expect(result.stdout).toContain("docs/agent/drops/TEST-001.md");
    expect(result.stdout).toContain("Live HEAD:");
  });

  it("reports no active Drop cleanly when none has ever been launched", () => {
    const result = runFactoryDrop(["status"], fixture);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("none recorded");
  });
});
