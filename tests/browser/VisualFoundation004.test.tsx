import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { seedLivedMonth, MONTH_NOW } from "./helpers/livedMonth";

/**
 * VISUAL-FOUNDATION-004 (Gavin, 2026-11-14: "Let's get to work. Amaze me"): MORE and THE CAVE on the foundation.
 * MORE opens on the command bar (MORE // SYSTEMS, the date, its purpose line), with the same two actions; each system's
 * status is a framed panel. The cave's head is a command bar with the emblem in its locked place, its views are
 * mono-capital tabs with the chosen one in red, and each block of every view is a framed panel. Nothing collides or
 * spills from 320 to 1024 px, sentences keep the 16 px rule, and every view passes axe.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const VIEWS = ["tonight", "route", "brief", "vitals", "file", "log", "month"] as const;
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(MONTH_NOW); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};

function check(root: Element, label: string) {
  const panels = [...root.querySelectorAll<HTMLElement>(".sys-card, .cave__block, .cave__route, .log__list, .brief__poll, .brief__aar, .cave__head, .bf-bar, .cave__tab")];
  const spill = panels.filter((p) => p.getClientRects().length && p.scrollWidth > p.clientWidth + 1).map((p) => p.className);
  const small: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent?.trim(), el = n.parentElement!;
    // FILE's dense data table, MONTH's day grid and REVIEW's embedded rotation map keep their compact chart/table labels in this slice
    // (VISUAL-FOUNDATION-004 records the exception).
    if (!t || el.closest(".visually-hidden, dialog, [hidden], svg, .file__run, .rotation, .month__grid") || !el.getClientRects().length) continue;
    // Review of #518: buttons and inputs never count as labels; they are 16 px or larger.
    const cs = getComputedStyle(el), size = parseFloat(cs.fontSize), isLabel = !el.closest("button, input, select, textarea") && (t === t.toUpperCase() || cs.textTransform === "uppercase") && t.length <= 32;
    if (size < (isLabel ? 10 : 16)) small.push(`${t} (${size}px)`);
  }
  expect({ spill, small, pageWidth: document.documentElement.scrollWidth <= window.innerWidth }, label).toEqual({ spill: [], small: [], pageWidth: true });
}
async function aa(root: Element, label: string) {
  await settle();
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

it("MORE opens on the command bar with its actions, and each system's status is a framed panel", async () => {
  await seedLivedMonth();
  await page.viewport(360, 1400);
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "MORE", exact: true }).click();
  await expect.element(screen.getByRole("article", { name: "Garmin" })).toBeVisible();
  const home = document.querySelector(".sys-home")!;
  expect(home.querySelector(".bf-bar")!.textContent).toContain("MORE // SYSTEMS");
  expect(home.querySelector("[data-more-day]")!.textContent).toBe("WED, OCT 21");
  expect(home.querySelector(".bf-bar__log")).toBeNull();
  await expect.element(screen.getByRole("button", { name: "Back up my data", exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Find anything", exact: true })).toBeVisible();
  for (const card of home.querySelectorAll(".sys-card")) expect(getComputedStyle(card).clipPath).toContain("polygon");
  for (const width of [320, 360, 412, 768, 1024]) {
    await page.viewport(width, 1400); await settle();
    check(home, `MORE ${width}`);
    // Wide windows still contain MORE in the phone-width shell: columns follow the status container, not the viewport.
    const status = home.querySelector<HTMLElement>(".sys-section--status")!;
    const cards = status.querySelector<HTMLElement>(".sys-cards")!;
    expect(getComputedStyle(cards).gridTemplateColumns.trim().split(/\s+/).length, `status columns at viewport ${width}`)
      .toBe(status.clientWidth >= 560 ? 2 : 1);
    if (SHOTS && (width === 360 || width === 1024)) await page.screenshot({ path: `${SHOTS}/more-${width}.png` });
  }
  await aa(home, "MORE");
});

it("THE CAVE: a command-bar head, red chosen view, framed blocks in every view, from 320 to 1024 px", async () => {
  await seedLivedMonth();
  await page.viewport(360, 1600);
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: /THE CAVE/ })).toBeInTheDocument();
  const cave = document.querySelector<HTMLElement>(".cave")!;
  const head = cave.querySelector(".cave__head")!;
  expect(getComputedStyle(head).borderLeftWidth).toBe("2px");
  expect(head.querySelector(".cave__bat")).not.toBeNull(); // the emblem stays in its locked cave-heading place
  for (const view of VIEWS) {
    cave.querySelector<HTMLButtonElement>(`[data-cave-tab="${view}"]`)!.click();
    await expect.poll(() => cave.querySelector(`[data-cave-tab="${view}"]`)!.getAttribute("aria-pressed")).toBe("true");
    await expect.poll(() => cave.querySelectorAll(".cave__block, .cave__route, .log__list, .brief__poll, .brief__aar").length, { message: view }).toBeGreaterThan(0);
    const pressed = cave.querySelector(`[data-cave-tab="${view}"]`)!;
    expect(getComputedStyle(pressed).borderBottomColor, view).not.toBe(getComputedStyle(cave.querySelector('[aria-pressed="false"]')!).borderBottomColor);
    const top = [...cave.querySelectorAll(".cave__block, .cave__route, .log__list, .brief__poll, .brief__aar")].filter((b) => !b.parentElement!.closest(".cave__block"));
    for (const b of top) expect(getComputedStyle(b).clipPath, view).toContain("polygon");
    for (const width of [320, 360, 1024]) {
      await page.viewport(width, 1600); await settle();
      check(cave, `${view} ${width}`);
    }
    await page.viewport(360, 1600);
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/cave-${view}.png`, element: cave }); }
    await aa(cave, view);
  }
});
