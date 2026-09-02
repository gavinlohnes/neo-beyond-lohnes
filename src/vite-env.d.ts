/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Injected at build time by vite.config.ts's `define` — see src/app/buildInfo.ts.
declare const __APP_RELEASE__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

// NUTRITION-002 (2026-09-02): optional, deployment-time only — see
// application/foodLookupQueries.ts's own doc comment for why this is a
// plain Vite env var (varies per deploy) rather than a build-info.config.ts
// `define` constant (fixed per commit).
interface ImportMetaEnv {
  readonly VITE_USDA_FDC_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
