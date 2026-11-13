/**
 * PWA-001: an installed BEYOND is usually resumed from the background, not reloaded, and the browser only checks
 * for a new service worker on a navigation. So a phone could keep running an old version for days. When the app
 * comes back to the foreground, or the connection returns, this asks the service worker to check (at most once
 * per `minGapMs`). It only checks: a found update still waits for SYSTEM UPDATE READY, and nothing reloads by itself.
 */
export function watchForUpdates(
  registration: Pick<ServiceWorkerRegistration, "update">,
  { minGapMs = 10 * 60_000, now = () => Date.now() }: { minGapMs?: number; now?: () => number } = {},
): () => void {
  let last = now();
  const check = () => {
    if (document.visibilityState !== "visible" || !navigator.onLine || now() - last < minGapMs) return;
    last = now();
    // Offline, a server error or a changing network can reject; the next foreground tries again.
    void registration.update().catch(() => {});
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", check);
  return () => { document.removeEventListener("visibilitychange", check); window.removeEventListener("online", check); };
}
