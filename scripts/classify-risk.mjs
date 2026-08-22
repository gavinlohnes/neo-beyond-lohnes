#!/usr/bin/env node
// Factory Drop 01B — deterministic changed-path/change-type risk classifier.
//
// Paths are EVIDENCE for classification, not a substitute for semantic
// judgment (see .claude/skills/beyond-drop's Risk classification section).
// This script reports which risk buckets a diff touches and a SUGGESTED
// minimum tier — it does not, by itself, fail the build for Engine/
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
  PROCESS_DOCS: [],
  OTHER: [],
};

for (const f of changedFiles) {
  if (f.startsWith("src/engine/")) buckets.ENGINE.push(f);
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

console.log("\n--- Suggested minimum tier (evidence, not a verdict) ---");
const highRisk = [];
if (buckets.PERSISTENCE_SCHEMA.length) highRisk.push("persistence schema/migration");
if (buckets.PERSISTENCE_BACKUP.length) highRisk.push("backup/restore contract");
if (buckets.PROTECTED_FIXTURES.length) highRisk.push("protected historical fixtures");
if (dependencyKeysChanged) highRisk.push("dependency/devDependency change");

const architectural = [];
if (buckets.ENGINE.length) architectural.push("Engine (confirm semantic, not just touched)");
if (buckets.DOMAIN.length) architectural.push("domain types (confirm semantic, not just touched)");

if (highRisk.length > 0) {
  console.log("HIGH-RISK triggers present: " + highRisk.join("; "));
  console.log("-> at minimum: High-Risk task contract + High-Risk report.");
} else if (architectural.length > 0) {
  console.log("Architectural triggers present: " + architectural.join("; "));
  console.log(
    "-> at minimum: Architectural task contract + Standard report, IF the change is " +
      "semantically meaningful (not only a comment/formatting/non-behavioral edit).",
  );
} else if (buckets.UI.length > 0 || buckets.OTHER.length > 0 || buckets.DEPENDENCIES.length > 0) {
  console.log("No Architectural/High-Risk trigger detected — looks Routine. Confirm with judgment.");
} else {
  console.log("Only process/docs files changed — Routine, Micro report.");
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
