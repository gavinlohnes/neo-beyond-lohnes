/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { LOCKSCREEN_CACHE, LOCKSCREEN_PREFS_KEY } from "../../src/application/lockScreenSets";
import { startWorkout } from "../../src/application/trainCommands";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { lockScreenWorker } from "../../src/ui/screens/train/LockScreenSets";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-LOCKSCREEN-001: the LOCK SCREEN switch on the live workout, the plan sent to the service worker,
 * closing on finish, and parked lock-screen taps showing as sets when BEYOND comes back into view. The worker itself
 * is tested in tests/ui/lockScreenServiceWorker.test.ts; here its messages are watched.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const A = WORKOUT_TEMPLATES.A!.exercises;
type Posted = { type: string; op: string; force?: boolean; plan?: { sessionId: string; showSkip: boolean; sets: { exerciseId: string; setNumber: number; weight: number; reps: number }[] } };
const posts = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((c) => c[0] as Posted);
const switchOf = (screen: Awaited<ReturnType<typeof render>>) => screen.getByRole("switch", { name: "Show the current set on your lock screen" });

let permission: NotificationPermission = "default";
beforeEach(async () => {
  await page.viewport(360, 900);
  localStorage.clear();
  permission = "default";
  vi.spyOn(Notification, "permission", "get").mockImplementation(() => permission);
  await caches.delete(LOCKSCREEN_CACHE);
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); await caches.delete(LOCKSCREEN_CACHE); });

async function liveWorkout() {
  const day = await startDay();
  const session = await startWorkout(day.id, "A", "STANDARD");
  const screen = await render(<TrainScreen />);
  await expect.element(switchOf(screen)).toBeVisible();
  return { day, session, screen };
}

describe("GRAYSON-TRAIN-LOCKSCREEN-001 lock-screen sets", () => {
  it("is off by default; turning it on asks permission once, sends the plan, and stopping the workout closes it", async () => {
    const post = vi.spyOn(lockScreenWorker, "post").mockImplementation(() => {});
    const ask = vi.spyOn(Notification, "requestPermission").mockImplementation(async () => { permission = "granted"; return "granted"; });
    const { session, screen } = await liveWorkout();
    await expect.element(switchOf(screen)).not.toBeChecked();
    await settle();
    expect(post).not.toHaveBeenCalled();
    const fieldset = () => document.querySelector("[data-lockscreen-switch]")!;
    expect((await axe.run(fieldset(), { runOnly: ["wcag2a", "wcag2aa"] })).violations).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/360-switch-off.png`, element: fieldset() as HTMLElement });

    await switchOf(screen).click();
    await expect.element(switchOf(screen)).toBeChecked();
    expect(ask).toHaveBeenCalledTimes(1);
    await expect.poll(() => posts(post).filter((p) => p.op === "show").length).toBeGreaterThan(0);
    const shown = posts(post).find((p) => p.op === "show")!;
    expect(shown.force).toBe(true);
    expect(shown.plan!.sessionId).toBe(session.id);
    expect(shown.plan!.showSkip).toBe(true);
    expect(shown.plan!.sets.map((s) => `${s.exerciseId}#${s.setNumber}`)).toEqual(A.flatMap((e) => Array.from({ length: e.sets }, (_, i) => `${e.exerciseId}#${i + 1}`)));
    expect(JSON.parse(localStorage.getItem(LOCKSCREEN_PREFS_KEY)!)).toEqual({ on: true, showSkip: true });
    await expect.element(screen.getByRole("checkbox", { name: "SKIP button too" })).toBeChecked();
    expect((await axe.run(fieldset(), { runOnly: ["wcag2a", "wcag2aa"] })).violations).toEqual([]);
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 900); await settle(150);
      expect(document.documentElement.scrollWidth, `${width} px`).toBeLessThanOrEqual(width);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-switch-on.png`, element: fieldset() as HTMLElement });
    }
    await page.viewport(360, 900);

    // Turning it off and on again doesn't ask twice: the phone remembers.
    await switchOf(screen).click();
    await expect.poll(() => posts(post).at(-1)?.op).toBe("close");
    await switchOf(screen).click();
    expect(ask).toHaveBeenCalledTimes(1);

    post.mockClear();
    // No set logged yet: COULDN'T START stops it straight away.
    await screen.getByRole("button", { name: "COULDN'T START" }).click();
    await expect.poll(() => posts(post).some((p) => p.op === "close")).toBe(true);
  });

  it("with notifications blocked it stays off and says why", async () => {
    permission = "denied";
    const post = vi.spyOn(lockScreenWorker, "post").mockImplementation(() => {});
    const { screen } = await liveWorkout();
    await switchOf(screen).click();
    await expect.element(screen.getByText("Notifications are off for BEYOND. Allow them in your phone's settings, then turn this on.")).toBeVisible();
    await expect.element(switchOf(screen)).not.toBeChecked();
    expect(post).not.toHaveBeenCalled();
  });

  it("parked DONE and SKIP taps show as sets, marked from lock screen, when BEYOND comes back into view", async () => {
    permission = "granted";
    localStorage.setItem(LOCKSCREEN_PREFS_KEY, JSON.stringify({ on: true, showSkip: true }));
    vi.spyOn(lockScreenWorker, "post").mockImplementation(() => {});
    const { session, screen } = await liveWorkout();
    const ex = A[0]!;
    const cache = await caches.open(LOCKSCREEN_CACHE);
    // Tapped after the workout started (a tap from before it is refused by logSet).
    const tap = (n: number, kind: "DONE" | "SKIP", afterStartMs: number) => cache.put(`${location.origin}/lockscreen-tap-${n}`, new Response(JSON.stringify({
      sessionId: session.id, exerciseId: ex.exerciseId, setNumber: n, weight: 95, reps: 9, kind, tappedAt: new Date(Date.parse(session.startedAt) + afterStartMs).toISOString(),
    })));
    await tap(1, "DONE", 1000);
    await tap(2, "SKIP", 2000);
    document.dispatchEvent(new Event("visibilitychange"));
    await expect.element(screen.getByText(/#1 — 95 lb x 9/)).toBeVisible();
    const marks = () => [...document.querySelectorAll("[data-from-lock-screen]")].map((e) => e.closest("p")?.textContent);
    await expect.poll(marks).toEqual(expect.arrayContaining([expect.stringContaining("#1 — 95 lb x 9 · from lock screen")]));
    expect((await cache.keys()).length).toBe(0);
    const row = document.querySelector("[data-from-lock-screen]")!.closest("p")!.parentElement as HTMLElement;
    expect((await axe.run(row, { runOnly: ["wcag2a", "wcag2aa"] })).violations).toEqual([]);
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 900); await settle(150);
      expect(document.documentElement.scrollWidth, `${width} px`).toBeLessThanOrEqual(width);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${width}-set-from-lock-screen.png`, element: row });
    }
  });
});
