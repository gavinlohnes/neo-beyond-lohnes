// Harvest Checkpoint 7: "virtual:pwa-register/react" only exists because
// vite-plugin-pwa's build-time plugin generates it — that plugin isn't
// loaded in vitest.config.ts's test pipeline (and shouldn't be; adding
// PWA/service-worker generation to a test run would be exactly the kind
// of test-architecture distortion this checkpoint says to avoid for
// marginal value). Aliased in for the "browser" project only, so App.tsx
// can be rendered in tests without changing App.tsx itself. Deliberately
// static/no-op — Checkpoint 0's actual update-prompt behavior is already
// verified by inspecting the real built dist/sw.js, not by this stub.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: async () => {},
  };
}
