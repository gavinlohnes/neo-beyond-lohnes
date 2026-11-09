/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** DATA-HOME-001: DATA opens like YOUR LIFE and MORE; shortcuts open DATA's existing views; nothing written. */
afterEach(async () => { await cleanup(); });

describe("DATA-HOME-001", () => {
  it("opens with YOUR NUMBERS., shortcuts open existing views, 16 px floor, fits 360 px, nothing written", async () => {
    await page.viewport(360, 780);
    await startDay();
    const before = await db.events.count();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "YOUR NUMBERS.", exact: true })).toBeVisible();
    const nav = screen.getByRole("navigation", { name: "DATA shortcuts" });
    for (const label of ["Weight", "Photos", "Measurements", "Whole picture", "Your rotation", "History"]) {
      await expect.element(nav.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    const small: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(".data-home")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim() && parseFloat(getComputedStyle(n.parentElement!).fontSize) < 16) small.push(n.textContent.trim());
    expect(small).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    // Each view shortcut opens its view, and BACK TO DATA returns to the top.
    for (const label of ["Weight", "Photos", "Measurements", "Whole picture"]) {
      await nav.getByRole("button", { name: label, exact: true }).click();
      const back = [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "BACK TO DATA" && b.offsetParent !== null);
      await expect.poll(() => [...document.querySelectorAll<HTMLButtonElement>("button")].some((b) => b.textContent === "BACK TO DATA" && b.offsetParent !== null), { timeout: 5000 }).toBe(true);
      ([...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "BACK TO DATA" && b.offsetParent !== null) ?? back)!.click();
      await expect.element(screen.getByRole("heading", { name: "YOUR NUMBERS.", exact: true })).toBeVisible();
    }
    expect(await db.events.count()).toBe(before);
  });
});
