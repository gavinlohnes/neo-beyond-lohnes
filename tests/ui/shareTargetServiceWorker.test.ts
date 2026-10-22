import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * GARMIN-002 SEND TO BEYOND: runs the real public/share-target-sw.js against a fake service worker
 * scope. It must only park shared files on the device and redirect to the import preview.
 */
const SCOPE = "https://example.test/neo-beyond-lohnes/";
function load() {
  const listeners: ((event: unknown) => void)[] = [];
  const store = new Map<string, Map<string, Response>>();
  const caches = {
    async open(name: string) {
      const entries = store.get(name) ?? new Map<string, Response>(); store.set(name, entries);
      return {
        async keys() { return [...entries.keys()].map((url) => new Request(url)); },
        async delete(request: Request) { return entries.delete(request.url); },
        async put(url: string, response: Response) { entries.set(url, response); },
      };
    },
  };
  const self = { registration: { scope: SCOPE }, addEventListener: (_: string, fn: (event: unknown) => void) => listeners.push(fn) };
  new Function("self", "caches", readFileSync("public/share-target-sw.js", "utf8"))(self, caches);
  async function dispatch(request: Request): Promise<Response | null> {
    let responded: Promise<Response> | null = null;
    for (const fn of listeners) fn({ request, respondWith: (r: Promise<Response>) => { responded = r; } });
    return responded ? await responded : null;
  }
  return { store, dispatch };
}
const shared = (name: string, body: string) => new File([body], name, { type: "application/json" });

describe("share target service worker", () => {
  it("parks up to two shared files and redirects to the import preview", async () => {
    const { store, dispatch } = load();
    const form = new FormData();
    form.append("health", shared("beyond-sleep.json", "{\"a\":1}"));
    form.append("health", shared("beyond-activity.json", "{\"b\":2}"));
    form.append("health", shared("third.json", "{}"));
    const response = await dispatch(new Request(`${SCOPE}share-target`, { method: "POST", body: form }));
    expect(response!.status).toBe(303);
    expect(response!.headers.get("Location")).toBe(`${SCOPE}?share=health`);
    const parked = store.get("beyond-shared-health")!;
    expect(parked.size).toBe(2);
    expect(await parked.get(`${SCOPE}shared-health-0`)!.text()).toBe("{\"a\":1}");
    expect(decodeURIComponent(parked.get(`${SCOPE}shared-health-1`)!.headers.get("X-Beyond-Name")!)).toBe("beyond-activity.json");
  });
  it("ignores every other request and drops oversized files", async () => {
    const { store, dispatch } = load();
    expect(await dispatch(new Request(`${SCOPE}share-target`))).toBeNull();
    expect(await dispatch(new Request(`${SCOPE}other`, { method: "POST", body: "x" }))).toBeNull();
    const form = new FormData();
    form.append("health", shared("big.json", "x".repeat(8 * 1024 * 1024 + 1)));
    expect((await dispatch(new Request(`${SCOPE}share-target`, { method: "POST", body: form })))!.status).toBe(303);
    expect(store.get("beyond-shared-health")!.size).toBe(0);
  });
});
