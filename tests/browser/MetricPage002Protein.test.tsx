import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { logProtein } from "../../src/application/commands";
import { seedLivedMonth, MONTH_FIRST_DAY, MONTH_NOW } from "./helpers/livedMonth";

/**
 * METRIC-PAGE-002 slice 2 (Gavin 2026-11-18: "2", "Let's work", "Will you give it to Claude code to do"): PROTEIN
 * joins the shared metric page. Your logs (white), meals and protein entries alike; TODAY steps up at each log; weeks
 * are the mean of logged days; the target is a line and a sentence, never a deficit or "remaining"; records and LOG stay
 * on protein's own routes. Synthetic data only (BODY-DASH-001's month: today's 48 g meal, latest weigh-in 205.2 lb, so
 * the default 1.0 g per lb target is 205 g), plus protein logged on three past lived days below.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
const sheet = () => page.getByRole("dialog", { name: "PROTEIN", exact: true });
const text = (sel: string) => document.querySelector(`dialog[open] ${sel}`)?.textContent ?? "";
const range = (label: string) => sheet().getByRole("button", { name: label, exact: true }).click();
const shot = async (name: string) => { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/metric-protein-${name}.png`, element: document.querySelector("dialog[open]") as HTMLElement }); } };

/** The month, plus 120 g, 150 g and 130 g on lived days 20, 24 and 27. */
async function seedProteinMonth() {
  await seedLivedMonth();
  const days = (await db.beyondDays.toArray()).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const [i, g] of [[20, 120], [24, 150], [27, 130]] as const) {
    vi.setSystemTime(MONTH_FIRST_DAY + i * 86_400_000 + 4 * 3_600_000); await logProtein(days[i]!.id, g);
  }
  vi.setSystemTime(MONTH_NOW);
}
const openFromToday = async () => {
  await page.viewport(360, 800);
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /^Protein 48 \/ 205 g/ }).click();
  await expect.element(sheet()).toBeVisible();
  return screen;
};

describe("METRIC-PAGE-002 slice 2: protein", () => {
  it("TODAY's PROTEIN opens PROTEIN: your logs stepping up today, the target as a target, honest gaps, and what it came from", async () => {
    await seedProteinMonth();
    const screen = await openFromToday();
    await expect.poll(() => text("[data-md-hero]")).toMatch(/^48 g so far · since \d\d:\d\d$/);
    expect(text(".md-source")).toContain("LOGGED");
    expect(text(".md-source")).toContain("meals and protein entries");
    expect(document.querySelector("dialog[open] .bf-src--garmin")).toBeNull();
    expect([...document.querySelectorAll("dialog[open] .md-ranges button")].map((b) => b.textContent)).toEqual(["TODAY", "7D", "30D", "1Y"]);
    // TODAY: a running total that steps up at the meal, and the target as a labelled line.
    expect(document.querySelector('dialog[open] .md-chart--protein[aria-label^="Protein so far: 48 g"]')?.getAttribute("aria-label")).toContain("target 205 g");
    expect(document.querySelector("dialog[open] .md-chart--protein .md-target")).not.toBeNull();
    expect(text("[data-md-target]")).toBe("Your protein target: 205 g a day, the solid line.");
    // A target, never a deficit or what's left.
    expect(text(".md")).not.toMatch(/remaining|left to|deficit|short by|to go/i);
    await shot("today");

    // 7D: logged days only, the rest left out as missing, never zero.
    await range("Last 7 lived days");
    await expect.poll(() => text("[data-md-coverage]")).toContain("2 of 6 finished days logged · 4 not logged, left out");
    expect(text("[data-md-hero]")).toBe("140 g a day, on average"); // (150 + 130) / 2
    expect(document.querySelectorAll("dialog[open] .md-chart--protein .md-bar")).toHaveLength(7);
    expect(document.querySelectorAll("dialog[open] .md-chart--protein .md-bar[data-missing]")).toHaveLength(4);
    expect(document.querySelector("dialog[open] .md-chart--protein .md-target")).not.toBeNull();
    // Bars are your logs: white, never Garmin blue.
    expect(getComputedStyle(document.querySelector("dialog[open] .md-chart--protein rect.md-fill")!).fill).not.toBe("rgb(57, 135, 229)");
    // What it came from: FoodSources, as on calories.
    await expect.poll(() => document.querySelector('dialog[open] [data-food-sources="protein"]')?.textContent ?? "").toContain("WHERE IT CAME FROM · 7 DAYS");
    await shot("7d");

    // 30D and 1Y: the mean of logged days.
    await range("Last 30 lived days");
    await expect.poll(() => text("[data-md-coverage]")).toContain("3 of 29 finished days logged");
    expect(text("[data-md-hero]")).toBe("133 g a day, on average"); // (120 + 150 + 130) / 3
    await range("Last year, by week");
    await expect.poll(() => text("[data-md-hero]")).toBe("133 g a logged day, on average");
    expect(text("[data-md-usual]")).toMatch(/Your usual appears after 14 logged days \(3 so far\)/);

    // The records (where corrections live) are one tap further, where the tile used to go.
    await sheet().getByRole("button", { name: "PROTEIN RECORDS", exact: true }).click();
    await expect.element(screen.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true })).toHaveValue("protein");
  });

  it("PROTEIN's LOG PROTEIN opens the existing protein sheet", async () => {
    await seedProteinMonth();
    await openFromToday();
    await sheet().getByRole("button", { name: "LOG PROTEIN", exact: true }).click();
    await expect.poll(() => window.history.state?.recordSheet).toBe("protein");
  });

  it("with nothing logged today it says so plainly; with no weigh-in it names no target", async () => {
    await seedLivedMonth();
    await db.events.where("type").anyOf("MEAL_LOGGED", "BODYWEIGHT_LOGGED").delete();
    await page.viewport(360, 800);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein 0 g/ }).click();
    await expect.poll(() => text("[data-md-hero]")).toBe("— not logged yet this lived day");
    expect(text(".md")).toContain("No protein logged yet this lived day.");
    expect(document.querySelector("dialog[open] .md-chart--protein")).toBeNull();
    expect(text("[data-md-target]")).toBe("No protein target yet. It comes from your grams per pound and your latest weigh-in.");
  });

  it("nothing spills, sentences keep 16 px, and PROTEIN passes axe from 320 to 1024 px", async () => {
    await seedProteinMonth();
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /^Protein 48 \/ 205 g/ }).click();
    await expect.poll(() => text("[data-md-hero]")).not.toBe("");
    for (const r of ["Today, this lived day", "Last 7 lived days", "Last 30 lived days", "Last year, by week"]) {
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
          if (!t || el.closest("svg, .visually-hidden, details:not([open]) table, details:not([open]) .md-source-row__days") || !el.getClientRects().length) continue;
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
