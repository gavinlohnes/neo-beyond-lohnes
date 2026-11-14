import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * VISUAL-FOUNDATION-002 (Gavin, 2026-11-14: "Start. Keep last session"): TRAIN's first view on the foundation. The
 * command bar carries TRAIN // STRENGTH, the date and the day's context, and has no action, so START WORKOUT stays the
 * only start and stays on the first phone screen. Under the suggested workout, LAST SESSION, THIS WEEK and NEWEST RECORD
 * show only what TRAIN recorded, each opening its existing detail. Nothing collides or spills from 320 to 1024 px.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const NOW = new Date(2026, 10, 14, 18, 0).getTime(); // Saturday, after the 16:30 boundary.

beforeEach(async () => { try { localStorage.clear(); } catch { /* ignore */ } vi.useFakeTimers({ toFake: ["Date"] }); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const panel = (id: string) => document.querySelector<HTMLElement>(`[data-train="${id}"]`);
const text = (id: string) => panel(id)?.textContent ?? "";
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

async function session(at: number, dayId: string, sets: readonly [number, number][]) {
  vi.setSystemTime(at);
  const s = await startWorkout(dayId, "A", "STANDARD");
  for (const [i, [lbs, reps]] of sets.entries()) { vi.setSystemTime(at + (i + 1) * 120_000); await logSet(dayId, s.id, "machine-chest-press", i + 1, lbs, reps); }
  vi.setSystemTime(at + 40 * 60_000);
  await completeWorkout(dayId, s.id, "STANDARD", "COMPLETED");
}

async function seed() {
  vi.setSystemTime(NOW - 9 * 86_400_000);
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  await session(NOW - 8 * 86_400_000, day.id, [[135, 10], [135, 10]]);           // last week (Friday)
  await session(NOW - 3 * 86_400_000, day.id, [[135, 10], [140, 8]]);             // Wednesday
  await session(NOW - 1 * 86_400_000, day.id, [[145, 8], [145, 7], [135, 10]]);   // Friday: a new heaviest
  vi.setSystemTime(NOW);
}

function checkLayout(label: string) {
  const overlaps: string[] = [];
  for (const head of document.querySelectorAll<HTMLElement>(".train-numbers .bf-panel__head, .train-home .bf-bar")) {
    const parts = [...head.children].filter((c) => (c as HTMLElement).offsetParent !== null).map((c) => [c, c.getBoundingClientRect()] as const);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const [a, ra] = parts[i]!, [b, rb] = parts[j]!;
      if (ra.left < rb.right - 0.5 && rb.left < ra.right - 0.5 && ra.top < rb.bottom - 0.5 && rb.top < ra.bottom - 0.5) overlaps.push(`${a.className}×${b.className}`);
    }
  }
  const spill = [...document.querySelectorAll<HTMLElement>(".train-numbers .bf-panel, .train-home .bf-bar")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.dataset.train ?? "bar");
  const small: string[] = [];
  for (const root of document.querySelectorAll(".train-home, .train-numbers")) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || el.closest(".visually-hidden")) continue;
      const size = parseFloat(getComputedStyle(el).fontSize), isLabel = t === t.toUpperCase() && t.length <= 24;
      if (size < (isLabel ? 10 : 16)) small.push(`${t} (${size}px)`);
    }
  }
  expect({ overlaps, spill, small, pageWidth: document.documentElement.scrollWidth <= window.innerWidth }, label).toEqual({ overlaps: [], spill: [], small: [], pageWidth: true });
}

async function openTrain() {
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.element(screen.getByRole("article", { name: "NEWEST RECORD" })).toBeVisible();
  await expect.poll(() => text("record")).toContain("145");
  return screen;
}

it("shows TRAIN's numbers from its own records, each opening its existing detail", async () => {
  await seed();
  await page.viewport(360, 780);
  const screen = await openTrain();
  expect(document.querySelector(".train-home .bf-bar")!.textContent).toContain("TRAIN // STRENGTH");
  expect(document.querySelector("[data-train-day]")!.textContent).toContain("SAT, NOV 14");
  // No second start: the bar has no action.
  expect(document.querySelector(".train-home .bf-bar__log")).toBeNull();
  // LAST SESSION: Friday's three working sets; THIS WEEK: Wednesday and Friday, five sets; NEWEST RECORD: 145 × 8.
  expect(text("last")).toContain("3 working sets");
  expect(text("last")).toContain("Template A · Completed · 40 min · Fri, Nov 13");
  expect(text("week")).toContain("2 sessions");
  expect(text("week")).toContain("5 working sets");
  expect(panel("week")!.querySelector(".bf-spark--own")).not.toBeNull();
  expect(text("record")).toContain("145 lb × 8");
  expect(text("record")).toContain("heaviest");
  // Your own logs: LOGGED in grey, never Garmin blue.
  expect(document.querySelectorAll(".train-numbers .bf-src--garmin")).toHaveLength(0);
  // START WORKOUT stays on the first phone screen, above the navigation.
  for (const a of document.getAnimations()) a.finish();
  const start = screen.getByRole("button", { name: /^START WORKOUT/ }).first().element().getBoundingClientRect();
  const nav = document.querySelector("nav.bottom-nav, nav[aria-label='Main']")?.getBoundingClientRect();
  expect(start.bottom).toBeLessThanOrEqual(nav ? nav.top : 780);
  if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/train-360-open.png` }); }

  await screen.getByRole("button", { name: "Open TRAINING SUMMARY" }).click();
  await expect.element(screen.getByText("TRAINING SUMMARY", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Open records" }).click();
  await expect.element(screen.getByRole("button", { name: "RECORDS", pressed: true })).toBeVisible();
  await screen.getByRole("button", { name: "WORKOUT", exact: true }).click();
  await screen.getByRole("button", { name: "Open training history" }).click();
  await expect.element(screen.getByRole("button", { name: "HISTORY", pressed: true })).toBeVisible();
});

it("says plainly when nothing is recorded yet", async () => {
  vi.setSystemTime(NOW);
  await startDay();
  await page.viewport(360, 780);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.element(screen.getByRole("article", { name: "NEWEST RECORD" })).toBeVisible();
  await expect.poll(() => text("record")).toContain("No records yet");
  expect(text("last")).toContain("No sessions yet");
  expect(text("week")).toContain("No sessions yet");
  expect(document.querySelectorAll(".train-numbers .bf-src")).toHaveLength(0);
  expect(document.querySelectorAll(".train-numbers .bf-spark")).toHaveLength(0);
});

it("nothing collides, spills or shrinks below the size rule from 320 to 1024 px, and it passes axe", async () => {
  await seed();
  await page.viewport(360, 780);
  await openTrain();
  for (const width of [320, 360, 412, 768, 1024]) {
    await page.viewport(width, width > 700 ? 1100 : 1400); await settle();
    checkLayout(`TRAIN ${width}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/train-${width}.png` });
  }
  await settle();
  const r = await axe.run(document.querySelector(".train-operator") ?? document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
