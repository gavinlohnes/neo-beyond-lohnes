import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { seedLivedMonth, MONTH_FIRST_DAY, MONTH_NOW } from "./helpers/livedMonth";
import { logProtein } from "../../src/application/commands";
import { getEffectiveProteinTargetG } from "../../src/application/nutritionTargetQueries";

/**
 * METRIC-PAGE-002 slice 1 (Gavin 2026-11-18: "2", "Let's work", "Will you give it to Claude code to do"): WEIGHT
 * joins the shared metric page. Your weigh-ins (white), never Garmin; LATEST carries BODY's weight trend whole; 30D and
 * 1Y draw dots on a fitted axis with honest gaps; records and LOG stay on weight's own routes. Synthetic data only
 * (BODY-DASH-001's month: weigh-ins of 207.4, 206.6, 206.0 and 205.2 lb on four past lived days).
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const sheet = (name: "WEIGHT" | "PROTEIN" = "WEIGHT") => page.getByRole("dialog", { name, exact: true });
const text = (sel: string) => document.querySelector(`dialog[open] ${sel}`)?.textContent ?? "";
const range = (label: string, name: "WEIGHT" | "PROTEIN" = "WEIGHT") => sheet(name).getByRole("button", { name: label, exact: true }).click();
const shot = async (name: string) => { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-weight-${name}.png`, element: document.querySelector("dialog[open]") as HTMLElement }); } };

describe("METRIC-PAGE-002 slice 1: weight", () => {
  it("TODAY's WEIGHT opens WEIGHT: your weigh-ins, the latest one, BODY's weight trend, dots with honest gaps, and its records one tap away", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Weight 205\.2 lb/ }).click();
    await expect.element(sheet()).toBeVisible();
    await expect.poll(() => text("[data-md-hero]")).toContain("205.2");
    expect(text(".md-source")).toContain("LOGGED");
    expect(text(".md-source")).toContain("Garmin weight isn't imported");
    expect(document.querySelector("dialog[open] .bf-src--garmin")).toBeNull();
    // LATEST: the newest weigh-in with its date (not this lived day's), and BODY's weight trend whole.
    expect(text("[data-md-hero]")).toMatch(/^205\.2 lb · \w{3} \d{1,2}$/);
    expect(document.querySelector('dialog[open] .weight-trend svg[aria-label^="Weight over the last 60 days"]')).not.toBeNull();
    expect(text(".weight-trend")).toContain("Last 60 days");
    // Ranges: LATEST, 30D, 1Y; no 7D.
    expect([...document.querySelectorAll("dialog[open] .md-ranges button")].map((b) => b.textContent)).toEqual(["LATEST", "30D", "1Y"]);
    await shot("latest");

    // 30D: one dot per weighed lived day, gaps as gaps, the average of weighed days only, to a tenth of a pound.
    await range("Last 30 lived days");
    await expect.poll(() => text("[data-md-coverage]")).toContain("4 of 29 finished days weighed · 25 not weighed, left out");
    expect(text("[data-md-hero]")).toBe("206.3 lb a weighed day, on average"); // (207.4 + 206.6 + 206.0 + 205.2) / 4
    expect(document.querySelectorAll("dialog[open] .md-chart--weight .md-bar")).toHaveLength(30);
    expect(document.querySelectorAll("dialog[open] .md-chart--weight circle.md-dot")).toHaveLength(4);
    expect(document.querySelectorAll("dialog[open] .md-chart--weight .md-bar[data-missing]")).toHaveLength(26);
    // The axis is fitted to the weights, never from zero.
    const ticks = [...document.querySelectorAll("dialog[open] .md-chart--weight .md-axis")].map((t) => Number(t.textContent)).filter((n) => !Number.isNaN(n));
    expect(Math.min(...ticks)).toBeGreaterThan(200);
    // Dots are your logs: white, never Garmin blue.
    expect(getComputedStyle(document.querySelector("dialog[open] .md-chart--weight circle.md-dot")!).fill).not.toBe("rgb(57, 135, 229)");
    // The selected dot reads its own day; the newest weighed day is not today, so today reads as not weighed.
    expect(text(".md-readout")).toMatch(/not weighed so far$/);
    await shot("30d");

    // 1Y: weeks as the mean of weighed days.
    await range("Last year, by week");
    await expect.poll(() => text("[data-md-hero]")).toBe("206.3 lb a weighed day, on average");
    expect(text("[data-md-split=\"work\"]")).toContain("WORK DAYS");
    expect(text("[data-md-usual]")).toMatch(/Your usual appears after 14 weighed days \(4 so far\)/);

    // The records (where corrections live) are one tap further, unchanged.
    await sheet().getByRole("button", { name: "WEIGHT RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("weight");
  });

  it("WEIGHT's LOG WEIGHT opens the existing weight sheet", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Weight 205\.2 lb/ }).click();
    await sheet().getByRole("button", { name: "LOG WEIGHT", exact: true }).click();
    await expect.poll(() => window.history.state?.recordSheet).toBe("weight");
  });

  it("BODY's WEIGHT opens the same page, and its records go to BODY's weight history", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    await screen.getByRole("button", { name: "Open weight", exact: true }).click();
    await expect.element(sheet()).toBeVisible();
    await expect.poll(() => text("[data-md-hero]")).toContain("205.2");
    await expect.element(sheet().getByRole("button", { name: "WEIGHT RECORDS", exact: true })).toBeVisible();
    await expect.element(sheet().getByRole("button", { name: "LOG WEIGHT", exact: true })).toBeVisible();
  });

  it("with no weigh-ins it says so plainly and draws no trend", async () => {
    await seedLivedMonth();
    await db.events.where("type").equals("BODYWEIGHT_LOGGED").delete();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Weight not logged/ }).click();
    await expect.poll(() => text("[data-md-hero]")).toBe("— no weigh-ins recorded yet");
    expect(document.querySelector("dialog[open] .weight-trend")).toBeNull();
    await range("Last 30 lived days");
    await expect.poll(() => text(".md")).toContain("No weigh-ins in this range.");
    expect(document.querySelector("dialog[open] .md-chart--weight")).toBeNull();
  });

  it("nothing spills, sentences keep 16 px, and WEIGHT passes axe from 320 to 1024 px", async () => {
    await seedLivedMonth();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Weight 205\.2 lb/ }).click();
    await expect.poll(() => text("[data-md-hero]")).not.toBe("");
    for (const r of ["Latest weigh-in", "Last 30 lived days", "Last year, by week"]) {
      await range(r);
      for (const width of [320, 412, 1024]) {
        await page.viewport(width, 900); await settle();
        const box = document.querySelector<HTMLElement>("dialog[open] .md")!;
        expect(box.scrollWidth, `${r} ${width}`).toBeLessThanOrEqual(box.clientWidth + 1);
        for (const button of box.querySelectorAll("button")) {
          expect(parseFloat(getComputedStyle(button).fontSize), `${button.textContent} at ${width}`).toBeGreaterThanOrEqual(16);
          expect(button.getBoundingClientRect().height, `${button.textContent} at ${width}`).toBeGreaterThanOrEqual(44);
        }
        const small: string[] = [];
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.textContent?.trim(), el = n.parentElement!;
          if (!t || el.closest("svg, .visually-hidden, details:not([open]) table, .weight-trend") || !el.getClientRects().length) continue;
          const cs = getComputedStyle(el), isLabel = !el.closest("button, input, select, textarea") && (t === t.toUpperCase() || cs.textTransform === "uppercase") && t.length <= 32;
          if (parseFloat(cs.fontSize) < (isLabel ? 10 : 16)) small.push(`${t} (${cs.fontSize})`);
        }
        expect(small, `${r} ${width}`).toEqual([]);
      }
      await page.viewport(360, 900); await settle();
      const result = await axe.run(document.querySelector("dialog[open]")!, { runOnly: ["wcag2a", "wcag2aa"] });
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), r).toEqual([]);
    }
  });
});

/** Two past lived days of quick protein logs, so 7D has records and gaps. */
async function seedPastProtein() {
  const days = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  vi.setSystemTime(MONTH_FIRST_DAY + 27 * 86_400_000 + 2 * 3_600_000); await logProtein(days[27]!.id, 120);
  vi.setSystemTime(MONTH_FIRST_DAY + 25 * 86_400_000 + 3 * 3_600_000); await logProtein(days[25]!.id, 80);
  vi.setSystemTime(MONTH_NOW);
}

describe("METRIC-PAGE-002 slice 2: protein", () => {
  it("TODAY's PROTEIN opens PROTEIN: your logs, the running total, the target as a target, honest gaps, where it came from, and its records one tap away", async () => {
    await seedLivedMonth(); await seedPastProtein();
    const target = await getEffectiveProteinTargetG();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein 48 .*explore records$/ }).click();
    await expect.element(sheet("PROTEIN")).toBeVisible();
    await expect.poll(() => text("[data-md-hero]")).toBe("48 g so far · since 16:30");
    expect(text(".md-source")).toContain("LOGGED");
    expect(text(".md-source")).toContain("meal protein and quick protein logs");
    expect(document.querySelector("dialog[open] .bf-src--garmin")).toBeNull();
    // The target is BEYOND's own, shown as a target: never a deficit or a "remaining".
    expect(text("[data-md-target]")).toBe(`Target ${target} g a day, from your protein setting and latest weigh-in.`);
    expect(text(".md")).not.toMatch(/remaining|deficit|short|left to/i);
    expect(document.querySelector('dialog[open] svg[aria-label^="Running protein total: 48 g so far"]')).not.toBeNull();
    await shot("protein-today");

    // 7D: two logged finished days and four gaps; the average of logged days only.
    await range("Last 7 lived days", "PROTEIN");
    await expect.poll(() => text("[data-md-coverage]")).toContain("2 of 6 finished days logged · 4 not logged, left out");
    expect(text("[data-md-hero]")).toBe("100 g a day, on average"); // (120 + 80) / 2
    expect(document.querySelectorAll("dialog[open] .md-chart--protein .md-bar")).toHaveLength(7);
    expect(document.querySelectorAll("dialog[open] .md-chart--protein .md-bar[data-missing]")).toHaveLength(4);
    expect(document.querySelector("dialog[open] .md-chart--protein .md-target")).not.toBeNull();
    // Protein bars are your logs: white, never Garmin blue.
    expect(getComputedStyle(document.querySelector("dialog[open] .md-chart--protein .md-fill")!).fill).not.toBe("rgb(57, 135, 229)");
    // Where it came from (FOOD-SOURCES-001), over the same days.
    await expect.poll(() => text(".md-source-row summary")).toContain("Protein (quick log)");
    await shot("protein-7d");

    await range("Last year, by week", "PROTEIN");
    await expect.poll(() => text("[data-md-hero]")).toBe("100 g a logged day, on average");

    await sheet("PROTEIN").getByRole("button", { name: "PROTEIN RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("protein");
  });

  it("PROTEIN's LOG PROTEIN opens the existing protein sheet", async () => {
    await seedLivedMonth();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein 48 .*explore records$/ }).click();
    await sheet("PROTEIN").getByRole("button", { name: "LOG PROTEIN", exact: true }).click();
    await expect.poll(() => window.history.state?.recordSheet).toBe("protein");
  });

  it("nothing spills, sentences keep 16 px, and PROTEIN passes axe from 320 to 1024 px", async () => {
    await seedLivedMonth(); await seedPastProtein();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein 48 .*explore records$/ }).click();
    await expect.poll(() => text("[data-md-hero]")).not.toBe("");
    for (const r of ["Today, this lived day", "Last 7 lived days", "Last 30 lived days", "Last year, by week"]) {
      await range(r, "PROTEIN");
      for (const width of [320, 412, 1024]) {
        await page.viewport(width, 900); await settle();
        const box = document.querySelector<HTMLElement>("dialog[open] .md")!;
        expect(box.scrollWidth, `${r} ${width}`).toBeLessThanOrEqual(box.clientWidth + 1);
        for (const button of box.querySelectorAll(".md-actions button, .md-ranges button")) {
          expect(parseFloat(getComputedStyle(button).fontSize), `${button.textContent} at ${width}`).toBeGreaterThanOrEqual(16);
          expect(button.getBoundingClientRect().height, `${button.textContent} at ${width}`).toBeGreaterThanOrEqual(44);
        }
      }
      await page.viewport(360, 900); await settle();
      const result = await axe.run(document.querySelector("dialog[open]")!, { runOnly: ["wcag2a", "wcag2aa"] });
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), r).toEqual([]);
    }
  });
});
