import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { logBodyweight, logWater, startDay } from "../../src/application/commands";
import { todaySettled } from "./helpers/todaySettled";

/** GRAYSON C9.2 (Quiet Command finish), DATA home: the shortcuts sit under a VIEWS rule and History wears the
 *  panel frame. Same buttons, same order; no overflow at 320–412 px; no axe violations. */
afterEach(() => cleanup());

async function openData() {
  const day = await startDay();
  await logBodyweight(day.id, 205); await logWater(day.id, 32);
  const screen = await render(<App />); await todaySettled();
  await screen.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "DATA", exact: true }).click();
  await expect.element(screen.getByRole("navigation", { name: "DATA shortcuts" })).toBeVisible();
  return screen;
}

describe("C9.2 DATA home", () => {
  it("frames the shortcuts in one VIEWS panel, keeping every shortcut in order", async () => {
    await page.viewport(360, 800);
    const screen = await openData();
    const views = screen.getByRole("region", { name: "VIEWS" });
    await expect.element(views).toBeVisible();
    const labels = [...views.element().querySelectorAll("nav button")].map((b) => b.textContent);
    expect(labels).toEqual(["Weight", "Training records", "Photos", "Measurements", "Whole picture", "Your rotation", "History"].filter((l) => labels.includes(l)));
    for (const l of ["Weight", "Photos", "Measurements", "Whole picture", "Your rotation", "History"]) expect(labels).toContain(l);
    for (const b of views.element().querySelectorAll("nav button")) expect((b as HTMLElement).getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const history = document.querySelector('section[aria-label="History"]')!;
    expect(history.classList.contains("bf-panel")).toBe(true);
    await expect.element(screen.getByRole("heading", { name: "HISTORY", exact: true })).toBeInTheDocument();
  });

  for (const width of [320, 360, 412]) {
    it(`has no horizontal overflow and no axe violations at ${width}px`, async () => {
      await page.viewport(width, 800);
      const screen = await openData();
      for (const el of [document.querySelector(".data-home__views"), document.querySelector(".data-history")]) {
        const r = (el as HTMLElement).getBoundingClientRect();
        expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(width);
      }
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
      const scope = { include: [[".data-home__views"], [".data-history"]] } as unknown as axe.ElementContext;
      expect((await axe.run(scope, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
      void screen;
    });
  }
});
