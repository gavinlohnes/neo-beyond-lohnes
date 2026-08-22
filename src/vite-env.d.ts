/// <reference types="vite-plugin-pwa/react" />

// Injected at build time by vite.config.ts's `define` — see src/app/buildInfo.ts.
declare const __APP_RELEASE__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;
