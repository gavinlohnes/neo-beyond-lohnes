/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { logSet, startRest, startWorkout } from "../../src/application/trainCommands";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { openCommandPanel } from "./helpers/command";

/**
 * GRAYSON-TRAIN-REST-001: one buzz when rest reaches zero, with TRAIN open. Only Date is faked; TRAIN's real 1 s rest
 * tick notices the crossing. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
let clock = new Date(2026, 10, 24, 18).getTime();
const advance = (seconds: number) => { clock += seconds * 1000; vi.setSystemTime(clock); };
const SHORT = [200, 100, 200];

async function settle(ms = 50) { await new Promise<void>((r) => setTimeout(r, ms)); }
async function shot(name: string, el: Element | null) {
  if (!SHOTS || !el) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement });
}
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string, root: Element, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle(100);
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name && width !== 360) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}
async function resting() {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const session = await startWorkout(day.id, "A", "STANDARD");
  await logSet(day.id, session.id, "machine-chest-press", 1, 100, 8);
  await startRest(session.id, 90);
  return { day, session };
}
const restBlock = () => [...document.querySelectorAll(".equipment-row")].find((e) => /REST(ING| COMPLETE)/.test(e.textContent ?? "")) ?? null;
const restBuzzes = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter((c) => JSON.stringify(c[0]) === JSON.stringify(SHORT) || JSON.stringify(c[0]) === "[400,150,400]").length;

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 10, 24, 18).getTime();
  vi.setSystemTime(clock);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await cdp().send("Emulation.setEmulatedMedia", { features: [] });
});

describe("GRAYSON-TRAIN-REST-001 buzz when rest ends", () => {
  it("buzzes once at zero with an announcement, +15 after zero buzzes once more, and the widget switch silences it", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    const { session } = await resting();
    const screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("RESTING", { exact: true })).toBeVisible();
    const toggle = screen.getByRole("button", { name: "Buzz when rest ends: On" });
    await expect.element(toggle).toBeVisible();
    await axeClean("rest widget", restBlock()!);
    await shot("360-rest-widget-with-switch", restBlock());
    await noOverflow("rest widget", restBlock()!, "rest-widget-with-switch");

    advance(90);
    await expect.poll(() => restBuzzes(vibrate), { timeout: 3000 }).toBe(1);
    expect(vibrate).toHaveBeenLastCalledWith(SHORT);
    await expect.poll(() => document.querySelector(".train-rest-done")).not.toBeNull();
    await expect.poll(() => [...document.querySelectorAll('[role="status"]')].some((e) => e.textContent === "Rest complete.")).toBe(true);
    await shot("360-rest-complete-highlight", restBlock());
    await settle(2200);
    expect(restBuzzes(vibrate)).toBe(1); // once per rest, never repeated

    // +15 after zero: a new end, which buzzes once.
    const plus = screen.getByRole("button", { name: "Add 15 seconds to rest" });
    if (!plus.elements().length) await screen.getByRole("button", { name: "Expand rest timer controls" }).click();
    await screen.getByRole("button", { name: "Add 15 seconds to rest" }).click();
    advance(16);
    await expect.poll(() => restBuzzes(vibrate), { timeout: 3000 }).toBe(2);

    // Silence it from the widget by keyboard; the next rest is quiet.
    if (!screen.getByRole("button", { name: "Buzz when rest ends: On" }).elements().length) await screen.getByRole("button", { name: "Expand rest timer controls" }).click();
    (screen.getByRole("button", { name: "Buzz when rest ends: On" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("button", { name: "Buzz when rest ends: Off" })).toHaveAttribute("aria-pressed", "false");
    await startRest(session.id, 30);
    await cleanup();
    await render(<TrainScreen />);
    advance(31);
    await settle(2200);
    expect(restBuzzes(vibrate)).toBe(2);
  });

  it("never buzzes for a skipped rest or a rest that ended while away", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    const { session } = await resting();
    let screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "SKIP REST" }).click();
    advance(120);
    await settle(1500);
    expect(restBuzzes(vibrate)).toBe(0);

    await cleanup();
    await startRest(session.id, 60);
    advance(65); // ended while TRAIN was closed
    screen = await render(<TrainScreen />);
    await expect.element(screen.getByText(/REST COMPLETE/)).toBeVisible();
    await settle(1500);
    expect(restBuzzes(vibrate)).toBe(0);
    expect(document.querySelector(".train-rest-done")).toBeNull();
  });

  it("still buzzes under reduced motion but shows no highlight animation", async () => {
    await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    await resting();
    await render(<TrainScreen />);
    advance(90);
    await expect.poll(() => restBuzzes(vibrate), { timeout: 3000 }).toBe(1);
    await expect.poll(() => document.querySelector(".train-rest-done")).not.toBeNull();
    expect(getComputedStyle(document.querySelector(".train-rest-done")!).animationName).toBe("none");
  });

  it("Gym mode shows the highlight on its rest line", async () => {
    vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    await resting();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: /GYM MODE/ }).first().click();
    await expect.poll(() => document.querySelector(".gym-mode__rest")).not.toBeNull();
    advance(90);
    await expect.poll(() => document.querySelector(".gym-mode__rest.train-rest-done"), { timeout: 3000 }).not.toBeNull();
    expect(document.querySelector(".gym-mode__rest")!.textContent).toContain("REST COMPLETE");
    await shot("360-gym-mode-rest-complete", document.querySelector(".gym-mode__rest"));
  });

  it("MORE turns it off and picks Long, and the preference survives a native backup round trip", async () => {
    const screen = await render(<MoreScreen />);
    await openCommandPanel(screen, "settings");
    const row = () => document.querySelector("[data-rest-buzz-setting]")!;
    await expect.poll(() => document.querySelector("[data-rest-buzz-setting]")).not.toBeNull();
    expect(row().textContent).toContain("On, short buzz.");
    await userEvent.selectOptions(row().querySelector('select[aria-label="Buzz strength"]') as HTMLSelectElement, "LONG");
    await expect.poll(() => row().textContent).toContain("On, long buzz.");
    await axeClean("MORE row", row());
    await shot("360-more-settings-row", row());
    await noOverflow("MORE row", row(), "more-settings-row");
    (row().querySelector('button[aria-label="Buzz when rest ends: turn off"]') as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => row().textContent).toContain("Off.");
    expect(JSON.parse(localStorage.getItem("beyond:restBuzzPreference")!)).toEqual({ enabled: false, strength: "LONG" });

    const file = new File([await exportNativeBackup(false)], "beyond.json");
    localStorage.clear();
    await cleanup();
    await applyRestore(file);
    expect(JSON.parse(localStorage.getItem("beyond:restBuzzPreference")!)).toEqual({ enabled: false, strength: "LONG" });
  });
});
