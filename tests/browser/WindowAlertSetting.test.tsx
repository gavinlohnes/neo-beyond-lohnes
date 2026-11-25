import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { KeyMomentAlerts } from "../../src/ui/screens/more/KeyMomentAlerts";

/**
 * GRAYSON-WINDOW-ALERT-001: "Eating window opens" has its own switch in Key-moment alerts, and the notification's tap
 * (?alfred=meal) opens Delta with "I ate " ready, sending nothing. Invented data.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  await setKeyMomentAlerts({ off: [], quietFrom: null, quietTo: null });
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });

describe("GRAYSON-WINDOW-ALERT-001", () => {
  it("the row shows, says it waits, toggles by keyboard and saves; fits 320/360/412, axe clean", async () => {
    await page.viewport(360, 1100);
    const screen = await render(<KeyMomentAlerts />);
    const toggle = screen.getByRole("button", { name: "Eating window opens alert", exact: true });
    await expect.element(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.element(screen.getByText(/Lowest priority: on a day with three other alerts, this one waits\./)).toBeVisible();
    const root = screen.container as HTMLElement;
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 1100);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      expect(document.documentElement.scrollWidth, `${width}`).toBeLessThanOrEqual(width);
      for (const b of root.querySelectorAll<HTMLElement>("button")) expect(b.getBoundingClientRect().height, `${width} ${b.textContent}`).toBeGreaterThanOrEqual(44);
      for (const p of root.querySelectorAll<HTMLElement>(".meta")) expect(parseFloat(getComputedStyle(p).fontSize)).toBeGreaterThanOrEqual(16);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-key-moment-alerts-${width}.png`, element: root });
    }
    expect((await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    (toggle.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(toggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await getKeyMomentAlerts()).off).toEqual(["WINDOW_OPEN"]);
    await userEvent.keyboard(" ");
    await expect.poll(async () => (await getKeyMomentAlerts()).off).toEqual([]);
  });

  it("?alfred=meal opens Delta with \"I ate \", sends nothing, then clears the query", async () => {
    localStorage.setItem("beyond.alfredKey", "sk-ant-test-window");
    vi.spyOn(window, "fetch").mockRejectedValue(new TypeError("offline"));
    window.history.replaceState(null, "", `${window.location.pathname}?alfred=meal`);
    await page.viewport(360, 800);
    const screen = await render(<App />);
    const box = screen.getByRole("dialog", { name: "ALFRED" }).getByRole("textbox", { name: "Message Alfred" });
    await expect.element(box).toHaveValue("I ate ");
    await expect.poll(() => window.location.search).toBe("");
    await new Promise((r) => setTimeout(r, 300));
    expect(vi.mocked(window.fetch).mock.calls.some(([, i]) => /"(content|text)":"I ate/.test(String((i as RequestInit | undefined)?.body ?? "")))).toBe(false);
    expect((await axe.run(screen.getByRole("dialog", { name: "ALFRED" }).element(), { runOnly: ["wcag2a", "wcag2aa"] })).violations.map((v) => v.id)).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-delta-from-alert-360.png` });
  });
});
