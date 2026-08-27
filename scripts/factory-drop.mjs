#!/usr/bin/env node
// FACTORY-002 — Development Factory V1: deterministic Drop bootstrap/
// validation. Zero new dependencies: plain Node fs/path/child_process,
// same style as scripts/check-architecture-boundaries.mjs and
// scripts/classify-risk.mjs.
//
// Persist authorization, derive observation: this script never trusts
// memory or a prior conversation for repository/CI facts — it re-derives
// remote identity, baseline, and working-tree cleanliness from git itself
// every time, and reads authorization/routing facts (which Drop is
// active, its contract, its declared baseline/branch) only from the two
// durable files it manages: docs/agent/ACTIVE_DROP.md and
// docs/agent/drops/<id>.md. It never duplicates live Git/GitHub/CI state
// (current HEAD, CI status, mergeability, PR review state) into those
// files — see .claude/skills/beyond-drop/SKILL.md §9 for the full
// mechanism this operationalizes.
//
// This script takes no destructive action, ever: it only reads git state
// and writes docs/agent/ACTIVE_DROP.md. It never resets, checks out,
// deletes, or discards anything. Every failure mode fails closed with an
// actionable message.
//
// Usage:
//   node scripts/factory-drop.mjs validate <id> --baseline <sha> [--allow-dirty]
//   node scripts/factory-drop.mjs init     <id> --baseline <sha> --branch <name> [--builder <note>] [--allow-dirty]
//   node scripts/factory-drop.mjs status
//   node scripts/factory-drop.mjs close    <id> --integration-sha <sha>
//
// Environment overrides (test/fixture use only — see tests/factory/):
//   FACTORY_DROP_ROOT           repository root to operate against (default: this script's own repo root)
//   FACTORY_DROP_EXPECTED_REPO  comma-separated list of accepted "owner/repo" origin slugs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPT_REPO_ROOT = resolve(SCRIPT_DIR, "..");

export const DEFAULT_EXPECTED_REPO_SLUGS = ["gavinlohnes/neo-beyond-lohnes"];

export const VALID_RISK_TIERS = ["ROUTINE", "ARCHITECTURAL", "HIGH-RISK"];

// Exact heading text required in every Drop Contract body — kept in sync
// with docs/agent/drops/TEMPLATE.md by inspection; a template edit that
// renames a section must update this list in the same Drop.
export const REQUIRED_CONTRACT_SECTIONS = [
  "## Mission",
  "## Approved baseline",
  "## Risk classification",
  "## Authorized scope",
  "## Explicit exclusions",
  "## Relevant authority / references",
  "## Required invariants",
  "## Acceptance criteria",
  "## Required verification",
  "## Builder expectations",
  "## Reviewer expectations",
  "## Integrator expectations",
  "## Stop / escalation conditions",
];

export function getRoot() {
  return process.env.FACTORY_DROP_ROOT ? resolve(process.env.FACTORY_DROP_ROOT) : SCRIPT_REPO_ROOT;
}

export function getExpectedRepoSlugs() {
  return process.env.FACTORY_DROP_EXPECTED_REPO
    ? process.env.FACTORY_DROP_EXPECTED_REPO.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_EXPECTED_REPO_SLUGS;
}

export function activeDropPath(root = getRoot()) {
  return join(root, "docs/agent/ACTIVE_DROP.md");
}

export function dropContractPath(id, root = getRoot()) {
  return join(root, "docs/agent/drops", `${id}.md`);
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/**
 * Hand-rolled, deliberately minimal: parses a leading `---\n...\n---\n`
 * block of flat `key: value` lines. No nesting, no lists, no YAML
 * dependency — this repository's frontmatter never needs more than that,
 * and adding a YAML parser dependency to read four or five flat fields
 * would fail this Drop's own "smallest sufficient implementation" rule.
 */
export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("NO_FRONTMATTER: expected a leading '---' ... '---' block");
  const frontmatter = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) throw new Error(`MALFORMED_FRONTMATTER_LINE: "${line}"`);
    frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontmatter, body: m[2] };
}

/** Never throws. Returns { ok: true, frontmatter } or { ok: false, errors }. */
export function validateContractText(text) {
  let frontmatter, body;
  try {
    ({ frontmatter, body } = parseFrontmatter(text));
  } catch (e) {
    return { ok: false, errors: [e.message] };
  }
  const errors = [];
  if (!frontmatter.id) errors.push("MISSING_FRONTMATTER_FIELD: id");
  if (!frontmatter.baseline) errors.push("MISSING_FRONTMATTER_FIELD: baseline");
  if (!frontmatter.risk_tier) errors.push("MISSING_FRONTMATTER_FIELD: risk_tier");
  else if (!VALID_RISK_TIERS.includes(frontmatter.risk_tier)) {
    errors.push(`INVALID_RISK_TIER: "${frontmatter.risk_tier}" (expected one of ${VALID_RISK_TIERS.join(", ")})`);
  }
  for (const section of REQUIRED_CONTRACT_SECTIONS) {
    if (!body.includes(section)) errors.push(`MISSING_SECTION: "${section}"`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, frontmatter };
}

export function readContract(id, root = getRoot()) {
  const p = dropContractPath(id, root);
  if (!existsSync(p)) return { ok: false, errors: [`CONTRACT_NOT_FOUND: ${p}`] };
  const result = validateContractText(readFileSync(p, "utf8"));
  if (result.ok && result.frontmatter.id !== id) {
    return { ok: false, errors: [`CONTRACT_ID_MISMATCH: ${p} declares id "${result.frontmatter.id}", filename implies "${id}"`] };
  }
  return result;
}

/** Returns the ACTIVE_DROP frontmatter, or null if no file exists yet. Throws on a malformed file — callers decide how to surface that. */
export function readActiveDrop(root = getRoot()) {
  const p = activeDropPath(root);
  if (!existsSync(p)) return null;
  return parseFrontmatter(readFileSync(p, "utf8")).frontmatter;
}

export function checkConflictingActiveDrop(activeDropFrontmatter, requestedId) {
  if (!activeDropFrontmatter) return { ok: true };
  if (activeDropFrontmatter.status !== "ACTIVE") return { ok: true };
  if (activeDropFrontmatter.id === requestedId) return { ok: true }; // same Drop — idempotent
  return {
    ok: false,
    error: `CONFLICTING_ACTIVE_DROP: "${activeDropFrontmatter.id}" is already ACTIVE (docs/agent/ACTIVE_DROP.md) — close it before launching "${requestedId}".`,
  };
}

export function normalizeRemoteUrl(url) {
  const stripped = url.trim().replace(/\.git$/, "");
  const m = stripped.match(/[/:]([^/:]+\/[^/]+)$/);
  return m ? m[1] : stripped;
}

export function isExpectedRepo(remoteUrl, expectedSlugs = DEFAULT_EXPECTED_REPO_SLUGS) {
  return expectedSlugs.includes(normalizeRemoteUrl(remoteUrl));
}

export function checkRemote(root, expectedSlugs = getExpectedRepoSlugs()) {
  let url;
  try {
    url = git(["remote", "get-url", "origin"], root);
  } catch (e) {
    return { ok: false, error: `WRONG_REPOSITORY: could not read the 'origin' remote (${e.message})` };
  }
  if (!isExpectedRepo(url, expectedSlugs)) {
    return { ok: false, error: `WRONG_REPOSITORY: origin is "${url}", expected one of: ${expectedSlugs.join(", ")}` };
  }
  return { ok: true, url };
}

/** Always re-fetches — never trusts a locally cached origin/master. */
export function checkBaseline(root, expectedSha) {
  try {
    git(["fetch", "-q", "origin", "master"], root);
    const actual = git(["rev-parse", "origin/master"], root);
    if (actual !== expectedSha) {
      return { ok: false, error: `WRONG_BASELINE: origin/master is "${actual}", expected "${expectedSha}". Fetch fresh and re-verify before launching — never assume a prior session's SHA still holds.` };
    }
    return { ok: true, actual };
  } catch (e) {
    return { ok: false, error: `WRONG_BASELINE: could not verify origin/master (${e.message})` };
  }
}

export function checkCleanWorktree(root) {
  const out = git(["status", "--porcelain"], root);
  if (out) {
    return { ok: false, error: `UNSAFE_LOCAL_STATE: working tree is not clean — refusing to launch over unknown/uncommitted work:\n${out}` };
  }
  return { ok: true };
}

/**
 * The one shared preflight both `validate` and `init` run. Returns
 * { ok: true, contract, active } or { ok: false, code, message } — never
 * throws, never exits, never mutates anything. `flags.allowDirty` and
 * `flags.expectedRepoSlugs` are the only two overridable inputs; every
 * other check is unconditional.
 */
export function preflight(id, flags, root = getRoot()) {
  const remote = checkRemote(root, flags.expectedRepoSlugs ?? getExpectedRepoSlugs());
  if (!remote.ok) return { ok: false, code: "WRONG_REPOSITORY", message: remote.error };

  if (!flags.baseline) return { ok: false, code: "MISSING_FLAG", message: "requires --baseline <sha>" };
  const baseline = checkBaseline(root, flags.baseline);
  if (!baseline.ok) return { ok: false, code: "WRONG_BASELINE", message: baseline.error };

  if (!flags.allowDirty) {
    const clean = checkCleanWorktree(root);
    if (!clean.ok) return { ok: false, code: "UNSAFE_LOCAL_STATE", message: clean.error };
  }

  let active;
  try {
    active = readActiveDrop(root);
  } catch (e) {
    return { ok: false, code: "MALFORMED_ACTIVE_DROP", message: `docs/agent/ACTIVE_DROP.md exists but failed to parse: ${e.message}` };
  }
  const conflict = checkConflictingActiveDrop(active, id);
  if (!conflict.ok) return { ok: false, code: "CONFLICTING_ACTIVE_DROP", message: conflict.error };

  const contract = readContract(id, root);
  if (!contract.ok) return { ok: false, code: "MALFORMED_CONTRACT", message: contract.errors.join("\n") };
  if (contract.frontmatter.baseline !== flags.baseline) {
    return {
      ok: false,
      code: "CONTRACT_BASELINE_MISMATCH",
      message: `Contract for "${id}" declares baseline "${contract.frontmatter.baseline}", but --baseline was "${flags.baseline}".`,
    };
  }

  return { ok: true, contract, active };
}

export function renderActiveDropFile(fields) {
  const order = ["id", "status", "baseline", "branch", "contract", "pr", "builder", "reviewer", "integrator", "integration_sha", "closed_at"];
  const lines = ["---"];
  for (const key of order) {
    if (fields[key] !== undefined) lines.push(`${key}: ${fields[key]}`);
  }
  lines.push("---", "");
  lines.push("# ACTIVE_DROP");
  lines.push("");
  lines.push(
    "This file identifies the single currently-authorized BEYOND Drop, for recovery by a fresh",
    "agent/session without the owner relaying state by hand. It is a routing/authorization",
    "pointer only — it never duplicates a fact Git/GitHub/CI can already prove (current HEAD, CI",
    "status, mergeability, PR review state). Run `node scripts/factory-drop.mjs status` to see",
    "this file's recorded facts alongside the live git facts derived at that moment; check the",
    "`pr` field's actual CI/review state directly on GitHub. See",
    "`.claude/skills/beyond-drop/SKILL.md` §9 for the full mechanism.",
    "",
    "Full authorized scope, exclusions, invariants, acceptance criteria, and role expectations",
    `for this Drop live in \`${fields.contract}\` — this file is a pointer, not a copy.`,
    "",
    "At most one Drop may be `status: ACTIVE` here at a time —",
    "`node scripts/factory-drop.mjs validate|init` refuses to launch a different Drop while one",
    "is already ACTIVE. Closing (`node scripts/factory-drop.mjs close`) flips this file's status",
    "to CLOSED; it never deletes or rewrites the historical Drop Contract file itself.",
    "",
  );
  return lines.join("\n");
}

export function closeActiveDrop(id, integrationSha, root = getRoot()) {
  let active;
  try {
    active = readActiveDrop(root);
  } catch (e) {
    return { ok: false, code: "MALFORMED_ACTIVE_DROP", message: `docs/agent/ACTIVE_DROP.md exists but failed to parse: ${e.message}` };
  }
  if (!active) return { ok: false, code: "NOTHING_TO_CLOSE", message: "No ACTIVE_DROP recorded — nothing to close." };
  if (active.status !== "ACTIVE") {
    return { ok: false, code: "NOTHING_TO_CLOSE", message: `ACTIVE_DROP status is "${active.status}", not ACTIVE.` };
  }
  if (active.id !== id) {
    return { ok: false, code: "ID_MISMATCH", message: `ACTIVE_DROP is "${active.id}", not "${id}" — refusing to close a different Drop.` };
  }
  if (!integrationSha) return { ok: false, code: "MISSING_FLAG", message: "close requires --integration-sha <sha>" };

  const content = renderActiveDropFile({
    ...active,
    status: "CLOSED",
    integration_sha: integrationSha,
    closed_at: new Date().toISOString(),
  });
  writeFileSync(activeDropPath(root), content);
  return { ok: true };
}

export function getStatus(root = getRoot()) {
  let active;
  try {
    active = readActiveDrop(root);
  } catch (e) {
    return { ok: false, code: "MALFORMED_ACTIVE_DROP", message: e.message };
  }
  let liveBranch = null;
  let liveHead = null;
  try {
    liveBranch = git(["rev-parse", "--abbrev-ref", "HEAD"], root);
  } catch {
    /* not fatal — status is best-effort diagnostic output */
  }
  try {
    liveHead = git(["rev-parse", "HEAD"], root);
  } catch {
    /* not fatal */
  }
  return { ok: true, active, liveBranch, liveHead };
}

// ---- CLI ----

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/factory-drop.mjs validate <id> --baseline <sha> [--allow-dirty]",
      "  node scripts/factory-drop.mjs init     <id> --baseline <sha> --branch <name> [--builder <note>] [--allow-dirty]",
      "  node scripts/factory-drop.mjs status",
      "  node scripts/factory-drop.mjs close    <id> --integration-sha <sha>",
    ].join("\n"),
  );
}

function main() {
  const [, , command, ...rest] = process.argv;
  const { flags, positional } = parseFlags(rest);
  const root = getRoot();

  if (command === "validate") {
    const [id] = positional;
    if (!id) {
      usage();
      process.exit(2);
    }
    const result = preflight(id, { baseline: flags.baseline, allowDirty: !!flags["allow-dirty"] }, root);
    if (!result.ok) {
      console.error(`FAIL: ${result.code}`);
      console.error(result.message);
      process.exit(1);
    }
    console.log(`VALID: safe to launch/continue "${id}" at baseline ${flags.baseline}.`);
    process.exit(0);
  }

  if (command === "init") {
    const [id] = positional;
    if (!id || !flags.branch) {
      usage();
      process.exit(2);
    }
    const result = preflight(id, { baseline: flags.baseline, allowDirty: !!flags["allow-dirty"] }, root);
    if (!result.ok) {
      console.error(`FAIL: ${result.code}`);
      console.error(result.message);
      process.exit(1);
    }
    const content = renderActiveDropFile({
      id,
      status: "ACTIVE",
      baseline: flags.baseline,
      branch: flags.branch,
      contract: `docs/agent/drops/${id}.md`,
      pr: "(pending — set by Builder immediately after opening the PR)",
      builder: flags.builder || "(unassigned — role, not a permanent identity)",
      reviewer: "(unassigned)",
      integrator: "(unassigned)",
    });
    writeFileSync(activeDropPath(root), content);
    console.log(`ACTIVE_DROP set to "${id}" (${flags.branch} @ ${flags.baseline}).`);
    process.exit(0);
  }

  if (command === "status") {
    const result = getStatus(root);
    if (!result.ok) {
      console.error(`FAIL: ${result.code}`);
      console.error(result.message);
      process.exit(1);
    }
    console.log(`Live HEAD: ${result.liveHead ?? "(unknown)"} on branch ${result.liveBranch ?? "(unknown)"}`);
    if (!result.active) {
      console.log("ACTIVE_DROP: none recorded — no Drop is currently active.");
    } else {
      console.log("ACTIVE_DROP:");
      for (const [k, v] of Object.entries(result.active)) console.log(`  ${k}: ${v}`);
      if (result.active.status === "ACTIVE") {
        console.log(`Contract: ${result.active.contract}`);
        console.log(
          `Reviewer evidence (if any): check PR ${result.active.pr} on GitHub directly for a` +
            " durable, exact-head-bound review comment/review — never assumed from this file.",
        );
      }
    }
    process.exit(0);
  }

  if (command === "close") {
    const [id] = positional;
    if (!id || !flags["integration-sha"]) {
      usage();
      process.exit(2);
    }
    const result = closeActiveDrop(id, flags["integration-sha"], root);
    if (!result.ok) {
      console.error(`FAIL: ${result.code}`);
      console.error(result.message);
      process.exit(1);
    }
    console.log(`ACTIVE_DROP "${id}" closed at integration ${flags["integration-sha"]}.`);
    process.exit(0);
  }

  usage();
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
