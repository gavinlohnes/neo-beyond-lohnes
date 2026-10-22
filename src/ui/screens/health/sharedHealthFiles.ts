/** Must match public/share-target-sw.js. */
export const SHARED_HEALTH_CACHE = "beyond-shared-health";

/**
 * GARMIN-002 SEND TO BEYOND: returns the files the service worker parked from Android's share
 * sheet and removes them, so a file is offered for preview once. Nothing here imports anything.
 */
export async function takeSharedHealthFiles(): Promise<File[]> {
  if (typeof caches === "undefined" || !(await caches.has(SHARED_HEALTH_CACHE))) return [];
  const cache = await caches.open(SHARED_HEALTH_CACHE);
  const files: File[] = [];
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    if (response) {
      const name = decodeURIComponent(response.headers.get("X-Beyond-Name") ?? "shared-health.json");
      files.push(new File([await response.blob()], name, { type: "application/json" }));
    }
  }
  await caches.delete(SHARED_HEALTH_CACHE);
  return files;
}
