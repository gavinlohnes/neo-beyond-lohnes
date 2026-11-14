import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";

/**
 * SHORTCUT-GRID-001 (Gavin, 2026-11-14): DATA's and MORE's shortcut grids keep two readable columns inside the
 * phone-width app at every window width, and YOUR LIFE's six one-word areas stay three across (two when very narrow):
 * columns follow the area's own width, not the window's. No label breaks inside a word; every shortcut is a reachable,
 * touch-sized button.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => { try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); });

/** Let entry fades finish (a mid-fade colour isn't the real contrast), then axe the grid. */
async function axeGrid(el: Element, label: string) {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  expect((await axe.run(el, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id), label).toEqual([]);
}
function checkGrid(nav: HTMLElement, label: string) {
  const columns = getComputedStyle(nav).gridTemplateColumns.split(" ").length;
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
  // A label is broken inside a word when one of its words is split across lines: each word's box must sit on one line.
  const brokenWords: string[] = [];
  for (const b of buttons) {
    const textNode = [...b.querySelectorAll("*"), b].flatMap((el) => [...el.childNodes]).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
    if (!textNode) continue;
    const text = textNode.textContent!;
    let i = 0;
    for (const word of text.split(/(\s+)/)) {
      if (word.trim()) {
        const range = document.createRange(); range.setStart(textNode, i); range.setEnd(textNode, i + word.length);
        const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
        if (tops.size > 1) brokenWords.push(word);
      }
      i += word.length;
    }
  }
  const small = buttons.filter((b) => b.getBoundingClientRect().height < 40).map((b) => b.textContent);
  const unreachable = buttons.filter((b) => b.disabled || b.tabIndex < 0).map((b) => b.textContent);
  // Phone-width areas (DATA, MORE, and YOUR LIFE on a phone) are always two columns; a genuinely wide area (YOUR LIFE's
  // own wide layout on a tablet) may take three, as long as every cell stays readable.
  const width = nav.getBoundingClientRect().width;
  // DATA and MORE: two columns at phone width. YOUR LIFE: its short one-word areas three across (two when very narrow).
  const isLife = nav.getAttribute("aria-label") === "Life shortcuts";
  const expectedColumns = isLife ? (width < 300 ? 2 : width < 1000 ? 3 : 6) : width < 700 ? 2 : 4;
  const narrowCells = columns > 0 && width / columns < (isLife ? 90 : 140);
  expect({ columns, narrowCells, brokenWords, small, unreachable }, label).toEqual({ columns: expectedColumns, narrowCells: false, brokenWords: [], small: [], unreachable: [] });
  expect(document.documentElement.scrollWidth, label).toBeLessThanOrEqual(window.innerWidth);
}

for (const width of [320, 360, 412, 768, 1024]) {
  it(`DATA, MORE and YOUR LIFE shortcuts stay two readable columns at ${width} px`, async () => {
    await page.viewport(width, 900);
    await startDay();
    const screen = await render(<App />);
    // DATA
    await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
    const data = screen.getByRole("navigation", { name: "DATA shortcuts" });
    await expect.element(data).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/data-${width}.png`, element: data.element() });
    checkGrid(data.element() as HTMLElement, `DATA ${width}`);
    await axeGrid(data.element(), `axe DATA ${width}`);
    // MORE
    await screen.getByRole("navigation").getByRole("button", { name: "MORE", exact: true }).click();
    const more = screen.getByRole("navigation", { name: "MORE areas" });
    await expect.element(more).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/more-${width}.png`, element: more.element() });
    checkGrid(more.element() as HTMLElement, `MORE ${width}`);
    await axeGrid(more.element(), `axe MORE ${width}`);
    // YOUR LIFE (from TODAY)
    await screen.getByRole("navigation").getByRole("button", { name: "TODAY", exact: true }).click();
    await screen.getByRole("button", { name: "Open your life" }).first().click();
    const life = screen.getByRole("navigation", { name: "Life shortcuts" });
    await expect.element(life).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/life-${width}.png`, element: life.element() });
    checkGrid(life.element() as HTMLElement, `LIFE ${width}`);
    await axeGrid(life.element(), `axe LIFE ${width}`);
  });
}
