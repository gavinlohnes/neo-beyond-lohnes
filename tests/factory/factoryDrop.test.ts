import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
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

let fixture: Fixture;

beforeEach(() => {
  fixture = makeFixtureRepo();
});

afterEach(() => {
  rmSync(fixture.tmp, { recursive: true, force: true });
});

describe("launch/bootstrap safety", () => {
  it("validates a correctly-authorized Drop at the exact fetched baseline", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
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
