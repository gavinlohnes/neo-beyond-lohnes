import { afterEach, expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { Signal } from "../../src/ui/components/Signal";
import { logProtein, setWorkContext, startDay } from "../../src/application/commands";
import { completeWorkout, startWorkout } from "../../src/application/trainCommands";
import { setAutoBackupPreferenceAndReset } from "../../src/application/autoBackupQueries";
import { db } from "../../src/persistence/db";
import { glitched, stopWatching, watchGlitches } from "./glitchWatch";

/** SUIT-001: exactly four glitch signals, each always with plain words, glitching once. */
let onLine = true;
const realOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine")!;
function setOnline(value: boolean) {
  onLine = value;
  Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => onLine });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}
afterEach(async () => {
  stopWatching();
  await cleanup();
  vi.useRealTimers();
  Object.defineProperty(Navigator.prototype, "onLine", realOnLine);
  await page.viewport(1280, 800);
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
});
const reduceMotion = () => cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
const glitching = (selector: string) => document.querySelector(selector)?.classList.contains("signal-glitch") ?? false;

function settle() { for (const animation of document.getAnimations()) animation.finish(); }

it("glitches once on first appearance and never replays on re-render", async () => {
  const screen = await render(<Signal data-signal="probe">Offline</Signal>);
  expect(glitching('[data-signal="probe"]')).toBe(true);
  settle();
  await expect.poll(() => glitching('[data-signal="probe"]')).toBe(false);
  await screen.rerender(<Signal data-signal="probe">Offline</Signal>);
  expect(glitching('[data-signal="probe"]')).toBe(false);
  expect(document.querySelector('[data-signal="probe"]')?.textContent).toBe("Offline");
});

it("shows offline in words on TODAY and SYSTEMS, glitches once, and keeps logging available", async () => {
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: /^Systems: / })).toBeVisible();
  expect(document.querySelector('[data-signal="offline-line"]')).toBeNull();
  watchGlitches();
  setOnline(false);
  await expect.element(screen.getByText("Offline. Logging still saves on this phone.", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /, Offline\. Open readout$/ })).toBeVisible();
  await expect.poll(() => glitched.has("offline-line")).toBe(true);
  settle();
  await expect.poll(() => glitching('[data-signal="offline-line"]')).toBe(false);
  window.dispatchEvent(new Event("offline"));
  await logProtein(day.id, 10); // a canonical write still lands while "offline"
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  expect(glitching('[data-signal="offline-line"]')).toBe(false);
  await expect.element(screen.getByRole("button", { name: "Log water in BODY" })).toBeEnabled();
  await screen.getByRole("button", { name: /^Systems: / }).click();
  const device = screen.getByRole("region", { name: "DEVICE" });
  await expect.element(device.getByText("Offline. Logging still saves on this phone.", { exact: true })).toBeVisible();
  setOnline(true);
  await expect.element(device.getByText("Online", { exact: true })).toBeVisible();
});

it("marks a backup overdue with the existing rule, on the line and in DEVICE", async () => {
  setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 7 });
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  watchGlitches();
  const screen = await render(<App />);
  await expect.element(screen.getByText("Backup due", { exact: true })).toBeVisible();
  await expect.poll(() => glitched.has("backup-line")).toBe(true);
  await expect.element(screen.getByRole("button", { name: /, No backup yet\. Open readout$/ })).toBeVisible();
  await screen.getByRole("button", { name: /^Systems: / }).click();
  const device = screen.getByRole("region", { name: "DEVICE" });
  await expect.element(device.getByText("None on record", { exact: true })).toBeVisible();
  await expect.element(device.getByText("Backup due. Export or share one from COMMAND.", { exact: true })).toBeVisible();
});

it("shows no signal on a healthy screen", async () => {
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  await render(<App />);
  await expect.poll(() => document.querySelector(".systems-line")).not.toBeNull();
  expect(document.querySelectorAll("[data-signal]")).toHaveLength(0);
  expect(document.querySelectorAll(".signal-glitch")).toHaveLength(0);
});

it("flags yesterday's numbers when a workout holds the day open, and REFRESH shows today's after it ends", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 15));
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); await logProtein(day.id, 30);
  const workout = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  vi.setSystemTime(new Date(2026, 9, 16, 16, 45));
  watchGlitches();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TODAY", exact: true }).click();
  await expect.element(screen.getByText("These are yesterday’s numbers.", { exact: true })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /Fuel 30 g, .*Yesterday’s numbers\. Open readout$/ })).toBeVisible();
  await expect.poll(() => glitched.has("stale-note")).toBe(true);
  await screen.getByRole("button", { name: "REFRESH", exact: true }).click();
  await expect.element(screen.getByText("These are yesterday’s numbers. A workout in progress holds yesterday open until it ends.", { exact: true })).toBeVisible();
  // REFRESH is the control being operated: it never glitches.
  expect(screen.getByRole("button", { name: "REFRESH", exact: true }).element().classList.contains("signal-glitch")).toBe(false);
  await completeWorkout(day.id, workout.id, "STANDARD", "COMPLETED", 40);
  await screen.getByRole("button", { name: "REFRESH", exact: true }).click();
  await expect.poll(() => document.querySelector('[data-signal="stale-note"]')).toBeNull();
  await expect.element(screen.getByRole("button", { name: /^Systems: .*Fuel 0 g/ })).toBeVisible();
  const days = await db.beyondDays.toArray();
  expect(days.filter((d) => d.status === "ACTIVE")).toHaveLength(1);
  expect(days.find((d) => d.status === "ACTIVE")!.id).not.toBe(day.id);
});

for (const width of [320, 360, 412]) it(`keeps every signal's words and no animation under reduced motion at ${width}px`, async () => {
  await page.viewport(width, 800);
  await reduceMotion();
  setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 7 });
  const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL");
  const screen = await render(<App />);
  setOnline(false);
  await expect.element(screen.getByText("Offline. Logging still saves on this phone.", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("Backup due", { exact: true })).toBeVisible();
  expect(document.querySelectorAll(".signal-glitch")).toHaveLength(0);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]);
});
