import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001: runs the real public/lockscreen-sw.js against a fake service worker scope (a fake
 * self.registration, Cache Storage and clients). It shows one silent notification replaced by tag, parks DONE and
 * SKIP taps, moves on to the next set, and closes when BEYOND says the workout finished.
 */
const SCOPE = "https://example.test/neo-beyond-lohnes/";
const TAG = "beyond-lockscreen-set";

interface Shown { title: string; options: { body: string; tag: string; silent: boolean; actions: { action: string; title: string }[]; data: Record<string, unknown> } }

function load() {
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const store = new Map<string, Map<string, Response>>();
  const caches = {
    async open(name: string) {
      const entries = store.get(name) ?? new Map<string, Response>(); store.set(name, entries);
      return {
        async keys() { return [...entries.keys()].map((url) => new Request(url)); },
        async match(req: string | Request) { return entries.get(typeof req === "string" ? req : req.url)?.clone(); },
        async delete(req: string | Request) { return entries.delete(typeof req === "string" ? req : req.url); },
        async put(url: string, response: Response) { entries.set(url, response); },
      };
    },
  };
  // One notification per tag, replaced in place, like the platform.
  const notifications = new Map<string, Shown & { close: () => void }>();
  const messages: unknown[] = [];
  const opened: string[] = [];
  const self = {
    registration: {
      scope: SCOPE,
      async showNotification(title: string, options: Shown["options"]) {
        notifications.set(options.tag, { title, options, close: () => notifications.delete(options.tag) });
      },
      async getNotifications({ tag }: { tag: string }) { const n = notifications.get(tag); return n ? [n] : []; },
    },
    clients: {
      async matchAll() { return [{ url: `${SCOPE}`, postMessage: (m: unknown) => messages.push(m), focus: async () => {} }]; },
      async openWindow(url: string) { opened.push(url); },
    },
    addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
  };
  new Function("self", "caches", readFileSync("public/lockscreen-sw.js", "utf8"))(self, caches);
  async function dispatch(type: string, event: Record<string, unknown>) {
    const waits: Promise<unknown>[] = [];
    for (const fn of listeners.get(type) ?? []) fn({ ...event, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }
  const current = () => notifications.get(TAG);
  const click = (action: string) => dispatch("notificationclick", { action, notification: { tag: TAG, data: current()!.options.data, close: () => {} } });
  const taps = async () => {
    const entries = store.get("beyond-lockscreen") ?? new Map<string, Response>();
    return Promise.all([...entries.entries()].filter(([k]) => k.includes("lockscreen-tap-")).map(async ([, r]) => r.clone().json()));
  };
  return { dispatch, current, click, taps, messages, opened, notifications };
}

const now = Date.now();
const plan = (extra: Record<string, unknown> = {}) => ({
  v: 1, sessionId: "s1", startedAt: new Date(now - 10 * 60_000).toISOString(), home: SCOPE, showSkip: true,
  restSeconds: { "leg-press": 120 },
  sets: [
    { exerciseId: "leg-press", name: "Leg Press", setNumber: 2, total: 3, weight: 180, reps: 10 },
    { exerciseId: "leg-press", name: "Leg Press", setNumber: 3, total: 3, weight: 180, reps: 10 },
  ],
  ...extra,
});

describe("lock-screen service worker", () => {
  it("shows the current set silently with DONE and SKIP, and replaces it by tag", async () => {
    const sw = load();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    expect(sw.current()!.title).toBe("Leg Press · set 2 of 3 · 180 × 10");
    expect(sw.current()!.options).toMatchObject({ silent: true, tag: TAG, actions: [{ action: "done", title: "DONE" }, { action: "skip", title: "SKIP" }] });
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan({ showSkip: false }) } });
    expect(sw.notifications.size).toBe(1);
    expect(sw.current()!.options.actions).toEqual([{ action: "done", title: "DONE" }]);
  });

  it("DONE parks the tap, shows rest until a clock time and the next set, and tells BEYOND; SKIP parks a skip", async () => {
    const sw = load();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    await sw.click("done");
    expect(await sw.taps()).toEqual([expect.objectContaining({ sessionId: "s1", exerciseId: "leg-press", setNumber: 2, weight: 180, reps: 10, kind: "DONE" })]);
    expect(sw.current()!.title).toMatch(/^Rest until \d{1,2}:\d{2} (AM|PM)$/);
    expect(sw.current()!.options.body).toBe("Next: Leg Press · set 3 of 3 · 180 × 10");
    expect(sw.messages).toEqual([{ type: "beyond-lockscreen-tap" }]);
    await sw.click("skip");
    expect((await sw.taps()).map((t) => [t.setNumber, t.kind]).sort()).toEqual([[2, "DONE"], [3, "SKIP"]]);
    expect(sw.current()!.title).toBe("All planned sets done");
    expect(sw.current()!.options.actions).toEqual([]);
  });

  it("a fresh plan from BEYOND never shows a set already tapped but not yet applied", async () => {
    const sw = load();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    await sw.click("done");
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    expect(sw.current()!.title).toBe("Leg Press · set 3 of 3 · 180 × 10");
  });

  it("closes when BEYOND says the workout finished, after a swipe until turned on again, and when 4 hours pass quietly", async () => {
    const sw = load();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "close" } });
    expect(sw.current()).toBeUndefined();

    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    await sw.dispatch("notificationclose", { notification: { tag: TAG } });
    sw.current()!.close();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    expect(sw.current()).toBeUndefined();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan(), force: true } });
    expect(sw.current()).toBeDefined();

    // 4 hours with no tap and nothing from BEYOND: the next time the worker runs, it closes.
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const quiet = load();
      vi.setSystemTime(now);
      await quiet.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
      vi.setSystemTime(now + 4 * 60 * 60_000 + 60_000);
      await quiet.click("done");
      expect(quiet.current()).toBeUndefined();
    } finally { vi.useRealTimers(); }
  });

  it("a set with no reps yet asks for them in BEYOND and offers no DONE; a stray DONE parks nothing", async () => {
    const sw = load();
    const noReps = plan({ sets: [{ exerciseId: "leg-press", name: "Leg Press", setNumber: 1, total: 3, weight: 0, reps: 0 }] });
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: noReps } });
    expect(sw.current()!.title).toBe("Leg Press · set 1 of 3");
    expect(sw.current()!.options.body).toBe("Enter the weight and reps in BEYOND first.");
    expect(sw.current()!.options.actions).toEqual([{ action: "skip", title: "SKIP" }]);
    await sw.click("done");
    expect(await sw.taps()).toEqual([]);
  });

  it("a tap on the body opens BEYOND at the workout", async () => {
    const sw = load();
    await sw.dispatch("message", { data: { type: "beyond-lockscreen", op: "show", plan: plan() } });
    await sw.click("");
    expect(sw.messages).toEqual([{ type: "beyond-lockscreen-tap" }]);
  });
});

