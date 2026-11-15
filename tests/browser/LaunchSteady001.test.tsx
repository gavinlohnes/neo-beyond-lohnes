import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";

/**
 * LAUNCH-STEADY-001 (Gavin, 2026-11-15: "when beyond first launch it kind of flashes between screens"): on first
 * launch TODAY drew "Mode not set" and START DAY before the day had been read, then jumped to the real mode. It now
 * shows a quiet reading frame until the first read settles, so a wrong state is never drawn.
 */
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 14, 19, 26)); try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

/** Every text TODAY shows while it loads, caught on each DOM change from before the first render. */
function watchTexts() {
  const seen = new Set<string>();
  const note = () => { for (const el of document.querySelectorAll(".redesign-today h2, .redesign-today button, .redesign-today [role=status]")) seen.add(el.textContent?.trim() ?? ""); };
  const observer = new MutationObserver(note);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  return { seen, stop: () => { note(); observer.disconnect(); } };
}

it("with a day under way, first launch never draws 'Mode not set' or START DAY on its way to the day", async () => {
  await startDay();
  await page.viewport(412, 900);
  const watch = watchTexts();
  render(<App />);
  await expect.element(page.getByRole("region", { name: "Day mode" })).toBeVisible();
  watch.stop();
  expect([...watch.seen].filter((t) => /Mode not set|START DAY|Start your/i.test(t))).toEqual([]);
  // The reading frame is what showed in the meantime, and it's gone now.
  expect(document.querySelector("[aria-label='Reading today']")).toBeNull();
});

it("with no day, START DAY still appears once the read settles", async () => {
  await page.viewport(412, 900);
  const screen = await render(<App />);
  await expect.element(screen.getByRole("heading", { name: "Mode not set" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "START DAY" }).first()).toBeVisible();
});

it("the free brief's label and hint don't run together", async () => {
  await startDay();
  await page.viewport(412, 900);
  render(<App />);
  await expect.poll(() => document.querySelector(".support-disclosure__hint")).not.toBeNull();
  const hint = document.querySelector<HTMLElement>(".support-disclosure__hint")!;
  expect(parseFloat(getComputedStyle(hint).marginInlineStart)).toBeGreaterThan(0);
});
