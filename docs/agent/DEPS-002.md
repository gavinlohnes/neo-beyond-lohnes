# DEPS-002 — security updates that ship to the phone

- **Authority:** Gavin, 2026-11-01: "Let's do the security", on the proposal to apply only the
  non-breaking fixes and leave the build-tool chain for its own PR. **Lane:** dependency update
  (owner-approved); lockfile only, no `package.json` range change, no new dependency.
- **Changed:** `zod` 4.6.5 → 4.6.7 (the one **high** advisory; zod validates every record before it is
  saved) and `fast-uri` 3.1.8 → 3.1.9 (moderate, via `workbox-build` → `ajv`). Applied with
  `npm audit fix` (no `--force`).
- **Result:** `npm audit --omit=dev`: **0 vulnerabilities** in what ships. Full audit 12 → 10 (no high).
- **Left, on purpose:** 10 advisories (2 low, 8 moderate), all build-time only, all via `workbox-build`
  7.4.1 (already latest) → old `glob`, `minimatch`, `ejs`/`jake`/`filelist`, `deepmerge`. They run only
  while building the app on our own files. npm's suggested "fix" is a *downgrade* of vite-plugin-pwa to
  1.1.0 (semver-major), so `--force` is not safe. The real path is vite-plugin-pwa 2.0, a major upgrade
  of the offline engine: its own PR with owner approval and an offline acceptance check.

REUSE: npm's own audit fix. OWN: none. BUILD FROM SCRATCH: none.
