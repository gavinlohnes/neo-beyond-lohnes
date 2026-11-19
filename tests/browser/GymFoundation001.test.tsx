import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getActiveWorkoutSession, getPerformedSets } from "../../src/application/trainQueries";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * GYM-FOUNDATION-001 (Gavin, 2026-11-19: "1A"; HARVEST-001 #8): the live workout and gym mode on BEYOND's visual
 * foundation (the display face is the HUD's Chakra Petch, as on BODY). Same flow, same words, same handlers: a command bar (TRAIN // LIVE, the workout, GYM MODE), the two
 * session numbers as framed foundation numerals, the current exercise framed with the red bracket, and big condensed
 * numerals for weight and reps. Nothing spills from 320 to 1024 px, every text in TRAIN stays 16 px or larger, and
 * axe passes. Synthetic data only.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const NOW = new Date(2026, 10, 14, 18, 0).getTime();
beforeEach(async () => { try { localStorage.clear(); } catch { /* ignore */ } vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
};
const shot = async (name: string, full = false) => {
  if (!SHOTS) return;
  if (full) { await page.viewport(360, 2000); await settle(); }
  await page.screenshot({ path: `${SHOTS}/gym-foundation-${name}.png` });
  if (full) { await page.viewport(360, 800); await settle(); }
};

/** Workout A done three days ago (chest press 135 × 10, 140 × 8), then TRAIN opened with workout B in progress. */
async function openLiveWorkout(width = 360) {
  vi.setSystemTime(NOW - 3 * 86_400_000);
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  const past = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, past.id, "machine-chest-press", 1, 135, 10);
  await logSet(day.id, past.id, "machine-chest-press", 2, 140, 8);
  await completeWorkout(day.id, past.id, "STANDARD", "COMPLETED");
  vi.setSystemTime(NOW);
  await page.viewport(width, 800);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await screen.getByRole("button", { name: "START WORKOUT" }).click();
  await expect.element(screen.getByRole("button", { name: "GYM MODE" })).toBeVisible();
  return screen;
}
const state = () => document.querySelector<HTMLElement>(".train-live-state")!;

function checkLayout(label: string) {
  const root = document.querySelector<HTMLElement>(".train-operator")!;
  const spill = [...root.querySelectorAll<HTMLElement>(".train-live-state, .train-live-num, .command-surface, .gym-mode")]
    .filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className);
  // The live workout's own content (the app header and nav keep their own sizes).
  const small: string[] = [];
  for (const area of root.querySelectorAll(".train-live-state, .command-surface")) {
    const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || !el.getClientRects().length || getComputedStyle(el).visibility === "hidden" || el.closest(".visually-hidden, [hidden]")) continue;
      if (parseFloat(getComputedStyle(el).fontSize) < 16) small.push(`${t} (${getComputedStyle(el).fontSize})`);
    }
  }
  const bar = [...state().querySelector(".bf-bar")!.children].map((c) => c.getBoundingClientRect());
  const overlap = bar.length === 2 && bar[0]!.right > bar[1]!.left + 0.5 && bar[0]!.top < bar[1]!.bottom && bar[1]!.top < bar[0]!.bottom;
  expect({ spill, small, overlap, page: document.documentElement.scrollWidth <= window.innerWidth }, label).toEqual({ spill: [], small: [], overlap: false, page: true });
}

describe("GYM-FOUNDATION-001: the live workout on the foundation", () => {
  it("leads with a command bar and two framed numbers, frames the current exercise, and keeps the same flow", async () => {
    const screen = await openLiveWorkout();
    // The command bar: TRAIN // LIVE, the workout, and GYM MODE as its one bar action.
    expect(state().querySelector(".bf-bar__eyebrow")!.textContent).toContain("TRAIN // LIVE");
    expect(state().querySelector(".bf-bar")!.textContent).toContain("WORKOUT B — in progress");
    expect(state().querySelector(".bf-bar .bf-bar__log")!.textContent).toBe("GYM MODE");
    // The two numbers are foundation numerals in framed panels with the red bracket.
    const nums = [...state().querySelectorAll<HTMLElement>(".train-live-num")];
    expect(nums.map((n) => n.textContent)).toEqual(["EXERCISES DONE0 / 4", "SETS LOGGED0 of 11"]);
    for (const n of nums) {
      expect(getComputedStyle(n).clipPath).not.toBe("none");
      expect(getComputedStyle(n, "::before").borderTopColor).toBe("rgb(208, 20, 27)");
      expect(getComputedStyle(n.querySelector(".bf-value")!).fontFamily).toMatch(/Chakra Petch/);
      expect(parseFloat(getComputedStyle(n.querySelector(".bf-value")!).fontSize)).toBeGreaterThanOrEqual(46);
    }
    // The current exercise keeps its one dominant frame and gains the bracket; weight and reps are big numerals.
    expect(document.querySelectorAll(".command-surface")).toHaveLength(1);
    const surface = document.querySelector<HTMLElement>(".command-surface")!;
    expect(getComputedStyle(surface, "::before").borderLeftColor).toBe("rgb(208, 20, 27)");
    expect(getComputedStyle(surface.querySelector(".command-title")!).fontFamily).toMatch(/Chakra Petch/);
    const weight = screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).element();
    expect(getComputedStyle(weight).fontFamily).toMatch(/Chakra Petch/);
    expect(parseFloat(getComputedStyle(weight).fontSize)).toBeGreaterThanOrEqual(32);
    // LOG is still the one red action (read once TRAIN's advisory read has settled and LOG is enabled).
    await expect.element(screen.getByRole("button", { name: "LOG", exact: true })).toBeEnabled();
    expect(getComputedStyle(screen.getByRole("button", { name: "LOG", exact: true }).element()).backgroundColor).toBe("rgb(208, 20, 27)");
    await shot("live", true);

    // Same flow: type, LOG, and the numbers move; nothing else changed about logging.
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("100");
    await screen.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("10");
    await screen.getByRole("button", { name: "LOG", exact: true }).click();
    await expect.poll(() => state().querySelectorAll(".train-live-num")[1]?.textContent).toBe("SETS LOGGED1 of 11");
    const session = await getActiveWorkoutSession();
    expect((await getPerformedSets(session!.id)).map((s) => [s.weight, s.reps])).toEqual([[100, 10]]);
    await shot("live-logged", true);
  });

  it("gym mode reads at arm's length: big numerals, mono labels, the same LOG", async () => {
    const screen = await openLiveWorkout();
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    const gym = screen.getByRole("dialog", { name: "Gym mode" });
    await expect.element(gym).toBeVisible();
    const root = gym.element();
    expect(root.classList.contains("bf")).toBe(true);
    expect(root.querySelector(".gym-mode__count")!.textContent).toBe("Exercise 1 of 4");
    expect(getComputedStyle(root.querySelector(".gym-mode__count")!, "::before").content).toContain("///");
    for (const n of root.querySelectorAll(".gym-mode__number")) {
      expect(getComputedStyle(n).fontFamily).toMatch(/Chakra Petch/);
      expect(parseFloat(getComputedStyle(n).fontSize)).toBeGreaterThanOrEqual(64);
    }
    await expect.element(gym.getByRole("button", { name: "LOG SET 1" })).toBeVisible();
    await shot("gym");
  });

  it("nothing spills or shrinks below 16 px, and the live workout and gym mode pass axe, from 320 to 1024 px", async () => {
    const screen = await openLiveWorkout(320);
    for (const width of [320, 360, 412, 768, 1024]) {
      await page.viewport(width, 900); await settle();
      checkLayout(`live ${width}`);
    }
    await page.viewport(360, 900); await settle();
    const live = await axe.run(document.querySelector(".train-operator")!, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(live.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Gym mode" })).toBeVisible();
    for (const width of [320, 412, 1024]) {
      await page.viewport(width, 900); await settle();
      const gym = document.querySelector<HTMLElement>(".gym-mode")!;
      expect(gym.scrollWidth, `gym ${width}`).toBeLessThanOrEqual(gym.clientWidth + 1);
    }
    const gymAxe = await axe.run(document.querySelector(".gym-mode")!, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(gymAxe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});
