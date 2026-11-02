import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { readPresence } from "../../src/ui/presence";

/** PRESENCE-001: the same quiet mode line under every other screen's title; TODAY keeps its own. Invented data. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("says plainly when no day is started, and never invents a mode", async () => {
  expect(await readPresence()).toEqual({ mode: "NO DAY STARTED", when: null, next: null });
  await startDay();
  const p = await readPresence();
  expect(p?.mode).toMatch(/^(PREP|ON SHIFT|RECOVER|OFF DUTY|MODE NOT SET)$/);
});

it("shows on TRAIN and MORE, not on TODAY, at 360px with no overflow", async () => {
  await startDay();
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toBeVisible();
  expect(document.querySelector("#workspace-TODAY .cc-presence")).toBeNull();
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.poll(() => document.querySelector("#workspace-TRAIN .cc-presence")?.textContent ?? "").toMatch(/PREP|ON SHIFT|RECOVER|OFF DUTY|MODE NOT SET/);
  await screen.getByRole("button", { name: "MORE", exact: true }).click();
  await expect.poll(() => document.querySelector("#workspace-COMMAND .cc-presence")).not.toBeNull();
  expect((await axe.run(document.querySelector("#workspace-COMMAND .cc-presence")!)).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
});
