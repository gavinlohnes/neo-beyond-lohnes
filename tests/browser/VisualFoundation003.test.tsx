import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { submitCheckIn } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { seedLivedMonth, MONTH_NOW } from "./helpers/livedMonth";

/**
 * VISUAL-FOUNDATION-003 (Gavin, 2026-11-14; Protected, approved: "Do all", without a training panel): TODAY's first view
 * in the foundation. The skyline mode header carries the date; the band, the next step and the numbers are framed
 * panels; the numbers follow the next step; Garmin's readings are captioned in Garmin blue. Nothing about what shows,
 * what it says or what it does changes, and there is no workout prompt. Nothing collides or spills from 320 to 1024 px,
 * and the restyled parts keep the 16 px rule.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const LOW: Parameters<typeof submitCheckIn>[1] = { energy: 2, stress: 4, mood: 2, soreness: 4, alcoholUrge: 0 } as Parameters<typeof submitCheckIn>[1];

async function openToday() {
  const screen = await render(<App />);
  await expect.element(screen.getByRole("region", { name: "Day mode" })).toBeVisible();
  await expect.poll(() => document.querySelectorAll('.today-numbers [data-source="garmin"]').length).toBeGreaterThan(0);
  return screen;
}

function checkLayout(label: string) {
  const panels = [...document.querySelectorAll<HTMLElement>(".redesign-today .today-life-state, .redesign-today .console-guidance, .redesign-today .today-numbers .cc-fuel > button")];
  const spill = panels.filter((p) => p.scrollWidth > p.clientWidth + 1).map((p) => p.className || p.getAttribute("aria-label"));
  const tiles = [...document.querySelectorAll<HTMLElement>(".today-numbers .cc-fuel > button")].map((b) => b.getBoundingClientRect());
  const overlap = tiles.some((a, i) => tiles.slice(i + 1).some((b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5));
  const small: string[] = [];
  for (const root of document.querySelectorAll(".redesign-today .today-life-state, .redesign-today .today-numbers, .redesign-today .mode-header__eyebrow")) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || el.closest(".visually-hidden, dialog, [hidden]") || !el.getClientRects().length) continue;
      const size = parseFloat(getComputedStyle(el).fontSize), isLabel = t === t.toUpperCase() && t.length <= 24;
      if (size < (isLabel ? 10 : 16)) small.push(`${t} (${size}px)`);
    }
  }
  expect({ spill, overlap, small, pageWidth: document.documentElement.scrollWidth <= window.innerWidth }, label)
    .toEqual({ spill: [], overlap: false, small: [], pageWidth: true });
}

it("carries the date on the skyline, frames the band, the next step and the numbers, and puts the numbers after the next step", async () => {
  await seedLivedMonth();
  await page.viewport(360, 1600);
  await openToday();
  expect(document.querySelector("[data-today-date]")!.textContent).toBe("/// WED, OCT 21");
  // The skyline stays the horizon behind the mode.
  expect(document.querySelector(".cc-skyline")).not.toBeNull();
  // Order: the band, then the next step, then the numbers; the life link and the brief come after.
  const order = [".today-life-state", ".console-guidance", ".today-numbers", ".today-life-link", ".alfred-support"].map((sel) => document.querySelector(sel)!);
  for (let i = 1; i < order.length; i++) expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, `${i}`).toBeTruthy();
  // Framed panels: the foundation's cut corners.
  for (const sel of [".today-life-state", ".console-guidance", ".today-numbers .cc-fuel > button"]) expect(getComputedStyle(document.querySelector(sel)!).clipPath, sel).toContain("polygon");
  // Garmin's readings are captioned in Garmin blue; your own (water, weight) are not.
  const caption = (b: Element) => getComputedStyle(b.querySelector(".cc-flab:last-child")!).color;
  const steps = [...document.querySelectorAll(".today-numbers .cc-fuel > button")].find((b) => b.textContent!.startsWith("STEPS"))!;
  const water = [...document.querySelectorAll(".today-numbers .cc-fuel > button")].find((b) => b.textContent!.startsWith("WATER"))!;
  expect(steps.getAttribute("data-source")).toBe("garmin");
  expect(caption(steps)).toBe("rgb(57, 135, 229)");
  expect(water.getAttribute("data-source")).toBeNull();
  expect(caption(water)).not.toBe("rgb(57, 135, 229)");
  // No workout prompt on TODAY (Gavin: "I don't need to be asked if I want to work out today").
  expect(document.querySelector(".redesign-today")!.textContent).not.toMatch(/START WORKOUT|work out today/i);
  // On shift the preparation group shows nothing, so it draws no empty frame.
  const prep = document.querySelector<HTMLElement>(".work-preparation");
  if (prep && ![...prep.children].some((c) => c.tagName !== "DIALOG")) expect(prep.getBoundingClientRect().height).toBe(0);
  if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/today-360-full.png` }); }
});

it("a recommendation card is the panel itself: one frame, with the bracket, and its authority unchanged", async () => {
  await seedLivedMonth();
  const day = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1)!;
  await submitCheckIn(day.id, LOW);
  await page.viewport(360, 800);
  const screen = await openToday();
  await expect.element(screen.getByRole("button", { name: /I'll do this/i })).toBeVisible();
  const guidance = document.querySelector(".console-guidance")!;
  expect(getComputedStyle(guidance).clipPath).toBe("none");
  // The bracket is the palette's red (dimmer on shift), the same as every other panel's.
  const bracket = getComputedStyle(guidance.querySelector(".next-action-card")!, "::after").borderLeftColor;
  expect(bracket).toBe(getComputedStyle(document.querySelector(".today-life-state")!, "::before").borderLeftColor);
  expect(bracket).not.toBe("rgba(0, 0, 0, 0)");
  // Still exactly one red action on the screen's next step.
  expect(guidance.querySelectorAll(".btn-primary, .cc-cta").length).toBeLessThanOrEqual(1);
  if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/today-360-recommendation.png` }); }
});

it("nothing collides or spills, and the restyled parts keep the size rule, from 320 to 1024 px; it passes axe", async () => {
  await seedLivedMonth();
  await page.viewport(360, 1600);
  await openToday();
  for (const width of [320, 360, 412, 768, 1024]) {
    await page.viewport(width, width > 700 ? 1300 : 1700); await settle();
    checkLayout(`TODAY ${width}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/today-${width}.png` });
  }
  await settle();
  const r = await axe.run(document.querySelector(".redesign-today")!, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
