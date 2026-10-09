#!/usr/bin/env node
// Factory Drop 01B — deterministic changed-path/change-type risk classifier.
//
// Paths are EVIDENCE for classification, not a substitute for semantic
// judgment (see docs/agent/DEV-FLOW-002.md).
// This script reports which risk buckets a diff touches and a SUGGESTED
// minimum DEV-FLOW-002 lane — it does not, by itself, fail the build for Engine/
// domain/dependency changes, since those may be legitimate, already-
// escalated work; only the protected-fixture check below is a hard gate,
// because an unacknowledged fixture-byte change is a strong, unambiguous
// signal of an accident, not a judgment call.
//
// Usage: node scripts/classify-risk.mjs [baseRef]   (default: origin/master)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const baseRef = process.argv[2] || "origin/master";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

let changedFiles;
try {
  changedFiles = git(["diff", "--name-only", `${baseRef}...HEAD`])
    .split("\n")
    .filter(Boolean);
} catch (e) {
  console.error(`Could not diff against ${baseRef}: ${e.message}`);
  process.exit(2);
}

if (changedFiles.length === 0) {
  console.log(`No changed files vs ${baseRef}.`);
  process.exit(0);
}

const buckets = {
  ENGINE: [],
  DOMAIN: [],
  PERSISTENCE_SCHEMA: [],
  PERSISTENCE_BACKUP: [],
  PROTECTED_FIXTURES: [],
  DEPENDENCIES: [],
  UI: [],
  GOVERNANCE: [],
  PROCESS_DOCS: [],
  OTHER: [],
};

// Authority-bearing Markdown is Protected evidence, not ordinary documentation.
// Include procedural skills/rules and enforcement so changing the classifier itself
// cannot silently receive Routine guidance. Checkpoint updates alone are ordinary docs.
const governanceFiles = new Set([
  "AGENTS.md", "CLAUDE.md", "docs/OPERATOR_INTERFACE_DOCTRINE.md",
  "docs/UX_DECISIONS.md", "docs/ROADMAP_1.0.md", "docs/PRODUCT_DIRECTION.md", "scripts/classify-risk.mjs",
  "scripts/check-architecture-boundaries.mjs",
]);
function isGovernance(f) {
  return governanceFiles.has(f) ||
    (f.startsWith("docs/agent/") && f !== "docs/agent/CURRENT_CHECKPOINT.md") ||
    f.startsWith(".claude/") || f.startsWith(".github/workflows/") ||
    f.startsWith("scripts/factory-");
}

for (const f of changedFiles) {
  if (isGovernance(f)) buckets.GOVERNANCE.push(f);
  else if (f.startsWith("src/engine/")) buckets.ENGINE.push(f);
  else if (f.startsWith("src/domain/")) buckets.DOMAIN.push(f);
  else if (f === "src/persistence/db.ts") buckets.PERSISTENCE_SCHEMA.push(f);
  else if (
    f === "src/persistence/backup.ts" ||
    f === "src/persistence/restore.ts" ||
    f.startsWith("src/persistence/compat/")
  )
    buckets.PERSISTENCE_BACKUP.push(f);
  else if (f.startsWith("test-fixtures/protected/")) buckets.PROTECTED_FIXTURES.push(f);
  else if (f === "package.json" || f === "package-lock.json") buckets.DEPENDENCIES.push(f);
  else if (f.startsWith("src/ui/")) buckets.UI.push(f);
  else if (f.startsWith("docs/") || f.startsWith(".claude/") || f === "CLAUDE.md" || f.endsWith(".md"))
    buckets.PROCESS_DOCS.push(f);
  else buckets.OTHER.push(f);
}

// package.json is only actually a dependency-risk event if `dependencies`/
// `devDependencies` changed — a scripts-only edit is not. Semantic check,
// not "the file appeared in the diff."
let dependencyKeysChanged = false;
if (buckets.DEPENDENCIES.includes("package.json")) {
  try {
    const before = JSON.parse(git(["show", `${baseRef}:package.json`]));
    const after = JSON.parse(readFileSync("package.json", "utf8"));
    const beforeDeps = JSON.stringify({
      dependencies: before.dependencies ?? null,
      devDependencies: before.devDependencies ?? null,
    });
    const afterDeps = JSON.stringify({
      dependencies: after.dependencies ?? null,
      devDependencies: after.devDependencies ?? null,
    });
    dependencyKeysChanged = beforeDeps !== afterDeps;
  } catch {
    dependencyKeysChanged = true; // couldn't compare (e.g. new file) — be conservative
  }
}
if (buckets.DEPENDENCIES.includes("package-lock.json")) dependencyKeysChanged = true;

console.log(`Changed files vs ${baseRef}: ${changedFiles.length}\n`);
for (const [bucket, files] of Object.entries(buckets)) {
  if (files.length === 0) continue;
  console.log(`${bucket} (${files.length}):`);
  for (const f of files) console.log(`  - ${f}`);
}

console.log("\n--- Suggested DEV-FLOW-002 lane (evidence, not a verdict) ---");
const protectedTriggers = [];
if (buckets.GOVERNANCE.length) protectedTriggers.push("governance/authorization or safeguard authority");
if (buckets.PERSISTENCE_SCHEMA.length) protectedTriggers.push("persistence schema/migration");
if (buckets.PERSISTENCE_BACKUP.length) protectedTriggers.push("backup/restore contract");
if (buckets.PROTECTED_FIXTURES.length) protectedTriggers.push("protected historical fixtures");
if (dependencyKeysChanged) protectedTriggers.push("dependency/devDependency change");
if (buckets.ENGINE.length) protectedTriggers.push("Engine/recommendation authority (inspect semantics)");
if (buckets.DOMAIN.length) protectedTriggers.push("domain semantics/invariants (inspect semantics)");

if (protectedTriggers.length > 0) {
  console.log("PROTECTED triggers present: " + protectedTriggers.join("; "));
  console.log("-> explicit bounded owner approval, appropriate tests, independent exact-head review, " +
    "green required CI, and owner merge approval. See docs/agent/DEV-FLOW-002.md.");
} else {
  console.log("No path-detected PROTECTED trigger. Inspect privacy/security, primary information " +
    "architecture, consequential AI autonomy, correction semantics, and other protected boundaries.");
  console.log("ROUTINE for small repairs/copy/isolated tests/low-risk polish within an approved objective; " +
    "FEATURE for owner-approved capabilities or meaningful UI improvements. Confirm with judgment.");
  console.log("Every PR requires owner merge approval and green required CI; no automatic merge.");
}

// Hard gate: protected fixtures changed without the one file that can
// legitimately explain why (fixtureIntegrity.test.ts's hardcoded byte-
// length/SHA-256 constants, which must move in lockstep with a genuine,
// deliberate fixture update) is treated as an unacknowledged modification,
// not a judgment call — this is the "explicit exceptional procedure" the
// protected-fixtures rule requires.
if (buckets.PROTECTED_FIXTURES.length > 0 && !changedFiles.includes("tests/compat/fixtureIntegrity.test.ts")) {
  console.error(
    "\nFAIL: test-fixtures/protected/** changed without tests/compat/fixtureIntegrity.test.ts " +
      "also changing in the same diff. That file's hardcoded byte-length/SHA-256 constants are " +
      "the explicit, deliberate acknowledgement this check requires — see " +
      ".claude/rules/protected-fixtures.md.",
  );
  process.exit(1);
}

process.exit(0);
