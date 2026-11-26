import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import "../../src/ui/styles/global.css";
import "../../src/ui/styles/fonts";
import { App } from "../../src/app/App";
import { setWorkContext, startDay } from "../../src/application/commands";
import { logManualMeal } from "../../src/application/nutritionCommands";
import { LogNudgeSettings } from "../../src/ui/screens/more/LogNudgeSettings";
import { todaySettled } from "./helpers/todaySettled";

/**
 * GRAYSON-LOG-NUDGE-001: on a day off, 45 minutes past his usual 13:00 lunch with nothing logged, one quiet line under
 * AT A GLANCE says why and offers TELL DELTA (Delta opens with "I ate ", nothing sent) or NOT NOW. Invented data:
 * four earlier days off with lunch near 13:00 teach the time.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const MEAL = { name: "Turkey wrap", calories: 520, proteinG: 38, carbsG: 48, fatG: 16 };
const LINE = "Usually you eat around 13:00. Nothing logged yet today.";
let todayId = "";

async function offDay(d: number) {
  vi.setSystemTime(at(d, 16, 31));
  const day = await startDay(at(d, 16, 30).toISOString());
  await setWorkContext(day.id, "OFF", "MANUAL");
  return day.id;
}
beforeEach(async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  localStorage.setItem("beyond.orientation.v1", "seen-elsewhere");
  localStorage.setItem("beyond.alfredKey", "sk-ant-test-nudge");
  vi.spyOn(window, "fetch").mockRejectedValue(new TypeError("offline"));
  vi.useFakeTimers({ toFake: ["Date"] });
  for (const [d, m] of [[18, 50], [19, 0], [20, 0], [21, 10]] as const) {
    const id = await offDay(d);
    const lunch = m === 50 ? at(d + 1, 12, 50) : at(d + 1, 13, m);
    vi.setSystemTime(new Date(lunch.getTime() + 60_000));
    await logManualMeal(id, MEAL, false, lunch.toISOString());
  }
  await offDay(22);
  todayId = await offDay(23);
  vi.setSystemTime(at(24, 13, 50));
});
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const nudge = () => page.getByRole("group", { name: "Logging nudge" });
async function aa(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
function fits(root: Element, width: number) {
  for (const b of root.querySelectorAll<HTMLElement>("button")) expect(b.getBoundingClientRect().height, `${width} ${b.textContent}`).toBeGreaterThanOrEqual(44);
  for (const el of root.querySelectorAll<HTMLElement>("p, button")) expect(parseFloat(getComputedStyle(el).fontSize), `${width} ${el.textContent}`).toBeGreaterThanOrEqual(16);
  expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(width);
}

describe("GRAYSON-LOG-NUDGE-001 on TODAY", () => {
  it("not before usual + 45 minutes; then the line, muted, with its reason; fits 320/360/412, axe clean", async () => {
    vi.setSystemTime(at(24, 13, 40));
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await todaySettled();
    expect(document.querySelector('[aria-label="Logging nudge"]')).toBeNull();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/before-glance-360.png`, element: document.querySelector(".today-numbers") as HTMLElement });
    await cleanup();
    vi.setSystemTime(at(24, 13, 50));
    await render(<App />);
    await todaySettled();
    await expect.element(nudge().getByText(LINE, { exact: true })).toBeVisible();
    const el = nudge().element();
    // Never red: the line is the muted .meta grey.
    expect(getComputedStyle(el.querySelector("p")!).color).not.toBe("rgb(208, 20, 27)");
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 900);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      fits(el, width);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-glance-nudge-${width}.png`, element: document.querySelector(".today-numbers") as HTMLElement });
    }
    await aa("nudge", el);
    void screen;
  });

  it("TELL DELTA opens Delta with \"I ate \" and sends nothing; a logged meal hides the line", async () => {
    await page.viewport(360, 900);
    const screen = await render(<App />);
    await todaySettled();
    // TODAY's own brief may ask Claude in the background; no request may carry his message.
    const sentIAte = () => vi.mocked(window.fetch).mock.calls.some(([, i]) => /"(content|text)":"I ate/.test(String((i as RequestInit | undefined)?.body ?? "")));
    await nudge().getByRole("button", { name: "TELL DELTA" }).click();
    const box = screen.getByRole("dialog", { name: "ALFRED" }).getByRole("textbox", { name: "Message Alfred" });
    await expect.element(box).toHaveValue("I ate ");
    await new Promise((r) => setTimeout(r, 300));
    expect(sentIAte()).toBe(false);
    await cleanup();
    vi.setSystemTime(at(24, 13, 52));
    await logManualMeal(todayId, MEAL);
    await render(<App />);
    await todaySettled();
    await expect.poll(() => document.querySelector('[aria-label="Logging nudge"]')).toBeNull();
  });

  it("with a meal earlier in the day it says since when; NOT NOW hides it for the day, by keyboard", async () => {
    vi.setSystemTime(at(24, 9, 0));
    await logManualMeal(todayId, MEAL, false, at(24, 9, 0).toISOString());
    vi.setSystemTime(at(24, 13, 50));
    await page.viewport(360, 900);
    await render(<App />);
    await todaySettled();
    await expect.element(nudge().getByText("Usually you eat around 13:00. Nothing logged since 11:30.", { exact: true })).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-glance-nudge-since-360.png`, element: document.querySelector(".today-numbers") as HTMLElement });
    (nudge().getByRole("button", { name: "TELL DELTA" }).element() as HTMLElement).focus();
    await userEvent.keyboard("{Tab}");
    await expect.poll(() => document.activeElement?.textContent).toBe("NOT NOW");
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => document.querySelector('[aria-label="Logging nudge"]')).toBeNull();
    await cleanup();
    await render(<App />);
    await todaySettled();
    expect(document.querySelector('[aria-label="Logging nudge"]')).toBeNull();
  });
});

describe("GRAYSON-LOG-NUDGE-001 settings", () => {
  it("shows learned times with their evidence; a moved time is his and wins; RESET and OFF work; fits and axe clean", async () => {
    await page.viewport(360, 1200);
    const screen = await render(<LogNudgeSettings />);
    const off = screen.getByRole("group", { name: "Days off usual meal times" });
    await expect.element(off.getByText("From your logs, 4 days")).toBeVisible();
    await expect.element(off.getByRole("textbox", { name: "Days off usual time 1" }).or(off.getByLabelText("Days off usual time 1"))).toHaveValue("13:00");
    await expect.element(screen.getByRole("group", { name: "Work days usual meal times" }).getByText("Not enough meals logged to learn your times yet. Add one?")).toBeVisible();
    const root = screen.container;
    for (const width of [320, 360, 412]) {
      await page.viewport(width, 1200);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      expect(document.documentElement.scrollWidth, `${width}`).toBeLessThanOrEqual(width);
      for (const b of root.querySelectorAll<HTMLElement>("button")) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/after-settings-${width}.png`, element: root as HTMLElement });
    }
    await aa("settings", root);
    await off.getByLabelText("Days off usual time 1").fill("12:30");
    await expect.element(off.getByText("Yours")).toBeVisible();
    expect(JSON.parse(localStorage.getItem("beyond.logNudge.v1")!).edited.OFF).toEqual([20 * 60]);
    await off.getByRole("button", { name: "Reset Days off to learned times" }).click();
    await expect.element(off.getByText("From your logs, 4 days")).toBeVisible();
    await screen.getByRole("button", { name: "Logging nudge", exact: true }).click();
    expect(JSON.parse(localStorage.getItem("beyond.logNudge.v1")!).enabled).toBe(false);
    await cleanup();
    vi.setSystemTime(at(24, 13, 50));
    await render(<App />);
    await todaySettled();
    expect(document.querySelector('[aria-label="Logging nudge"]')).toBeNull();
  });
});
