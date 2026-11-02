import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logWater, startDay } from "../../src/application/commands";

/** FREE-BRIEF-001: with no Alfred key, TODAY's closed support entry is the free brief; nothing is fetched. */
beforeEach(async () => { localStorage.clear(); await page.viewport(360, 800); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows the free brief, closed, below the action; opening it costs nothing", async () => {
  const fetchSpy = vi.spyOn(window, "fetch");
  const day = await startDay(); await logWater(day.id, 24);
  const screen = await render(<App />);
  const summary = screen.getByText("Free · from your records", { exact: true });
  await expect.element(summary).toBeVisible();
  const details = document.querySelector<HTMLDetailsElement>("#workspace-TODAY .alfred-support")!;
  expect(details.open).toBe(false);
  await summary.click();
  await expect.element(screen.getByText(/So far today: no food logged, 24 oz water\./)).toBeVisible();
  expect(fetchSpy.mock.calls.filter(([u]) => String(u).includes("anthropic"))).toHaveLength(0);
  expect((await axe.run(details, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});
