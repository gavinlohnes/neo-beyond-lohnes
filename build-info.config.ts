import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Factory Drop 02 — the single place both vite.config.ts (app build) and
// vitest.config.ts (test runs) get __APP_RELEASE__/__BUILD_COMMIT__/
// __BUILD_TIME__ from, so the two configs can't independently drift into
// two different answers for "what build is this."
export function buildInfoDefine(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

  let commit: string;
  try {
    commit = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    commit = "unknown";
  }

  return {
    __APP_RELEASE__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  };
}
