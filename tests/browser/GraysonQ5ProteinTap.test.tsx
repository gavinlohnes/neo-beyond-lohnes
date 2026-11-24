import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { logProtein, startDay } from "../../src/application/commands";
import { createSavedMeal, logMeal } from "../../src/application/nutritionCommands";

/**
 * GRAYSON-Q5-PROTEIN-TAP-001 (Gavin, 2026-11-23: "I approve. Let's get started"): on DATA's NUTRITION card, the Protein
 * meter opens the protein page, the way the card's open button already opens calories. Synthetic data only.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const card = () => document.querySelector<HTMLElement>('[data-dash="nutrition"]');
const measure = () => document.querySelector<HTMLSelectElement>("#insight-measure")?.value ?? null;
const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).offsetParent !== null;
const settle = async () => {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
async function aa(label: string) {
  await settle();
  const r = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function seed(withProtein = true) {
  vi.setSystemTime(new Date(2026, 10, 18, 18, 2)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 10, 18, 19));
  const meal = await createSavedMeal({ name: "Chicken and rice", calories: 640, proteinG: withProtein ? 48 : 0, carbsG: 70, fatG: 14 });
  await logMeal(day.id, meal.id);
  if (withProtein) await logProtein(day.id, 30);
  vi.setSystemTime(new Date(2026, 10, 18, 20));
}
async function openData() {
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();
  await expect.poll(() => card()?.textContent ?? "").toMatch(/Eaten640 kcal/);
  return screen;
}
const proteinButton = () => card()?.querySelector<HTMLButtonElement>("button.bf-meter") ?? null;
async function backToData() {
  await expect.poll(() => [...document.querySelectorAll<HTMLButtonElement>("button")].some((b) => b.textContent === "BACK TO DATA" && visible(b))).toBe(true);
  [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "BACK TO DATA" && visible(b))!.click();
  await expect.poll(() => visible(card())).toBe(true);
}

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-Q5-PROTEIN-TAP-001", () => {
  it("a tap on the Protein meter opens the protein page; the card's open button still opens calories", async () => {
    await page.viewport(360, 800);
    await seed();
    const screen = await openData();
    await expect.poll(() => card()!.textContent).toMatch(/Protein78( \/ \d+)? g/);
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-nutrition-360.png`, element: card()! }); }
    await aa("dashboard with protein meter");

    const protein = screen.getByRole("button", { name: /^Protein\s*78\b.*\bg\s*,\s*open protein page$/ });
    await expect.element(protein).toBeVisible();
    await protein.click();
    await expect.poll(measure).toBe("protein");
    await expect.poll(() => document.querySelector("[data-food-sources]")?.getAttribute("data-food-sources") ?? null).toBe("protein");
    await expect.poll(() => document.activeElement?.id).toBe("health-progress-heading");
    if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/after-protein-page-360.png` }); }
    await aa("protein page");

    // No regression: the card's open button opens calories, as before.
    await backToData();
    await screen.getByRole("button", { name: "Open nutrition history" }).click();
    await expect.poll(measure).toBe("calories");
    await expect.poll(() => document.querySelector("[data-food-sources]")?.getAttribute("data-food-sources") ?? null).toBe("calories");
  }, 60_000);

  it("opens from the keyboard (Enter and Space), with a visible focus ring", async () => {
    await page.viewport(360, 800);
    await seed();
    await openData();
    const button = proteinButton()!;
    expect(button).not.toBeNull();
    // Real keyboard travel: from the card's "Log food" action, Tab lands on the Protein meter (Eaten is not a control).
    card()!.querySelector<HTMLButtonElement>('button[aria-label="Log food"]')!.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(button);
    expect(button.matches(":focus-visible")).toBe(true);
    expect(getComputedStyle(button).outlineStyle).not.toBe("none");
    await userEvent.keyboard("{Enter}");
    await expect.poll(measure).toBe("protein");
    await backToData();
    proteinButton()!.focus();
    await userEvent.keyboard(" ");
    await expect.poll(measure).toBe("protein");
  }, 60_000);

  it("is a full 44 px target with no overflow at 320, 360 and 412 px, and axe stays clean", async () => {
    await seed();
    await page.viewport(320, 800);
    await openData();
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 800); await settle();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-nutrition-${width}.png`, element: card()! });
      const rect = proteinButton()!.getBoundingClientRect();
      expect(rect.height, `${width} height`).toBeGreaterThanOrEqual(44);
      expect(rect.width, `${width} width`).toBeGreaterThanOrEqual(44);
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
      expect(card()!.scrollWidth, `${width} card`).toBeLessThanOrEqual(card()!.clientWidth + 1);
      for (const el of proteinButton()!.querySelectorAll<HTMLElement>("span, b")) {
        const t = el.textContent?.trim();
        if (t && el.getClientRects().length) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${t}`).toBeGreaterThanOrEqual(16);
      }
      await aa(`dashboard ${width}`);
    }
  }, 60_000);

  it("never invents: no protein recorded means no protein meter to tap", async () => {
    await page.viewport(360, 800);
    await seed(false);
    const screen = await openData();
    expect(card()!.textContent).not.toMatch(/Protein/);
    expect(proteinButton()).toBeNull();
    expect(screen.getByRole("button", { name: /open protein page/ }).elements()).toHaveLength(0);
  });
});
