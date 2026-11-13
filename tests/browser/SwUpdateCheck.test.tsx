import { afterEach, expect, it, vi } from "vitest";
import { watchForUpdates } from "../../src/app/swUpdateCheck";

/** PWA-001: a resumed app asks the service worker to check for a new version, throttled, and only online. */
let stop: (() => void) | null = null;
afterEach(() => { stop?.(); stop = null; vi.restoreAllMocks(); });

it("checks on coming back to the foreground and on reconnecting, at most once per gap", async () => {
  let t = 0;
  const update = vi.fn(() => Promise.resolve());
  stop = watchForUpdates({ update } as unknown as ServiceWorkerRegistration, { minGapMs: 1000, now: () => t });
  const resume = () => document.dispatchEvent(new Event("visibilitychange"));

  resume();
  expect(update).not.toHaveBeenCalled(); // right after launch the browser already checked
  t = 1500; resume();
  expect(update).toHaveBeenCalledTimes(1);
  t = 1800; resume();
  expect(update).toHaveBeenCalledTimes(1); // throttled
  t = 3000; window.dispatchEvent(new Event("online"));
  expect(update).toHaveBeenCalledTimes(2);
});

it("does nothing offline, and a failed check is quiet", async () => {
  let t = 0;
  const update = vi.fn(() => Promise.reject(new Error("offline")));
  stop = watchForUpdates({ update } as unknown as ServiceWorkerRegistration, { minGapMs: 1000, now: () => t });
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  t = 5000; document.dispatchEvent(new Event("visibilitychange"));
  expect(update).not.toHaveBeenCalled();
  online.mockReturnValue(true);
  document.dispatchEvent(new Event("visibilitychange"));
  expect(update).toHaveBeenCalledTimes(1);
  await Promise.resolve(); // the rejection is caught, so the test doesn't see an unhandled error
});
