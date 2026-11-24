/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { logBodyweight, startDay } from "../../src/application/commands";
import { App } from "../../src/app/App";
import { WeightTrend } from "../../src/ui/screens/body/WeightTrend";
import { applyRestore, exportNativeBackup } from "../../src/persistence/backup";

/**
 * GRAYSON-WEIGHT-TREND-001: DATA's weight card (BodyScreen) shows a smoothed trend weight beside the scale weight and as a second,
 * lighter line, with Show trend and Smoothing under the chart. VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const NOW = new Date(2026, 10, 22, 20).getTime();
const DAY = 86_400_000;
// Two weeks of zig-zag weigh-ins ending Nov 22, the last one 183.6 lb.
const ZIGZAG = [185.4, 184.2, 185.8, 184.0, 184.9, 183.2, 185.1, 183.7, 184.6, 182.9, 184.3, 183.0, 184.0, 183.6];

/** NUMBERS-CLEANUP-001 folds BODY's weight card into the closed "Today's readings" disclosure. */
async function openBody() {
  const screen = await render(<App />);
  await screen.getByRole("navigation").getByRole("button", { name: "DATA", exact: true }).click();
  await expect.element(screen.getByRole("region", { name: "Your numbers" })).toBeVisible();
  await expect.poll(() => [...document.querySelectorAll("summary")].some((s) => s.textContent === "Today's readings")).toBe(true);
  [...document.querySelectorAll("summary")].find((s) => s.textContent === "Today's readings")!.click();
  await expect.poll(() => document.querySelector(".data-weight-instrument")).not.toBeNull();
  return screen;
}

async function seed(weights: readonly number[]) {
  vi.setSystemTime(NOW - weights.length * DAY);
  const day = await startDay();
  for (const [i, lbs] of weights.entries()) {
    vi.setSystemTime(NOW - (weights.length - 1 - i) * DAY - 12 * 3_600_000);
    await logBodyweight(day.id, lbs);
  }
  vi.setSystemTime(NOW);
}

const card = () => document.querySelector(".data-weight-instrument") as HTMLElement;
const plot = () => card().querySelector("svg.suit-data-plot") as SVGSVGElement;
const readout = () => card().querySelector(".weight-trend__readout")?.textContent ?? null;
async function settle() {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
async function noViolations(label: string, root: Element = card()) {
  await settle();
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function shot(name: string, element: Element = card()) {
  if (!SHOTS) return;
  await settle();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: element as HTMLElement });
}

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("GRAYSON-WEIGHT-TREND-001", () => {
  it("shows Trend beside the scale weight, draws both lines, names both, and is keyboard and axe clean", async () => {
    await seed(ZIGZAG);
    const screen = await openBody();
    await expect.poll(() => readout()).toMatch(/^Trend \d{3}\.\d lb · scale 183\.6 lb Nov 22$/);
    expect(plot().querySelectorAll("polyline")).toHaveLength(2);
    expect(plot().querySelector("[data-weight-trend-line]")).not.toBeNull();
    expect(plot().getAttribute("aria-label")).toMatch(/from 185\.4 to 183\.6 lb\. Two lines: scale weight, and the smoothed trend from \d{3}\.\d to \d{3}\.\d lb$/);
    // The scale weight stays the big number; the trend sits beside it.
    expect(card().querySelector(":scope > p")!.textContent).toBe("183.6 lb");
    // The trend reads apart from the scale line without colour.
    const trendLine = getComputedStyle(plot().querySelector("[data-weight-trend-line]")!);
    const scaleLine = getComputedStyle(plot().querySelector("polyline:not([data-weight-trend-line])")!);
    expect(trendLine.strokeDasharray).not.toBe("none");
    expect(scaleLine.strokeDasharray).toBe("none");
    // No up/down colour, arrows or "you gained" copy.
    expect(card().querySelector(".weight-trend")!.textContent).not.toMatch(/[▲▼↑↓]|gained|lost/i);
    await shot("360-card-with-trend");

    // Keyboard only: Tab to the toggle, the smoothing radios and the disclosure.
    const toggle = screen.getByRole("button", { name: "Show trend: On" });
    (toggle.element() as HTMLElement).focus();
    expect(document.activeElement).toBe(toggle.element());
    await userEvent.keyboard("{Tab}");
    expect((document.activeElement as HTMLInputElement).value).toBe("STEADY");
    await userEvent.keyboard("{ArrowRight}");
    await expect.poll(() => (screen.getByRole("radio", { name: "Quicker" }).element() as HTMLInputElement).checked).toBe(true);
    await userEvent.keyboard("{Tab}");
    expect((document.activeElement as HTMLElement).textContent).toBe("What's the trend?");
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByText("Your weigh-ins averaged so one day's water or salt barely moves it. It only moves when your weight really does.")).toBeVisible();
    await shot("360-settings-and-disclosure-open");
    await noViolations("card 360");

    for (const width of [320, 412]) {
      await page.viewport(width, 900);
      await settle();
      expect(document.documentElement.scrollWidth, `${width} px`).toBeLessThanOrEqual(width);
      const box = card().getBoundingClientRect();
      for (const el of card().querySelectorAll(".weight-trend *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        expect(r.right, `${width} px: ${el.className}`).toBeLessThanOrEqual(box.right + 0.5);
      }
      await noViolations(`card ${width}`);
      await shot(`${width}-card-with-trend`);
    }
  });

  it("shows the waiting line with 4 weigh-ins and draws no trend", async () => {
    await seed([184.2, 183.8, 184.6, 183.9]);
    const screen = await openBody();
    await expect.element(screen.getByText("Trend shows after 5 weigh-ins over a week", { exact: true })).toBeVisible();
    expect(plot().querySelectorAll("polyline")).toHaveLength(1);
    expect(readout()).toBeNull();
    await noViolations("waiting");
    await shot("360-waiting");
  });

  it("Show trend Off restores today's chart exactly, and On brings the trend back", async () => {
    await seed(ZIGZAG);
    const screen = await openBody();
    await expect.poll(() => readout()).not.toBeNull();
    await screen.getByRole("button", { name: "Show trend: On" }).click();
    await expect.element(screen.getByRole("button", { name: "Show trend: Off" })).toBeVisible();
    expect(readout()).toBeNull();
    expect(plot().querySelectorAll("polyline")).toHaveLength(1);
    expect(plot().getAttribute("aria-label")).toBe("Weight over the last 60 days ending Nov 22, from 185.4 to 183.6 lb");
    expect(screen.getByRole("radio", { name: "Quicker" }).elements()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem("beyond:weightTrendPreference")!)).toEqual({ show: false, smoothing: "STEADY" });
    await shot("360-trend-off");
    await screen.getByRole("button", { name: "Show trend: Off" }).click();
    await expect.poll(() => readout()).not.toBeNull();
    expect(plot().querySelectorAll("polyline")).toHaveLength(2);
  });

  it("Quicker changes the number, and the preference survives a native backup round trip", async () => {
    await seed(ZIGZAG);
    const screen = await openBody();
    await expect.poll(() => readout()).not.toBeNull();
    const steady = readout();
    await screen.getByRole("radio", { name: "Quicker" }).click();
    await expect.poll(() => readout()).not.toBe(steady);
    expect(readout()).toMatch(/^Trend \d{3}\.\d lb · scale 183\.6 lb Nov 22$/);

    const file = new File([await exportNativeBackup(false)], "beyond.json");
    localStorage.clear();
    await cleanup();
    await applyRestore(file);
    expect(JSON.parse(localStorage.getItem("beyond:weightTrendPreference")!)).toEqual({ show: true, smoothing: "QUICKER" });
    const restored = await openBody();
    await expect.poll(() => (restored.getByRole("radio", { name: "Quicker" }).element() as HTMLInputElement).checked).toBe(true);
  });

  it("the facts-only use (hideChart, as BodyProgress draws it) shows no trend, settings or disclosure", async () => {
    const history = ZIGZAG.map((weightLbs, i) => ({ recordedAt: new Date(NOW - (ZIGZAG.length - 1 - i) * DAY).toISOString(), weightLbs }));
    const screen = await render(<WeightTrend history={history} goalWeightLbs={170} hideChart />);
    await expect.poll(() => document.querySelector(".weight-trend")).not.toBeNull();
    expect(document.querySelector(".weight-trend__readout, .weight-trend__waiting, .weight-trend__settings, svg")).toBeNull();
    expect(screen.getByRole("button", { name: /Show trend/ }).elements()).toHaveLength(0);
  });
});
