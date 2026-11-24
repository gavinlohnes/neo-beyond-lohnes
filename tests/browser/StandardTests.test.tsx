/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { startDay } from "../../src/application/commands";
import { recordStandardTest } from "../../src/application/standardTestCommands";
import { db } from "../../src/persistence/db";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-STANDARDS-001: TRAIN → PROGRESS → STANDARDS. Record each test by keyboard, the one-minute timer and
 * the stopwatch (Date is faked, the tick is real), fix and remove with Undo, and his own target across a reload.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
let clock = new Date(2026, 10, 24, 19).getTime();
const advance = (ms: number) => { clock += ms; vi.setSystemTime(clock); };

async function settle() {
  for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
}
const standards = () => document.getElementById("train-progress-standards")!.closest("article")!;
async function shot(name: string) {
  if (!SHOTS) return;
  await settle();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: standards() });
}

async function checks(label: string, shotName: string | null) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width} px`).toBeLessThanOrEqual(width);
    const small = Array.from(standards().querySelectorAll<HTMLElement>("p, h3, button, label, strong"))
      .filter((el) => el.checkVisibility() && (el.textContent?.trim() ?? "") !== "")
      .filter((el) => {
        const t = el.textContent!.trim(), cs = getComputedStyle(el), size = Number.parseFloat(cs.fontSize);
        const isLabel = (t === t.toUpperCase() || cs.textTransform === "uppercase") && t.length <= 32;
        return size < (isLabel ? 10 : 16);
      }).map((el) => el.textContent);
    expect(small, `${label} small text at ${width} px`).toEqual([]);
    for (const b of standards().querySelectorAll<HTMLElement>("button")) if (b.checkVisibility()) expect(b.getBoundingClientRect().height, `${b.textContent} at ${width}`).toBeGreaterThanOrEqual(44);
    if (shotName && width !== 360) await shot(`${width}-${shotName}`);
  }
  await page.viewport(360, 900);
  const r = await axe.run(standards(), { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
  if (shotName) await shot(`360-${shotName}`);
}

async function openProgress() {
  const screen = await render(<TrainScreen />);
  await screen.getByRole("group", { name: "Training views" }).getByRole("button", { name: "PROGRESS", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: "Record Sit-and-reach" })).toBeVisible();
  return screen;
}
/** Keyboard only: focus a control and press Enter. */
async function press(locator: { element: () => Element }) {
  (locator.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
}
async function typeInto(locator: { element: () => Element }, text: string) {
  (locator.element() as HTMLInputElement).focus();
  await userEvent.keyboard("{Control>}a{/Control}{Backspace}");
  await userEvent.keyboard(text);
}
const rowText = (test: string) => document.querySelector(`[data-standard="${test}"] .train-progress__text`)?.textContent;

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  clock = new Date(2026, 10, 24, 19).getTime();
  vi.setSystemTime(clock);
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GRAYSON-TRAIN-STANDARDS-001 standards tests", { timeout: 60_000 }, () => {
  it("records each test by keyboard; the one-minute timer buzzes once at zero and writes nothing; the stopwatch fills the time", async () => {
    const vibrate = vi.spyOn(navigator, "vibrate").mockImplementation(() => true);
    await startDay();
    const screen = await openProgress();
    expect(rowText("SIT_AND_REACH")).toBe("Not recorded yet.");
    await checks("standards empty", null);

    // Sit-and-reach: RECORD, inches, SAVE.
    await press(screen.getByRole("button", { name: "Record Sit-and-reach" }));
    expect(document.activeElement?.textContent).toBe("Record sit-and-reach");
    await shot("360-sheet-sit-and-reach");
    await typeInto(screen.getByRole("spinbutton", { name: "Inches" }), "31");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.element(screen.getByText("Enter inches from 0 to 30, to the quarter inch.")).toBeVisible();
    await typeInto(screen.getByRole("spinbutton", { name: "Inches" }), "14.25");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(() => rowText("SIT_AND_REACH")).toBe("Last: 14¼ in on Nov 24.");
    expect(document.activeElement?.id).toBe("standard-record-SIT_AND_REACH");

    // Sit-ups with the timer: one buzz at zero, nothing written by the timer.
    await press(screen.getByRole("button", { name: "Record One-minute sit-ups" }));
    const before = await db.events.count();
    await press(screen.getByRole("button", { name: "START 1:00" }));
    advance(30_000);
    await settle();
    // About half a minute left (the faked clock creeps on in real time between steps).
    expect(document.querySelector("[data-minute-timer] .standard-sheet__clock")?.textContent).toMatch(/^0:(29|30|31)$/);
    await shot("360-sheet-sit-ups-timer");
    advance(31_000);
    await expect.element(screen.getByText("Time. Enter your reps.")).toBeVisible();
    await settle();
    advance(5_000);
    await settle();
    expect(vibrate.mock.calls.filter((c) => Array.isArray(c[0])).length).toBe(1);
    expect(await db.events.count()).toBe(before);
    await typeInto(screen.getByRole("spinbutton", { name: "Reps" }), "38");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(() => rowText("SIT_UPS_1MIN")).toBe("Last: 38 reps on Nov 24.");

    // 1.5-mile run: the stopwatch fills the minutes and seconds.
    await press(screen.getByRole("button", { name: "Record 1.5-mile run" }));
    await press(screen.getByRole("button", { name: "START STOPWATCH" }));
    advance(13 * 60_000 + 42_000);
    await settle();
    await shot("360-sheet-run-stopwatch");
    await press(screen.getByRole("button", { name: "STOP" }));
    await expect.element(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(13);
    await expect.poll(() => Number((screen.getByRole("spinbutton", { name: "Seconds" }).element() as HTMLInputElement).value)).toBeGreaterThanOrEqual(40);
    expect(Number((screen.getByRole("spinbutton", { name: "Seconds" }).element() as HTMLInputElement).value)).toBeLessThanOrEqual(44);
    await typeInto(screen.getByRole("spinbutton", { name: "Seconds" }), "42");
    await typeInto(screen.getByRole("textbox", { name: "Note (optional)" }), "Track, windy");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 13:42 on Nov 24.");
    expect((await db.events.where("type").equals("STANDARD_TEST_RECORDED").toArray()).map((e) => (e.payload as { value: number }).value).sort((a, b) => a - b))
      .toEqual([14.25, 38, 822]);
  });

  it("shows the change against the one before; fix and remove with Undo; RECORDS lists every result", async () => {
    vi.setSystemTime(new Date(2026, 9, 2, 19));
    await startDay();
    await recordStandardTest({ test: "RUN_1_5_MILE", value: 822 });
    vi.setSystemTime(clock);
    await startDay();
    await recordStandardTest({ test: "RUN_1_5_MILE", value: 840 });
    const screen = await openProgress();
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 14:00 on Nov 24. Before: 13:42 on Oct 2. 18 seconds slower than Oct 2.");
    expect(standards().textContent).not.toMatch(/fail|pass|behind|missed/i);
    expect([...standards().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);

    await press(screen.getByRole("button", { name: "1.5-mile run records" }));
    await expect.element(screen.getByRole("heading", { name: "1.5-mile run: every result" })).toBeVisible();
    expect(document.querySelectorAll("[data-result]").length).toBe(2);
    await checks("records", "records");

    await press(screen.getByRole("button", { name: /^Fix 14:00 from/ }));
    await typeInto(screen.getByRole("spinbutton", { name: "Seconds" }), "30");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(() => document.querySelector(".standard-undo")?.textContent).toBe("Result fixed. UNDO");
    await expect.poll(() => rowText("RUN_1_5_MILE")).toMatch(/^Last: 14:30 on Nov 24\./);
    await press(screen.getByRole("button", { name: "UNDO" }));
    await expect.poll(() => rowText("RUN_1_5_MILE")).toMatch(/^Last: 14:00 on Nov 24\./);

    await press(screen.getByRole("button", { name: /^Remove 14:00 from/ }));
    await expect.poll(() => document.querySelector(".standard-undo")?.textContent).toBe("Result removed. UNDO");
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 13:42 on Oct 2.");
    await shot("360-removed-with-undo");
    await press(screen.getByRole("button", { name: "UNDO" }));
    await expect.poll(() => rowText("RUN_1_5_MILE")).toMatch(/^Last: 14:00 on Nov 24\./);
  });

  it("his own target saves, survives a reload and reads as distance to go, never pass or fail", async () => {
    await startDay();
    await recordStandardTest({ test: "RUN_1_5_MILE", value: 832 });
    let screen = await openProgress();
    await press(screen.getByRole("button", { name: "1.5-mile run target" }));
    await typeInto(screen.getByRole("spinbutton", { name: "Minutes" }), "13");
    await typeInto(screen.getByRole("spinbutton", { name: "Seconds" }), "30");
    await press(screen.getByRole("button", { name: "SAVE" }));
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 13:52 on Nov 24. Target: 13:30, set by you. 22 seconds to go.");
    expect(document.activeElement?.id).toBe("standard-target-RUN_1_5_MILE");

    await cleanup();
    screen = await openProgress();
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 13:52 on Nov 24. Target: 13:30, set by you. 22 seconds to go.");
    await checks("with a target", "standards-with-target");
    await press(screen.getByRole("button", { name: "1.5-mile run target" }));
    await press(screen.getByRole("button", { name: "CLEAR" }));
    await expect.poll(() => rowText("RUN_1_5_MILE")).toBe("Last: 13:52 on Nov 24.");
  });
});
