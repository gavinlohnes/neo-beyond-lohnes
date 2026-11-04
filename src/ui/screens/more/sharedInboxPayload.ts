export const SHARED_INBOX_CACHE = "beyond-shared-inbox";
const KEY = "shared-inbox";

export async function takeSharedInboxPayload(): Promise<{ title: string; text: string; url: string } | null> {
  if (!("caches" in window)) return null;
  const cache = await caches.open(SHARED_INBOX_CACHE);
  const request = new URL(KEY, window.location.href).href;
  const response = await cache.match(request);
  if (!response) return null;
  await cache.delete(request);
  return response.json();
}
