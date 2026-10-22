import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import * as commands from "../../src/application/commands";
import { logProtein, logWater, setWorkContext, startDay } from "../../src/application/commands";
import { createSavedMeal } from "../../src/application/nutritionCommands";
import { startWorkout } from "../../src/application/trainCommands";
import { getDayProteinTotalG, getEffectiveHydrationTotal } from "../../src/application/queries";
import { LONG_PRESS_MS } from "../../src/ui/hooks/useLongPress";
import { db } from "../../src/persistence/db";
import { glitched, stopWatching, watchGlitches } from "./glitchWatch";

/** SUIT-001: stealth hides the screen, not the data. */
vi.mock("../../src/application/commands", async (original) => {
  const actual = await original<typeof import("../../src/application/commands")>();
  return { ...actual, logWater: vi.fn(actual.logWater) };
});
// The visible clock must not accidentally match the hidden totals (42 / 45).
// Keep real timers for long presses and holds; only Date is deterministic.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 20, 10));
});
afterEach(async () => { stopWatching(); await cleanup(); vi.useRealTimers(); vi.mocked(commands.logWater).mockClear(); await page.viewport(1280, 800); await cdp().send("Emulation.setEmulatedMedia", { features: [] }); });

const overlay = () => document.querySelector<HTMLElement>(".stealth");
const findEmblem = () => [...document.querySelectorAll<HTMLElement>("main .operator-emblem")].find((element) => element.getClientRects().length);
async function visibleEmblem(): Promise<HTMLElement> {
  await expect.poll(() => !!findEmblem()).toBe(true);
  return findEmblem()!;
}
function pointer(element: HTMLElement, type: "pointerdown" | "pointerup") {
  element.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, isPrimary: true }));
}
/** The click a pointer release produces (detail 1); element.click() is a keyboard-style click (detail 0). */
function pointerClick(element: HTMLElement) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, detail: 1 }));
}
async function press(element: HTMLElement, ms: number) {
  pointer(element, "pointerdown");
  await new Promise((resolve) => setTimeout(resolve, ms));
  pointer(element, "pointerup");
  pointerClick(element);
}
async function readyDay() {
  const day = await startDay();
  await setWorkContext(day.id, "OFF", "MANUAL");
  return day;
}

it("toggles on a long-press of the emblem; a short tap still goes to TODAY", async () => {
  await readyDay();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  await press(await visibleEmblem(), 120);
  await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
  expect(overlay()).toBeNull();
  const emblem = await visibleEmblem();
  expect(getComputedStyle(emblem).userSelect).toBe("none");
  pointer(emblem, "pointerdown");
  await expect.poll(() => !!emblem.querySelector(".operator-emblem__press")).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 80));
  pointer(emblem, "pointerup");
  pointerClick(emblem); // the click that ends a long press is swallowed
  await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
  await expect.poll(() => document.activeElement?.classList.contains("stealth__emblem")).toBe(true);
  // A long-press of stealth's own emblem exits and returns focus to the screen's emblem.
  await press(document.querySelector<HTMLElement>(".stealth__emblem")!, LONG_PRESS_MS + 80);
  await expect.poll(() => overlay()).toBeNull();
  await expect.poll(() => document.activeElement?.classList.contains("operator-emblem")).toBe(true);
});

it("opens from COMMAND by keyboard, traps focus, exits on Escape and persists across a reload", async () => {
  await readyDay();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("stealth");
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
  expect(document.querySelector("main")!.closest("[inert]")).not.toBeNull();
  for (let i = 0; i < 12; i++) {
    await userEvent.keyboard("{Tab}");
    expect(overlay()!.contains(document.activeElement)).toBe(true);
  }
  await cleanup();
  await render(<App />);
  await expect.poll(() => overlay()).not.toBeNull();
  await expect.poll(() => document.querySelector("main")?.closest("[inert]")).not.toBeNull();
  (document.activeElement as HTMLElement | null)?.blur(); // Escape works with focus on the body too
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => overlay()).toBeNull();
  expect(localStorage.getItem("beyond:stealth")).toBeNull();
});

it("peeks only while held, by pointer or Space", async () => {
  const day = await readyDay(); await logProtein(day.id, 42); await logWater(day.id, 20);
  const screen = await render(<App />);
  await press(await visibleEmblem(), LONG_PRESS_MS + 80);
  const protein = screen.getByRole("button", { name: "PROTEIN hidden. Hold to show" });
  await expect.element(protein).toHaveTextContent("•••");
  expect(overlay()!.textContent).not.toContain("42");
  pointer(protein.element() as HTMLElement, "pointerdown");
  await expect.element(protein).toHaveTextContent("42 g");
  pointer(protein.element() as HTMLElement, "pointerup");
  await expect.element(protein).toHaveTextContent("•••");
  const water = screen.getByRole("button", { name: "WATER hidden. Hold to show" });
  (water.element() as HTMLElement).focus();
  await userEvent.keyboard("{Space>}");
  await expect.element(water).toHaveTextContent("20 oz");
  await userEvent.keyboard("{/Space}");
  await expect.element(water).toHaveTextContent("•••");
});

it("logs water and a saved meal blind, exactly once, with undo and no totals", async () => {
  const day = await readyDay(); await logWater(day.id, 30);
  await createSavedMeal({ name: "Chicken bowl", calories: 600, proteinG: 45, carbsG: 50, fatG: 15 });
  const screen = await render(<App />);
  await press(await visibleEmblem(), LONG_PRESS_MS + 80);
  await screen.getByRole("button", { name: "WATER", exact: true }).click();
  const twelve = screen.getByRole("button", { name: "12 oz", exact: true });
  (twelve.element() as HTMLElement).click(); (twelve.element() as HTMLElement).click();
  await expect.element(screen.getByText("Water logged.", { exact: true })).toBeVisible();
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(2);
  expect(await getEffectiveHydrationTotal(day.id)).toBe(42);
  expect(overlay()!.textContent).not.toMatch(/42|30 oz/);
  await screen.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(30);

  await screen.getByRole("button", { name: "MEAL", exact: true }).click();
  await expect.element(screen.getByText("Saved meal · one tap", { exact: true })).toBeVisible();
  expect(overlay()!.textContent).not.toMatch(/600|45 ?g/);
  await screen.getByRole("button", { name: /^Chicken bowl/ }).click();
  await expect.element(screen.getByText("Meal logged.", { exact: true })).toBeVisible();
  expect(await db.events.where("type").equals("MEAL_LOGGED").count()).toBe(1);
  expect(await getDayProteinTotalG(day.id)).toBe(45);
  expect(overlay()!.textContent).not.toMatch(/45/);
  await screen.getByRole("button", { name: "UNDO", exact: true }).click();
  await expect.poll(() => getDayProteinTotalG(day.id)).toBe(0);
  expect(await db.events.where("type").equals("MEAL_LOG_VOIDED").count()).toBe(1);
});

it("says plainly when a save fails, glitching once, and writes nothing", async () => {
  await readyDay();
  vi.mocked(commands.logWater).mockRejectedValueOnce(new Error("QuotaExceededError"));
  const screen = await render(<App />);
  await press(await visibleEmblem(), LONG_PRESS_MS + 80);
  await screen.getByRole("button", { name: "WATER", exact: true }).click();
  watchGlitches();
  await screen.getByRole("button", { name: "8 oz", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toHaveTextContent("Water not saved. Try again.");
  await expect.poll(() => glitched.has("save-failed")).toBe(true);
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
});

it("leaves an active workout exactly where it was", async () => {
  const day = await readyDay();
  const workout = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  await press(await visibleEmblem(), LONG_PRESS_MS + 80);
  await expect.element(screen.getByText("Workout in progress. It’s waiting where you left it.", { exact: true })).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => overlay()).toBeNull();
  await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
  expect((await db.workoutSessions.get(workout.id))?.status).toBe("ACTIVE");
});

for (const width of [320, 360, 412]) it(`fits ${width}px with 44px targets, AA contrast, axe, and no motion when reduced`, async () => {
  await page.viewport(width, 800);
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await readyDay();
  const screen = await render(<App />);
  await press(await visibleEmblem(), LONG_PRESS_MS + 80);
  await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const button of overlay()!.querySelectorAll<HTMLElement>("button")) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.getAnimations().filter((animation) => animation.playState === "running")).toHaveLength(0);
  const results = await axe.run(overlay()!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
  expect(results.violations).toEqual([]);
});

it("a keyboard Enter after a real long-press and Escape still goes to TODAY the first time", async () => {
  await readyDay();
  const screen = await render(<App />);
  await screen.getByRole("button", { name: "TRAIN", exact: true }).click();
  const emblem = await visibleEmblem();
  // A real press: the overlay makes the emblem inert before release, so no click follows the pointerup.
  pointer(emblem, "pointerdown");
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 80));
  pointer(emblem, "pointerup");
  await expect.element(screen.getByRole("dialog", { name: "Stealth" })).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => overlay()).toBeNull();
  await expect.poll(() => document.activeElement === emblem).toBe(true);
  await userEvent.keyboard("{Enter}");
  await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
});

it("BODY and an open SYSTEMS readout behind stealth show its logs and undos on exit", async () => {
  const day = await readyDay();
  await logWater(day.id, 8);
  const screen = await render(<App />);
  const stealthLog = async (undo: boolean) => {
    await press(await visibleEmblem(), LONG_PRESS_MS + 80);
    await screen.getByRole("button", { name: "WATER", exact: true }).click();
    const before = vi.mocked(commands.logWater).mock.calls.length;
    await screen.getByRole("button", { name: "12 oz", exact: true }).click();
    await expect.poll(() => vi.mocked(commands.logWater).mock.calls.length).toBe(before + 1);
    // Escape closes an open panel before it exits Stealth. Wait for the real
    // save to close the panel and finish refreshing, not merely invoke a command.
    const water = screen.getByRole("button", { name: "WATER", exact: true });
    await expect.element(water).toHaveAttribute("aria-expanded", "false");
    await expect.element(water).toBeEnabled();
    if (undo) {
      await screen.getByRole("button", { name: "UNDO", exact: true }).click();
      await expect.element(water).toBeEnabled();
    }
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => overlay()).toBeNull();
  };
  await screen.getByRole("button", { name: "BODY", exact: true }).click();
  const body = () => document.querySelector('#workspace-BODY [aria-label="water history"] .readout__value')?.textContent;
  await expect.poll(body).toBe("8 oz");
  await stealthLog(false);
  await expect.poll(body).toBe("20 oz");
  // An undo re-reads too: without it BODY would keep the second log's 32 oz.
  await stealthLog(true);
  await expect.poll(() => db.events.where("type").equals("WATER_LOG_VOIDED").count()).toBe(1);
  await expect.poll(body).toBe("20 oz");

  await screen.getByRole("button", { name: "COMMAND", exact: true }).click();
  await screen.getByRole("searchbox", { name: "Find a screen or action" }).fill("systems");
  await screen.getByRole("button", { name: /^SYSTEMS / }).click();
  await expect.element(screen.getByRole("button", { name: "Water: 20 oz. Open history" })).toBeVisible();
  await stealthLog(false);
  await expect.element(screen.getByRole("button", { name: "Water: 32 oz. Open history" })).toBeVisible();
});

