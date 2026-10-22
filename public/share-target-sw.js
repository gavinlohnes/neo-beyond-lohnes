/*
 * GARMIN-002 SEND TO BEYOND: Android shares BEYOND Health Bridge files to the installed PWA as a
 * POST to ./share-target. This handler only parks the shared files on this device, then opens
 * COMMAND → IMPORT HEALTH DATA, where they are previewed and imported only after confirmation.
 * Loaded into the generated service worker with Workbox's importScripts.
 */
const SHARE_CACHE = "beyond-shared-health";
const MAX_SHARED_BYTES = 8 * 1024 * 1024; // matches the import limit (GARMIN-003 history)

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== new URL("share-target", self.registration.scope).pathname) return;
  event.respondWith((async () => {
    const cache = await caches.open(SHARE_CACHE);
    for (const key of await cache.keys()) await cache.delete(key);
    try {
      const form = await event.request.formData();
      const files = form.getAll("health").filter((f) => typeof f !== "string" && f.size <= MAX_SHARED_BYTES).slice(0, 2);
      await Promise.all(files.map((file, i) => cache.put(new URL(`shared-health-${i}`, self.registration.scope).href,
        new Response(file, { headers: { "Content-Type": "application/json", "X-Beyond-Name": encodeURIComponent(file.name || `shared-${i}.json`) } }))));
    } catch {
      // Nothing is parked; the import screen opens with its normal file picker.
    }
    return Response.redirect(new URL("./?share=health", self.registration.scope).href, 303);
  })());
});
