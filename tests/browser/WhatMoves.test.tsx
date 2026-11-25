/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { logSleep, startDay, submitCheckIn } from "../../src/application/commands";
import { createHabit, setHabitAnswer } from "../../src/application/habitCommands";
import { livedDayBoundary } from "../../src/engine/livedDaySeries";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { db } from "../../src/persistence/db";
import { applySettingsBlock, parseSettingsBlock, readTravellingSettings } from "../../src/persistence/settingsTransfer";
import { WhatMovesSection } from "../../src/ui/screens/review/WhatMovesSection";

/**
 * GRAYSON-WHAT-MOVES-001: DATA → Patterns, "What moves your numbers", from real recorded days. Stretching on a day is
 * followed by next-day energy 5 (2 otherwise); Reading is unrelated to it; sleep is the same every night.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 200) => new Promise<void>((r) => setTimeout(r, ms));
const section = () => document.querySelector("[data-what-moves], .what-moves") as HTMLElement;
async function shot(name: string) { if (SHOTS) { await settle(); await page.screenshot({ path: `${SHOTS}/${name}.png`, element: section() }); } }
async function press(locator: { element: () => Element }) { (locator.element() as HTMLElement).focus(); await userEvent.keyboard("{Enter}"); }
async function fits(label: string, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    const r = await axe.run(section(), { runOnly: ["wcag2a", "wcag2aa"] });
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${label} at ${width}`).toEqual([]);
    if (name && width !== 360) await shot(`${width}-${name}`);
  }
  await page.viewport(360, 900);
}
const lines = () => [...document.querySelectorAll("[data-what-moves] > .what-moves__list [data-line]")].map((l) => l.textContent ?? "");

let now = new Date();
async function seed(dayCount = 18) {
  vi.useFakeTimers({ toFake: ["Date"] });
  const stretching = await createHabit({ name: "stretching", kind: "ANY_DAY" });
  const reading = await createHabit({ name: "reading", kind: "ANY_DAY" });
  const base = mostRecentBoundaryAtOrBefore(new Date(2026, 10, 24, 12));
  let stretchedYesterday = false;
  for (let back = dayCount; back >= 1; back -= 1) {
    vi.setSystemTime(new Date(livedDayBoundary(base, back).getTime() + 3 * 3600_000));
    const day = await startDay();
    await submitCheckIn(day.id, { energy: stretchedYesterday ? 5 : 2, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 });
    await logSleep(day.id, 420);
    const stretched = back % 2 === 0;
    await setHabitAnswer(stretching.id, stretched ? "DONE" : "NOT_DONE", day.id);
    await setHabitAnswer(reading.id, back % 4 < 2 ? "DONE" : "NOT_DONE", day.id);
    stretchedYesterday = stretched;
  }
  now = new Date(base.getTime() + 3 * 3600_000);
  vi.setSystemTime(now);
  const today = await startDay();
  await submitCheckIn(today.id, { energy: stretchedYesterday ? 5 : 2, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 });
  await logSleep(today.id, 420);
}

beforeEach(async () => { await page.viewport(360, 900); localStorage.clear(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("GRAYSON-WHAT-MOVES-001 what moves your numbers", { timeout: 60_000 }, () => {
  it("clear lines first, then about-the-same, then a folded can't tell yet; every line names its days", async () => {
    await seed();
    const screen = await render(<WhatMovesSection active />);
    await expect.poll(lines).not.toEqual([]);
    const all = lines();
    expect(all[0]).toMatch(/^After a day you did stretching, your energy was about 3\.0 of 5 higher \(\d+ days against \d+\)\.HIDE$/);
    const firstSame = all.findIndex((l) => l.includes("about the same either way"));
    expect(firstSame).toBeGreaterThan(0);
    expect(all.slice(firstSame).every((l) => l.includes("about the same"))).toBe(true);
    for (const l of all) expect(l).toMatch(/\(\d+ (days )?against \d+\)/);
    const fold = [...document.querySelectorAll("[data-what-moves] summary")].find((s) => s.textContent!.startsWith("Can't tell yet"));
    expect(fold).toBeDefined();
    expect(fold!.parentElement!.textContent).toMatch(/Reading, done or not and next-day energy \(\d+ against \d+\)/);
    await expect.element(screen.getByText(/they don't prove a cause\. Nothing here changes advice\./)).toBeVisible();
    expect(section().textContent).not.toMatch(/because|causes|should|score/i);
    await shot("360-lines");
    await fits("lines", "lines");
  });

  it("Hide removes a line and Hidden brings it back, by keyboard; the window choice persists and travels with the backup", async () => {
    await seed();
    let screen = await render(<WhatMovesSection active />);
    await expect.poll(lines).not.toEqual([]);
    const first = lines()[0]!.replace(/HIDE$/, "");
    await press(screen.getByRole("button", { name: `Hide: ${first}` }));
    await expect.poll(() => lines().some((l) => l.startsWith(first))).toBe(false);
    const hidden = [...document.querySelectorAll("[data-what-moves] summary")].find((s) => s.textContent === "Hidden (1)") as HTMLElement;
    expect(hidden).toBeDefined();
    hidden.focus(); await userEvent.keyboard("{Enter}");
    await shot("360-hidden");
    await press(screen.getByRole("button", { name: `Bring back: ${first}` }));
    await expect.poll(() => lines()[0]?.startsWith(first)).toBe(true);

    await press(screen.getByRole("button", { name: "180 days" }));
    await expect.element(screen.getByRole("button", { name: "180 days" })).toHaveAttribute("aria-pressed", "true");
    await shot("360-window");
    const block = parseSettingsBlock(JSON.parse(JSON.stringify(readTravellingSettings())));
    localStorage.clear();
    applySettingsBlock(block);
    await cleanup();
    screen = await render(<WhatMovesSection active />);
    await expect.element(screen.getByRole("button", { name: "180 days" })).toHaveAttribute("aria-pressed", "true");
    await fits("window");
  });

  it("with too few days it says so, and a read failure says nothing changed", async () => {
    const screen = await render(<WhatMovesSection active />);
    await expect.element(screen.getByText("Not enough days yet. This fills in as you log.")).toBeVisible();
    await cleanup();
    vi.spyOn(db.externalRestingHeartRates, "toArray").mockRejectedValue(new Error("boom"));
    const failed = await render(<WhatMovesSection active />);
    await expect.element(failed.getByText("What moves your numbers couldn't be read; nothing changed.")).toBeVisible();
  });
});
