import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logWater } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { seedLivedMonth, MONTH_FIRST_DAY, MONTH_NOW } from "./helpers/livedMonth";

/**
 * METRIC-PAGE-001 (pilot, Gavin 2026-11-14): HYDRATION and STEPS open one metric page from TODAY and BODY. Each keeps
 * its meaning — water is what you logged (white), steps are Garmin's measurements (blue) — on BEYOND's 16:30 lived
 * days. A day without a record is missing, never zero. The existing records, logging, Garmin sync and Alfred routes
 * stay one tap away. Synthetic data only (BODY-DASH-001's month).
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const H = 3_600_000, DAY = 24 * H;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const sheet = (name: "HYDRATION" | "STEPS") => page.getByRole("dialog", { name, exact: true });
const text = (sel: string) => document.querySelector(`dialog[open] ${sel}`)?.textContent ?? "";
async function range(name: "HYDRATION" | "STEPS", label: string) {
  await sheet(name).getByRole("button", { name: label, exact: true }).click();
}
/** Two past lived days of water, so 7D has records and gaps. */
async function seedPastWater() {
  const days = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  vi.setSystemTime(MONTH_FIRST_DAY + 27 * DAY + 2 * H); await logWater(days[27]!.id, 40);
  vi.setSystemTime(MONTH_FIRST_DAY + 25 * DAY + 3 * H); await logWater(days[25]!.id, 24);
  vi.setSystemTime(MONTH_NOW);
}

describe("METRIC-PAGE-001 pilot", () => {
  it("TODAY's WATER opens HYDRATION: your logs, today by hour, honest gaps, the split, and its records and LOG one tap away", async () => {
    await seedLivedMonth(); await seedPastWater();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Water 32 oz/ }).click();
    await expect.element(sheet("HYDRATION")).toBeVisible();
    await expect.poll(() => text("[data-md-hero]")).toContain("32");
    // Source: your logs, in grey-white; never Garmin's blue.
    expect(text(".md-source")).toContain("LOGGED");
    expect(text(".md-source")).toContain("Garmin hydration isn't imported");
    expect(document.querySelector("dialog[open] .bf-src--garmin")).toBeNull();
    // TODAY: the lived day from 16:30, by hour.
    expect(text("[data-md-hero]")).toBe("32 oz so far · since 16:30");
    expect(document.querySelector('dialog[open] svg[aria-label^="Water by hour since 16:30: 32 oz in 3 logs"]')).not.toBeNull();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-water-today.png`, element: document.querySelector("dialog[open]") as HTMLElement }); }

    // 7D: two logged days, five missing ones shown as gaps, the average over logged days only.
    await range("HYDRATION", "Last 7 lived days");
    await expect.poll(() => text("[data-md-coverage]")).toContain("2 of 7 finished days logged · 5 not logged, left out");
    expect(text("[data-md-hero]")).toContain("32"); // (40 + 24) / 2
    const bars = document.querySelectorAll("dialog[open] .md-bar");
    expect(bars).toHaveLength(7);
    expect(document.querySelectorAll("dialog[open] .md-bar[data-missing]")).toHaveLength(4); // 7 bars include today (partial); 2 past logged + today logged
    // The bars are reachable by keyboard and read their own day.
    (bars[0] as SVGGElement).focus();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-water-7d.png`, element: document.querySelector("dialog[open]") as HTMLElement }); }

    // 1Y: by week, the average of logged days.
    await range("HYDRATION", "Last year, by week");
    await expect.poll(() => text("[data-md-hero]")).toContain("oz a logged day, on average");

    // Work days against days off, from the recorded work context.
    expect(text('[data-md-split="work"]')).toContain("WORK DAYS");
    expect(text('[data-md-split="off"]')).toContain("DAYS OFF");

    // The records (where corrections live) are one tap further, unchanged.
    await sheet("HYDRATION").getByRole("button", { name: "WATER RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("water");
  });

  it("HYDRATION's LOG WATER opens the existing water sheet", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Water 32 oz/ }).click();
    await sheet("HYDRATION").getByRole("button", { name: "LOG WATER", exact: true }).click();
    await expect.element(screen.getByRole("dialog").getByRole("button", { name: "+16 oz", exact: true })).toBeVisible();
  });

  it("a log after midnight still belongs to the lived day that began at 16:30", async () => {
    await seedLivedMonth();
    const days = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    vi.setSystemTime(MONTH_NOW + 3 * H + 20 * 60_000); // 01:30
    await logWater(days.at(-1)!.id, 16);
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Water 48 oz/ }).click();
    await expect.poll(() => text("[data-md-hero]")).toBe("48 oz so far · since 16:30");
  });

  it("BODY's STEPS opens STEPS: Garmin's measurements in blue, its running total, ranges and its own routes", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("button", { name: "Open steps history" })).toBeVisible();
    await screen.getByRole("button", { name: "Open steps history" }).click();
    await expect.element(sheet("STEPS")).toBeVisible();
    await expect.poll(() => text(".md-source")).toContain("GARMIN");
    expect(document.querySelector("dialog[open] .bf-src--garmin")).not.toBeNull();
    expect(text(".md-source")).toMatch(/Garmin as of/);
    expect(document.querySelector('dialog[open] svg[aria-label^="Running step total"]')).not.toBeNull();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-steps-today.png`, element: document.querySelector("dialog[open]") as HTMLElement }); }
    await range("STEPS", "Last 30 lived days");
    await expect.poll(() => text("[data-md-coverage]")).toMatch(/of 30 finished days measured/);
    // Steps bars are Garmin blue; water's would be white.
    expect(getComputedStyle(document.querySelector("dialog[open] .md-chart--steps .md-fill")!).fill).toBe("rgb(57, 135, 229)");
    await range("STEPS", "Last year, by week");
    await expect.poll(() => text("[data-md-hero]")).toContain("steps a week, on average");
    expect(text("[data-md-usual]")).toMatch(/Usual on work days: [\d,]+ steps|Your usual appears after/);
    await expect.element(sheet("STEPS").getByRole("button", { name: "ASK ALFRED", exact: true })).toBeVisible();
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-steps-1y.png`, element: document.querySelector("dialog[open]") as HTMLElement }); }
  });

  it("TODAY's STEPS and BODY's HYDRATION reach the same pages", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Steps / }).click();
    await expect.element(sheet("STEPS")).toBeVisible();
    await sheet("STEPS").getByRole("button", { name: "CLOSE" }).click();
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await screen.getByRole("button", { name: "Open water history" }).click();
    await expect.element(sheet("HYDRATION")).toBeVisible();
  });

  it("nothing spills, sentences keep 16 px, and both pages pass axe from 320 to 1024 px", async () => {
    await seedLivedMonth(); await seedPastWater();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    for (const [tile, name] of [[/^Water 32 oz/, "HYDRATION"], [/^Steps /, "STEPS"]] as const) {
      await screen.getByRole("button", { name: tile }).click();
      await expect.element(sheet(name)).toBeVisible();
      await expect.poll(() => text("[data-md-hero]")).not.toBe("");
      for (const r of ["Today, this lived day", "Last 7 lived days", "Last 30 lived days", "Last year, by week"]) {
        await range(name, r);
        for (const width of [320, 412, 1024]) {
          await page.viewport(width, 900); await settle();
          const box = document.querySelector<HTMLElement>("dialog[open] .md")!;
          expect(box.scrollWidth, `${name} ${r} ${width}`).toBeLessThanOrEqual(box.clientWidth + 1);
          const small: string[] = [];
          const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const t = n.textContent?.trim(), el = n.parentElement!;
            if (!t || el.closest("svg, .visually-hidden, details:not([open]) table") || !el.getClientRects().length) continue;
            const cs = getComputedStyle(el), isLabel = (t === t.toUpperCase() || cs.textTransform === "uppercase") && t.length <= 32;
            if (parseFloat(cs.fontSize) < (isLabel ? 10 : 16)) small.push(`${t} (${cs.fontSize})`);
          }
          expect(small, `${name} ${r} ${width}`).toEqual([]);
        }
      }
      await page.viewport(360, 900); await settle();
      const result = await axe.run(document.querySelector("dialog[open]")!, { runOnly: ["wcag2a", "wcag2aa"] });
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), name).toEqual([]);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/metric-${name.toLowerCase()}-30d.png`, element: document.querySelector("dialog[open]") as HTMLElement });
      await sheet(name).getByRole("button", { name: "CLOSE" }).click();
    }
  });
});
