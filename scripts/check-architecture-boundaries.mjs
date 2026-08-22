#!/usr/bin/env node
// Factory Drop 01B — deterministic architecture-boundary enforcement.
// Zero dependencies: plain Node fs/path + a regex import scan. Enforces
// the layer rules already stated in CLAUDE.md's "Architecture layer
// rules" section and .claude/rules/engine.md — it doesn't invent new
// doctrine, it makes the existing doctrine mechanically checkable.
//
// Rules enforced (hard failures, exit 1):
//   1. src/engine/**       must never import src/application/** or src/persistence/**.
//   2. src/application/**  must never import src/ui/**.
//   3. src/ui/**           must never import src/persistence/** directly —
//      except the pre-existing files below, which already did this before
//      this check existed (see UI_PERSISTENCE_ALLOWLIST doc comment).
//
// Not enforced here (deliberately, to avoid false positives against
// existing, accepted code): a blanket "UI must never import engine
// directly" rule. UI already imports several engine/* functions directly
// today (e.g. deriveCapacity, suggestSessionVariant) for pure, in-memory
// computation that doesn't need a persistence round-trip — CLAUDE.md's
// own wording ("never engine/* directly for anything requiring
// persistence") already reflects that this is fine; only the
// persistence-direction rule is a hard line.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

/**
 * Pre-existing UI -> persistence imports that predate this check (Factory
 * Drop 01B, 2026-08-22): MoreScreen.tsx (backup/restore/diagnostics — the
 * screen whose entire job is system access) and TodayScreen.tsx
 * (outcomeDismissals + a backup-nudge timestamp read, both UI-local
 * bookkeeping that happens to live under persistence/ for implementation
 * convenience). Grandfathered, not blessed as permanent doctrine — a
 * future, explicitly-scoped Drop may route these through application/*
 * instead. Any OTHER ui/** file importing persistence/** directly fails
 * immediately; these two may not gain further NEW persistence imports
 * beyond what's already there without deliberately re-reviewing this list.
 */
const UI_PERSISTENCE_ALLOWLIST = new Set([
  "src/ui/screens/more/MoreScreen.tsx",
  "src/ui/screens/today/TodayScreen.tsx",
]);

const IMPORT_RE = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function zoneOf(relPath) {
  if (relPath.startsWith("src/engine/")) return "engine";
  if (relPath.startsWith("src/application/")) return "application";
  if (relPath.startsWith("src/persistence/")) return "persistence";
  if (relPath.startsWith("src/domain/")) return "domain";
  if (relPath.startsWith("src/ui/")) return "ui";
  return null;
}

function resolveSpecifier(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    try {
      statSync(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return base;
}

const violations = [];
const files = walk(SRC);

for (const file of files) {
  const relFile = relative(ROOT, file).replace(/\\/g, "/");
  const fromZone = zoneOf(relFile);
  if (!fromZone) continue;

  const content = readFileSync(file, "utf8");
  let match;
  IMPORT_RE.lastIndex = 0;
  while ((match = IMPORT_RE.exec(content))) {
    const specifier = match[1] ?? match[2];
    if (!specifier || !specifier.startsWith(".")) continue; // external package, not our concern here

    const resolved = resolveSpecifier(file, specifier);
    const relResolved = relative(ROOT, resolved).replace(/\\/g, "/");
    const toZone = zoneOf(relResolved);
    if (!toZone) continue;

    if (fromZone === "engine" && (toZone === "application" || toZone === "persistence")) {
      violations.push(`ENGINE PURITY: ${relFile} imports ${toZone} via "${specifier}"`);
    }
    if (fromZone === "application" && toZone === "ui") {
      violations.push(`APPLICATION/UI DIRECTION: ${relFile} imports ui via "${specifier}"`);
    }
    if (fromZone === "ui" && toZone === "persistence" && !UI_PERSISTENCE_ALLOWLIST.has(relFile)) {
      violations.push(
        `UI/PERSISTENCE DIRECTION: ${relFile} imports persistence directly via "${specifier}" ` +
          `(not on the pre-existing allowlist — route through application/* instead)`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations found:\n");
  for (const v of violations) console.error(" - " + v);
  console.error(
    `\n${violations.length} violation(s). See CLAUDE.md's "Architecture layer rules" and .claude/rules/engine.md.`,
  );
  process.exit(1);
} else {
  console.log(`Architecture boundaries OK (${files.length} files scanned).`);
}
