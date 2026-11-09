/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";

/** TRAIN-HOME-001: TRAIN opens like the other screens, compactly: START WORKOUT stays on the first phone screen. */
afterEach(async () => { await cleanup(); });

describe("TRAIN-HOME-001", () => {
  it("shows YOUR TRAINING. with START WORKOUT still on the first screen at 360px", async () => {
    const [w, h] = [360, 780];
    await page.viewport(w, h);
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "YOUR TRAINING.", exact: true })).toBeVisible();
    await expect.element(screen.getByText("Prepare your workout. You choose the session.", { exact: true })).toBeVisible();
    // The workout card appears once TRAIN's read settles; wait for it before measuring.
    const startButton = screen.getByRole("button", { name: /^START WORKOUT/ }).first();
    await expect.element(startButton).toBeVisible();
    for (const a of document.getAnimations()) a.finish();
    const start = startButton.element().getBoundingClientRect();
    const nav = document.querySelector("nav.bottom-nav, nav[aria-label='Main']")?.getBoundingClientRect();
    expect(start.bottom).toBeLessThanOrEqual(nav ? nav.top : h);
    const small: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(".train-home")!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent?.trim() && parseFloat(getComputedStyle(n.parentElement!).fontSize) < 16) small.push(n.textContent.trim());
    expect(small).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w);
  });
});
