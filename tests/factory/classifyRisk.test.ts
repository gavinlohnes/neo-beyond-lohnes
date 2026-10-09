import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const classifier = resolve("scripts/classify-risk.mjs");

// Exercise the real CLI against committed diffs, including exit status. No GitHub access.
function classify(files: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), "beyond-risk-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  const write = (name: string, contents: string) => {
    const path = join(cwd, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };
  try {
    git("init", "-q");
    git("config", "user.email", "risk-test@example.invalid");
    git("config", "user.name", "Risk regression test");
    write("package.json", JSON.stringify({ dependencies: { example: "1.0.0" } }));
    git("add", ".");
    git("commit", "-qm", "baseline");
    const base = git("rev-parse", "HEAD");
    for (const [name, contents] of Object.entries(files)) write(name, contents);
    git("add", ".");
    git("commit", "-qm", "change");
    const result = spawnSync(process.execPath, [classifier, base], { cwd, encoding: "utf8" });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("DEV-FLOW-002 risk guidance", () => {
  it.each([
    "AGENTS.md", "CLAUDE.md", "docs/agent/DEV-FLOW-002.md",
    "docs/agent/BEYOND_ENGINEERING_CONTRACT.md", "docs/agent/drops/VCC-001.md",
    "docs/OPERATOR_INTERFACE_DOCTRINE.md", "docs/UX_DECISIONS.md", "docs/ROADMAP_1.0.md",
    "docs/PRODUCT_DIRECTION.md",
    ".claude/skills/beyond-drop/SKILL.md", ".claude/rules/engine.md",
    ".github/workflows/pr-verify.yml", "scripts/classify-risk.mjs",
    "scripts/check-architecture-boundaries.mjs", "scripts/factory-drop.mjs",
  ])("recognizes authority or safeguard changes in %s as Protected evidence", (path) => {
    const result = classify({ [path]: "authority amendment\n" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GOVERNANCE (1)");
    expect(result.stdout).toContain("PROTECTED triggers present");
    expect(result.stdout).toContain("independent exact-head review");
    expect(result.stdout).toContain("owner merge approval");
    expect(result.stdout).not.toContain("looks Routine");
  });

  it("keeps ordinary docs and checkpoints distinct from governance", () => {
    const result = classify({ "docs/guide.md": "guide", "docs/agent/CURRENT_CHECKPOINT.md": "handoff" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PROCESS_DOCS (2)");
    expect(result.stdout).toContain("No path-detected PROTECTED trigger");
    expect(result.stdout).toContain("Every PR requires owner merge approval");
  });

  it("requires semantic judgment for UI features and hidden protected boundaries", () => {
    const result = classify({ "src/ui/example.tsx": "UI", "tests/ui/example.test.ts": "test" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("FEATURE for owner-approved capabilities");
    expect(result.stdout).toContain("primary information architecture");
    expect(result.stdout).toContain("privacy/security");
    expect(result.stdout).not.toContain("looks Routine");
  });

  it.each(["src/engine/example.ts", "src/domain/example.ts", "src/persistence/db.ts", "src/persistence/backup.ts", "src/persistence/restore.ts", "src/persistence/compat/example.ts"])(
    "preserves protected guidance for %s", (path) => {
      expect(classify({ [path]: "change" }).stdout).toContain("PROTECTED triggers present");
    },
  );

  it("preserves the protected-fixture hard failure", () => {
    const result = classify({ "test-fixtures/protected/example.json": "{}" });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("PROTECTED triggers present");
    expect(result.stderr).toContain("FAIL: test-fixtures/protected/** changed without");
  });

  it("keeps acknowledged fixture changes Protected without weakening byte-integrity tests", () => {
    const result = classify({ "test-fixtures/protected/example.json": "{}", "tests/compat/fixtureIntegrity.test.ts": "acknowledgement" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PROTECTED triggers present");
  });

  it("preserves dependency escalation without treating script-only changes as dependencies", () => {
    const dependency = classify({ "package.json": JSON.stringify({ dependencies: { example: "2.0.0" } }) });
    expect(dependency.stdout).toContain("dependency/devDependency change");
    const scripts = classify({ "package.json": JSON.stringify({ dependencies: { example: "1.0.0" }, scripts: { verify: "check" } }) });
    expect(scripts.stdout).toContain("No path-detected PROTECTED trigger");
    expect(scripts.stdout).not.toContain("dependency/devDependency change");
    expect(classify({ "package-lock.json": "{}" }).stdout).toContain("dependency/devDependency change");
  });
});
