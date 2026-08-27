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

  it("a second Drop can launch once the first is closed", () => {
    writeContract(fixture, "TEST-001", validContractText({ id: "TEST-001", baseline: fixture.headSha }));
    writeContract(fixture, "TEST-002", validContractText({ id: "TEST-002", baseline: fixture.headSha }));
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);
    commitActiveDrop(fixture, "activate TEST-001");
    const closeResult = runFactoryDrop(["close", "TEST-001", "--integration-sha", fixture.headSha], fixture);
    expect(closeResult.status).toBe(0);
    commitActiveDrop(fixture, "close TEST-001");

    const result = runFactoryDrop(
      ["init", "TEST-002", "--baseline", fixture.headSha, "--branch", "test-002-branch"],
      fixture,
    );
    expect(result.status).toBe(0);
  });
});

describe("closure preserves historical Drop authority", () => {
  it("closing retires ACTIVE_DROP without touching the Drop Contract file", () => {
    const contractText = validContractText({ id: "TEST-001", baseline: fixture.headSha });
    writeContract(fixture, "TEST-001", contractText);
    runFactoryDrop(["init", "TEST-001", "--baseline", fixture.headSha, "--branch", "test-001-branch"], fixture);

    const result = runFactoryDrop(["close", "TEST-001", "--integration-sha", fixture.headSha], fixture);
    expect(result.status).toBe(0);

    const contractAfter = readFileSync(join(fixture.workDir, "docs/agent/drops/TEST-001.md"), "utf8");
    expect(contractAfter).toBe(contractText); // byte-identical — never rewritten

    const activeDropAfter = readFileSync(join(fixture.workDir, "docs/agent/ACTIVE_DROP.md"), "utf8");
    expect(activeDropAfter).toContain("status: CLOSED");
    expect(activeDropAfter).toContain(`integration_sha: ${fixture.headSha}`);
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
