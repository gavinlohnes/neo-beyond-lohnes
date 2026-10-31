import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { markGarminSyncRequested, takeGarminSyncRequest, SYNC_REQUEST_WINDOW_MS } from "../../src/ui/healthSyncRequest";
import { describeGarminSync } from "../../src/ui/components/GarminSyncLine";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** SYNC-002: one tap of SYNC GARMIN — what the Health Bridge sends back imports straight away. */
const H = 3600_000;
const start = new Date(2026, 9, 20, 16, 30).getTime(), now = start + 34 * H;

async function park(files: unknown[]) {
  const cache = await caches.open("beyond-shared-health");
  await Promise.all(files.map((f, i) => cache.put(`/shared-health-${i}`, new Response(JSON.stringify(f), { headers: { "X-Beyond-Name": `beyond-${i}.json` } }))));
}
function arriveFromShare() {
  const url = new URL(window.location.href); url.searchParams.set("share", "health"); window.history.replaceState(null, "", url.toString());
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true }); vi.setSystemTime(now);
  await page.viewport(412, 915);
  try { localStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => { cleanup(); vi.useRealTimers(); const url = new URL(window.location.href); url.searchParams.delete("share"); window.history.replaceState(null, "", url.toString()); });

describe("SYNC-002", () => {
  it("right after SYNC GARMIN, the Bridge's files import straight away and TODAY says what came", async () => {
    const { days, sleep, activity } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    await park([sleep, activity]);
    markGarminSyncRequested(now - 60_000);
    arriveFromShare();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    await expect.element(screen.getByText(/^Garmin updated · sleep \d+:\d\d · [\d,]+ steps · resting \d+$/)).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(sleep.records.length);
    expect(await db.externalActivityHours.count()).toBe(activity.hours.length);
    expect(await caches.has("beyond-shared-health")).toBe(false);
    await screen.getByRole("button", { name: "OK", exact: true }).click();
    await expect.element(screen.getByText(/^Garmin updated/)).not.toBeInTheDocument();
  });

  it("a share without a recent SYNC GARMIN tap still opens the preview and imports nothing", async () => {
    const { days, sleep } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    await park([sleep]);
    markGarminSyncRequested(now - SYNC_REQUEST_WINDOW_MS - 1000);
    arriveFromShare();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("heading", { name: "REVIEW SLEEP IMPORT" })).toBeVisible();
    expect(await db.externalSleepRecords.count()).toBe(0);
  });

  it("says plainly when Garmin itself is behind, and the request is used once", () => {
    const old = new Date(now - 30 * H).toISOString();
    expect(describeGarminSync({ newestAt: old, sleepMinutes: 420, stepsToday: null, restingBpm: 58, sleepFilled: 0 }, now))
      .toMatchObject({ headline: "Garmin hasn't sent anything new", behind: true });
    expect(describeGarminSync({ newestAt: null, sleepMinutes: null, stepsToday: null, restingBpm: null, sleepFilled: 0 }, now).detail)
      .toMatch(/^Health Connect had no Garmin data to send/);
    markGarminSyncRequested(now);
    expect(takeGarminSyncRequest(now + 1000)).toBe(true);
    expect(takeGarminSyncRequest(now + 2000)).toBe(false);
  });
});
