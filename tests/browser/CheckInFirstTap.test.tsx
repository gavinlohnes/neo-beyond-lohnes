import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";

/**
 * FLAKE-CHECKIN-001: TODAY's COMMS band used to arrive after first paint and push NEXT's CHECK IN
 * down by its own height, so a tap aimed at CHECK IN in that moment landed on whatever slid under it
 * (OwnerGo001 failed this way once in CI). The band now holds its place while its first read loads.
 */
const gate = vi.hoisted(() => ({ wait: null as Promise<void> | null }));
vi.mock("../../src/application/caveTonight", async (original) => {
  const actual = await original<typeof import("../../src/application/caveTonight")>();
  return { ...actual, getCaveTonight: async (...args: Parameters<typeof actual.getCaveTonight>) => { if (gate.wait) await gate.wait; return actual.getCaveTonight(...args); } };
});
afterEach(async () => { gate.wait = null; await cleanup(); vi.useRealTimers(); });

it("CHECK IN does not move when COMMS loads, and the first tap opens the sheet", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 15, 16, 40));
  await startDay();
  let release!: () => void;
  gate.wait = new Promise<void>((resolve) => { release = resolve; });
  const screen = await render(<App />);
  const checkIn = screen.getByRole("button", { name: "CHECK IN", exact: true });
  await expect.element(checkIn).toBeVisible();
  // The held place is decoration: not read, not tappable, and not mistaken for the band itself.
  expect(document.querySelector(".mode-header .comms-pending")?.getAttribute("aria-hidden")).toBe("true");
  expect(document.querySelector(".comms-line")).toBeNull();
  const before = checkIn.element().getBoundingClientRect().top;
  release();
  await expect.element(screen.getByRole("button", { name: /^Comms: / })).toBeVisible();
  expect(document.querySelector(".comms-pending")).toBeNull();
  expect(Math.abs(checkIn.element().getBoundingClientRect().top - before)).toBeLessThanOrEqual(1);
  await checkIn.click();
  await expect.element(screen.getByRole("dialog", { name: "CHECK IN", exact: true })).toBeVisible();
});

it("a failed COMMS read still frees its held place", async () => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 15, 16, 40));
  await startDay();
  gate.wait = Promise.reject(new Error("Transient read")); gate.wait.catch(() => {});
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "CHECK IN", exact: true })).toBeVisible();
  await expect.poll(() => document.querySelector(".comms-pending")).toBeNull();
  expect(document.querySelector(".comms-line")).toBeNull();
});
