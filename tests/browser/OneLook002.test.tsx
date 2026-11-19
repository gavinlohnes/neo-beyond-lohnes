import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { commandResult } from "./helpers/command";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";

/**
 * ONE-LOOK-002 (Gavin, 2026-11-19: "1 through 5 are approved"; item 1, finish the one look): TRAIN's HISTORY and
 * RECORDS, MY PROGRAMME and MORE's REVIEW on the visual foundation, and the header's Ask Alfred at a 44 px target.
 * Same words, order, taps and data. Synthetic data only.
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
const shot = async (name: string) => { if (SHOTS) { await page.viewport(360, 1400); await settle(); await page.screenshot({ path: `${SHOTS}/one-look-${name}.png` }); await page.viewport(360, 800); await settle(); } };

async function seed() {
  vi.setSystemTime(NOW - 9 * 86_400_000);
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  for (const [ago, sets] of [[8, [[135, 10], [135, 10]]], [3, [[135, 10], [140, 8]]], [1, [[145, 8], [145, 7]]]] as const) {
    const at = NOW - ago * 86_400_000; vi.setSystemTime(at);
    const s = await startWorkout(day.id, "A", "STANDARD");
    for (const [i, [lbs, reps]] of sets.entries()) { vi.setSystemTime(at + (i + 1) * 120_000); await logSet(day.id, s.id, "machine-chest-press", i + 1, lbs, reps); }
    vi.setSystemTime(at + 40 * 60_000); await completeWorkout(day.id, s.id, "STANDARD", "COMPLETED");
  }
  vi.setSystemTime(NOW);
}
const RED = (c: string) => { const [r, g, b] = c.match(/\d+/g)!.map(Number) as [number, number, number]; return r > 4 * g && r > 4 * b; };
/** A framed foundation panel: cut corners and the red bracket. */
function expectFramed(el: Element, label: string) {
  expect(getComputedStyle(el).clipPath, label).not.toBe("none");
  expect(RED(getComputedStyle(el, "::before").borderTopColor), label).toBe(true);
}
async function expectReadable(root: HTMLElement, label: string, min = 16) {
  for (const width of [320, 412, 1024]) {
    await page.viewport(width, 900); await settle();
    expect(document.documentElement.scrollWidth, `${label} ${width}`).toBeLessThanOrEqual(width);
    const small: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || !el.getClientRects().length || el.closest("svg, .visually-hidden, details:not([open]) > :not(summary)")) continue;
      const cs = getComputedStyle(el), isLabel = !el.closest("button, input, select, textarea") && t === t.toUpperCase() && t.length <= 32;
      if (parseFloat(cs.fontSize) < (isLabel ? 10 : min)) small.push(`${t} (${cs.fontSize})`);
    }
    expect(small, `${label} ${width}`).toEqual([]);
  }
  await page.viewport(360, 800); await settle();
  const result = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function openTrain() {
  await page.viewport(360, 800);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.element(screen.getByRole("article", { name: "NEWEST RECORD" })).toBeVisible();
  return screen;
}

describe("ONE-LOOK-002: the rest of the look", () => {
  it("TRAIN HISTORY and RECORDS: every session and record a framed panel, opening as before", async () => {
    await seed();
    const screen = await openTrain();
    await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
    await expect.poll(() => document.querySelectorAll(".record-card").length).toBe(3);
    await shot("history");
    for (const card of document.querySelectorAll(".record-card")) expectFramed(card, "history card");
    await expectReadable(document.querySelector<HTMLElement>(".train-operator .record-cards")!.parentElement!, "HISTORY");
    await screen.getByRole("button", { name: "RECORDS", exact: true }).click();
    await expect.poll(() => document.querySelectorAll(".record-card").length).toBeGreaterThan(0);
    await shot("records");
    for (const card of document.querySelectorAll(".record-card")) expectFramed(card, "record card");
    await expectReadable(document.querySelector<HTMLElement>(".train-operator .record-cards")!.parentElement!, "RECORDS");
  });

  it("MY PROGRAMME: a framed panel with a mono label", async () => {
    await seed();
    await openTrain();
    const programme = document.querySelector<HTMLElement>('[aria-label="My programme"]')!;
    await shot("programme");
    expectFramed(programme, "programme");
    expect(getComputedStyle(programme.querySelector(".bx-eyebrow")!).fontFamily).toMatch(/Mono/);
  });

  it("REVIEW: a command bar and framed recommendation days", async () => {
    await seed();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await (await commandResult(screen, "REVIEW")).click();
    const review = document.querySelector<HTMLElement>(".picture-review")!;
    await expect.poll(() => review.querySelector(".bf-bar")?.textContent ?? review.textContent).toContain("MORE // REVIEW");
    await shot("review");
    expect(review.querySelector(".bf-bar .bf-bar__eyebrow")!.textContent).toContain("MORE // REVIEW");
    await expect.element(screen.getByRole("heading", { name: "MORE // REVIEW", exact: true })).toBeVisible();
  });

  it("the header's Ask Alfred is a 44 px target on every tab", async () => {
    await page.viewport(360, 800);
    const screen = await render(<App />);
    for (const tab of ["TODAY", "TRAIN", "DATA", "MORE"]) {
      await screen.getByRole("navigation").getByRole("button", { name: tab, exact: true }).click(); await settle();
      const ask = [...document.querySelectorAll<HTMLElement>(".cc-alfred-btn")].find((b) => b.getClientRects().length)!;
      const r = ask.getBoundingClientRect();
      expect([Math.round(r.width) >= 44, Math.round(r.height) >= 44], tab).toEqual([true, true]);
      for (const width of [320, 412]) { await page.viewport(width, 800); await settle(); expect(document.documentElement.scrollWidth, `${tab} ${width}`).toBeLessThanOrEqual(width); }
      await page.viewport(360, 800);
    }
  });

  it("sheet titles are read as their names: the slashes are hidden from screen readers", async () => {
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Open LOG" }).click();
    await expect.element(screen.getByRole("dialog", { name: "LOG" }).getByRole("heading", { name: "LOG", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("dialog", { name: "LOG" }).getByText("///", { exact: true })).toBeVisible();
  });
});
