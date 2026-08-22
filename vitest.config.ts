import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

/**
 * Harvest Checkpoint 4: a small, separate real-browser acceptance layer
 * alongside (not replacing) the existing 44-file/472-test Node suite.
 * "node" keeps the exact prior config (environment/setupFiles/include
 * untouched); "browser" only picks up tests/browser/**\/*.test.tsx — a
 * glob that shares zero files with the node project's tests/**\/*.test.ts,
 * so nothing runs twice and nothing existing is rewritten. Chromium via
 * the official @vitest/browser-playwright provider (confirmed compatible
 * with the installed vitest@4.1.10: exact peer-version match, stable
 * `latest` dist-tag, no prerelease needed).
 */
export default defineConfig({
  // Without this, Vite's dep-optimizer can pre-bundle two separate React
  // instances (one via the app's own import graph, one via
  // vitest-browser-react's) — the browser project then renders with a
  // hook dispatcher from one instance while the component tree calls
  // useState from the other, surfacing as "Cannot read properties of
  // null (reading 'useState')". Confirmed by hitting this exact error
  // and resolving it with this dedupe.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          setupFiles: ["./tests/setup.ts"],
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        extends: true,
        // Harvest Checkpoint 7: "virtual:pwa-register/react" only exists
        // via vite-plugin-pwa's build-time plugin, which this test config
        // deliberately does not load (adding real SW/PWA generation to a
        // test run would be architecture distortion for marginal value —
        // Checkpoint 0's actual update-prompt behavior is already verified
        // against the real built dist/sw.js). Aliased to a static, no-op
        // stub so App.tsx can render unmodified in the browser project.
        resolve: {
          alias: {
            "virtual:pwa-register/react": fileURLToPath(new URL("./tests/browser/mocks/pwaRegisterStub.ts", import.meta.url)),
          },
        },
        test: {
          name: "browser",
          include: ["tests/browser/**/*.test.tsx"],
          setupFiles: ["./tests/browser/setup.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
