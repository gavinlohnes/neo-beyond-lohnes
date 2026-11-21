/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/**
 * TRAIN-HOME-001: TRAIN opens like the other screens, compactly: START WORKOUT stays on the first phone screen.
 * VISUAL-FOUNDATION-002: the hero is now the foundation's command bar; the heading stays for screen readers.
 */
afterEach(async () => { await cleanup(); });

describe("TRAIN-HOME-001", () => {
  it("opens on the TRAIN // STRENGTH command bar with START WORKOUT still on the first screen at 360px", async () => {
    const [w, h] = [360, 780];
    await page.viewport(w, h);
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "YOUR TRAINING.", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("TRAIN // STRENGTH", { exact: false })).toBeVisible();
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
    // Accessibility (amended 2026-11-14): sentences stay 16 px or larger; only short mono-capital labels (the eyebrow,
    // the date) may be smaller, and never under 10 px. The visually hidden heading isn't rendered text.
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent?.trim(), el = n.parentElement!;
      if (!t || el.closest(".visually-hidden")) continue;
      const size = parseFloat(getComputedStyle(el).fontSize), label = t === t.toUpperCase() && t.length <= 24;
      if (size < (label ? 10 : 16)) small.push(t);
    }
    expect(small).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(w);
  });

  it("opens and closes the calibration preview without starting or writing a workout", async () => {
    await page.viewport(360, 780);
    await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
    const beforeEvents = await db.events.count();
    const beforeSessions = await db.workoutSessions.count();
    const trigger = screen.getByRole("button", { name: "PREVIEW CALIBRATION" });
    await trigger.click();
    await expect.element(screen.getByRole("dialog", { name: "Machine Chest Press" })).toBeVisible();
    expect([...document.querySelector(".calibration-preview")!.parentElement!.children]
      .filter((element) => !element.classList.contains("calibration-preview"))
      .every((element) => (element as HTMLElement).inert)).toBe(true);
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    await expect.element(screen.getByRole("button", { name: "CLOSE" })).toHaveFocus();
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    await expect.element(screen.getByRole("button", { name: "CONTINUE" })).toHaveFocus();
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect.element(trigger).toHaveFocus();
    await trigger.click();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await screen.getByRole("button", { name: "CONTINUE" }).click();
    await expect.element(screen.getByText(/No comparable performance found/)).toBeVisible();
    await screen.getByRole("button", { name: "CLOSE" }).click();
    await expect.element(trigger).toHaveFocus();
    await expect.element(screen.getByRole("button", { name: /^START WORKOUT/ }).first()).toBeVisible();
    expect(await db.events.count()).toBe(beforeEvents);
    expect(await db.workoutSessions.count()).toBe(beforeSessions);
  });
});
