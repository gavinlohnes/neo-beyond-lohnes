import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { seedLivedMonth, MONTH_NOW } from "./helpers/livedMonth";

/**
 * ENERGY-CURVE-001 (Gavin, 2026-11-19, HARVEST-003 part 1, approved): TONIGHT'S ENERGY on TODAY, an estimate from your
 * Garmin sleep and the two-process model, labelled as one. Synthetic data only (BODY-DASH-001's month of Garmin sleep).
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });
const settle = async () => { await new Promise((r) => setTimeout(r, 300)); for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish(); };
const panel = () => document.querySelector<HTMLElement>('[aria-label="Tonight\'s energy"]');

describe("ENERGY-CURVE-001", () => {
  it("draws tonight's energy from Garmin sleep, names the lowest stretch, labels it an estimate, and writes nothing", async () => {
    await seedLivedMonth();
    const before = await db.events.count();
    await page.viewport(360, 800);
    await render(<App />);
    await expect.poll(() => panel()?.textContent ?? "").toContain("TONIGHT'S ENERGY");
    const el = panel()!;
    expect(el.textContent).toContain("ESTIMATE");
    expect(el.querySelector(".today-energy__line")).not.toBeNull();
    expect(el.querySelector(".today-energy__now")).not.toBeNull();
    expect(el.querySelector("[data-energy-low]")?.textContent).toMatch(/^Lowest stretch \d\d:\d\d–\d\d:\d\d\.$/);
    expect(el.textContent).toContain("Not a measurement or a score");
    expect(el.textContent).not.toMatch(/\d+ ?%|score of|\/100/);
    expect(await db.events.count()).toBe(before);
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/energy-curve.png`, element: el }); }
    for (const width of [320, 412, 1024]) {
      await page.viewport(width, 900); await settle();
      expect(el.scrollWidth, `${width}`).toBeLessThanOrEqual(el.clientWidth + 1);
      for (const p of el.querySelectorAll("p")) if (p.getClientRects().length) expect(parseFloat(getComputedStyle(p).fontSize), p.textContent ?? "").toBeGreaterThanOrEqual(16);
    }
    const result = await axe.run(el, { runOnly: ["wcag2a", "wcag2aa"] });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  it("without three Garmin main sleeps it says how many it has, and draws nothing", async () => {
    await startDay();
    await page.viewport(360, 800);
    await render(<App />);
    await expect.poll(() => panel()?.textContent ?? "").toContain("appears after 3 main sleeps from Garmin in the last week (0 so far)");
    expect(panel()!.querySelector(".today-energy__chart")).toBeNull();
  });
});
