/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { advanceRunningPlan, endRunningSession, setRunningCuePreference, setRunningPosition, startRunningSession } from "../../src/application/runningCommands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { focusAfterSettle } from "./helpers/focus";

/**
 * GRAYSON-TRAIN-RUN-001: TRAIN's running card, the live run, the finish sheet, the plan editor and the correct-a-run
 * sheet. Only Date is faked: the screen's repaint tick is real, and every time it shows comes from timestamps.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
let clock = new Date(2026, 10, 16, 18).getTime();
const advance = (seconds: number) => { clock += seconds * 1000; vi.setSystemTime(clock); };

async function settle() {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
}
async function shot(name: string, selector = "[data-running-card], [data-running-live], [data-running-finish], [data-running-plan], [data-running-editor], .running-history") {
  if (!SHOTS) return;
  await settle();
  const el = document.querySelector(selector) as HTMLElement | null;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(el ? { element: el } : {}) });
}
async function axeClean(label: string, selector: string) {
  await settle();
  const root = document.querySelector(selector);
  expect(root, label).not.toBeNull();
  const r = await axe.run(root!, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width} px`).toBeLessThanOrEqual(width);
    if (width !== 360) await shot(`${width}-${label}`);
  }
  await page.viewport(360, 900);
}
const kind = () => document.querySelector("[data-running-live] .running-live__kind")?.textContent;
const left = () => document.querySelector("[data-running-live] .running-live__left")?.textContent;
const buzzes = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter((c) => c[0] === 35).length;

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 10, 16, 18).getTime();
  vi.setSystemTime(clock);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GRAYSON-TRAIN-RUN-001 running on TRAIN", () => {
  it("starts from the card, changes intervals with one buzz each, survives a reload, pauses, and moves on only on his tap", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    await startDay();
    let screen = await render(<TrainScreen />);
    await expect.element(screen.getByText("Next run · Week 1, run 1 · 28 min 30 s")).toBeVisible();
    await expect.element(screen.getByText("0 of 2 done this week · a third is optional")).toBeVisible();
    await expect.element(screen.getByText(/Every run starts and ends with a 5-minute walk/)).toBeVisible();
    await axeClean("card", "[data-running-card]");
    await shot("360-card-first-time", "[data-running-card]");

    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    expect(left()).toBe("5:00");

    advance(300);
    await expect.poll(kind).toBe("RUN");
    await expect.poll(() => buzzes(vibrate)).toBe(1);
    await expect.element(screen.getByText("Next: Walk for 1 minute 30 seconds")).toBeVisible();
    await axeClean("live run", "[data-running-live]");
    await shot("360-live-run", "[data-running-live]");
    advance(60);
    await expect.poll(kind).toBe("WALK");
    await expect.poll(() => buzzes(vibrate)).toBe(2);
    advance(30);
    await shot("360-live-walk", "[data-running-live]");

    // Reload mid-run: same interval, no buzz for the one already passed.
    await cleanup();
    screen = await render(<TrainScreen />);
    await expect.poll(kind).toBe("WALK");
    expect(left()).toBe("1:00");
    await settle();
    expect(buzzes(vibrate)).toBe(2);
    await shot("360-after-reload", "[data-running-live]");

    await screen.getByRole("button", { name: "PAUSE" }).click();
    await expect.poll(kind).toBe("PAUSED");
    advance(120);
    await settle();
    expect(left()).toBe("1:00");
    await shot("360-paused", "[data-running-live]");
    await screen.getByRole("button", { name: "RESUME" }).click();
    await expect.poll(kind).toBe("WALK");

    advance(1710);
    await expect.element(screen.getByRole("heading", { name: "Week 1, run 1 done." })).toBeVisible();
    await expect.poll(() => document.activeElement?.textContent).toBe("Week 1, run 1 done.");
    await axeClean("finish", "[data-running-finish]");
    await screen.getByRole("button", { name: "MOVE ON TO WEEK 1, RUN 2" }).click();
    await expect.element(screen.getByRole("heading", { name: "Next: Week 1, run 2." })).toBeVisible();
    await shot("360-finish-moved-on-with-undo", "[data-running-finish]");
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByRole("button", { name: "MOVE ON TO WEEK 1, RUN 2" })).toBeVisible();
    await shot("360-finish-completed", "[data-running-finish]");
    await screen.getByRole("button", { name: "MOVE ON TO WEEK 1, RUN 2" }).click();
    await screen.getByRole("button", { name: "DONE" }).click();
    await expect.element(screen.getByText("Next run · Week 1, run 2 · 28 min 30 s")).toBeVisible();
    await expect.element(screen.getByText("1 of 2 done this week · a third is optional")).toBeVisible();
    await shot("360-card-mid-plan", "[data-running-card]");
    await noOverflow("card");
  });

  it("the pain control ends the run as partial and offers Repeat only", async () => {
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    await noOverflow("live");
    advance(400);
    await screen.getByRole("button", { name: "PAIN OR SOMETHING WRONG" }).click();
    await expect.element(screen.getByRole("heading", { name: "Week 1, run 1 stopped at 6 min 40 s of 28 min 30 s." })).toBeVisible();
    await expect.element(screen.getByText(/No diagnosis here: if pain is sharp/)).toBeVisible();
    expect(screen.getByRole("button", { name: /MOVE ON/ }).elements()).toHaveLength(0);
    await axeClean("partial", "[data-running-finish]");
    await shot("360-finish-partial", "[data-running-finish]");
    await noOverflow("finish");
    await screen.getByRole("button", { name: "REPEAT THIS RUN" }).click();
    await expect.element(screen.getByText("Next run · Week 1, run 1 · 28 min 30 s")).toBeVisible();
  });

  it("buzz off means no buzz", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    setRunningCuePreference("buzz", false);
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "START RUN" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    advance(300);
    await expect.poll(kind).toBe("RUN");
    advance(60);
    await expect.poll(kind).toBe("WALK");
    await settle();
    expect(buzzes(vibrate)).toBe(0);
  });

  it("edits a run by keyboard (resize, add, remove, reset, undo), sets cues and runs the edited version", async () => {
    await startDay();
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "PLAN", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: "Running plan" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Interval pattern from the NHS Couch to 5K plan" }).element().getAttribute("href")).toContain("nhs.uk");
    await axeClean("plan", "[data-running-plan]");
    await page.viewport(360, 4000);
    await shot("360-plan-list", "[data-running-plan]");
    await page.viewport(360, 900);
    await shot("360-cue-settings", "[data-running-cues]");
    await noOverflow("plan");

    await focusAfterSettle(screen.getByRole("button", { name: "Edit week 1, run 2" }));
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: "Edit Week 1, run 2 · 28 min 30 s" })).toBeVisible();
    await focusAfterSettle(screen.getByRole("button", { name: "Interval 2: 1 minute longer" }));
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: "Edit Week 1, run 2 · 29 min 30 s" })).toBeVisible();
    await screen.getByRole("button", { name: "ADD AN INTERVAL" }).click();
    await screen.getByRole("button", { name: "Remove interval 2" }).click();
    await axeClean("editor", "[data-running-editor]");
    await page.viewport(360, 2400);
    await shot("360-plan-editor", "[data-running-editor]");
    await page.viewport(360, 900);
    await noOverflow("editor");
    await screen.getByRole("button", { name: "SAVE MY VERSION" }).click();
    await expect.element(screen.getByText(/Week 1, run 2 saved\./)).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Running plan · your version" })).toBeVisible();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByRole("heading", { name: "Running plan" })).toBeVisible();

    // Reset this run and the whole plan, then undo the reset.
    // Week 2 starts folded (simple first); his tap opens it.
    expect(screen.getByRole("button", { name: "Edit week 2, run 1" }).elements().filter((e) => (e as HTMLElement).offsetParent)).toHaveLength(0);
    await screen.getByText("Week 2 · 3 runs", { exact: true }).click();
    await screen.getByRole("button", { name: "Edit week 2, run 1" }).click();
    await screen.getByRole("button", { name: "Interval 1: 5 seconds shorter" }).click();
    await screen.getByRole("button", { name: "SAVE MY VERSION" }).click();
    await expect.element(screen.getByText(/Week 2, run 1 saved\./)).toBeVisible();
    await screen.getByRole("button", { name: "RESET THE WHOLE PLAN…" }).click();
    await screen.getByRole("button", { name: "RESET THE WHOLE PLAN", exact: true }).click();
    await expect.element(screen.getByText(/The whole plan is back to the NHS pattern\./)).toBeVisible();
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByRole("heading", { name: "Running plan · your version" })).toBeVisible();
    await screen.getByRole("button", { name: "Edit week 2, run 1" }).click();
    await screen.getByRole("button", { name: "RESET THIS RUN" }).click();
    await expect.element(screen.getByText(/Week 2, run 1 is back to the plan\./)).toBeVisible();

    // A run edited to a 2-minute first run is what starts.
    await screen.getByRole("button", { name: "Edit week 1, run 1" }).click();
    await screen.getByRole("button", { name: "Interval 2: 1 minute longer" }).click();
    await screen.getByRole("button", { name: "SAVE MY VERSION" }).click();
    await expect.element(screen.getByText(/Week 1, run 1 saved\./)).toBeVisible();
    await screen.getByRole("button", { name: "Start week 1, run 1" }).click();
    await expect.poll(kind).toBe("WARM-UP WALK");
    advance(300);
    await expect.poll(kind).toBe("RUN");
    expect(left()).toBe("2:00");
  });

  it("corrects a past run from history by keyboard, and shows the week 9 done state", async () => {
    const day = await startDay();
    const s = await startRunningSession(day.id);
    advance(600);
    await endRunningSession(s.id, "STOPPED");
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
    const row = screen.getByRole("button", { name: /^Week 1, run 1, Mon, Nov 16\. Partial · 10 min\. Correct this run$/ });
    await expect.element(row).toBeVisible();
    await focusAfterSettle(row);
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: "Correct Week 1, run 1" })).toBeVisible();
    await screen.getByRole("radio", { name: "Completed" }).click();
    await screen.getByRole("spinbutton", { name: "Minutes" }).fill("28");
    await axeClean("correct sheet", ".running-correct");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByRole("button", { name: /Completed · 28 min · corrected\. Correct this run$/ })).toBeVisible();
    await expect.poll(() => document.activeElement?.id).toBe(`running-row-${s.id}`);
    await shot("360-history-corrected", ".running-history");
    await noOverflow("history");

    await cleanup();
    await setRunningPosition({ week: 9, run: 3 });
    const last = await startRunningSession(day.id);
    advance(2405);
    await endRunningSession(last.id, "FINISHED");
    await advanceRunningPlan(last.id);
    const done = await render(<TrainScreen />);
    await expect.element(done.getByText("Foundation done: 30 minutes running. The 1.5-mile phase comes next.")).toBeVisible();
    expect(done.getByRole("button", { name: "START RUN" }).elements()).toHaveLength(0);
    await axeClean("done", "[data-running-card]");
    await shot("360-week-9-done", "[data-running-card]");
  });
});
