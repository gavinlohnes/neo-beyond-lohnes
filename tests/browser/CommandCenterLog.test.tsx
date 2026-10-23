import { commandResult } from "./helpers/command";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { markWorkEnded, noteShiftHandoff, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { saveQuitHabit } from "../../src/application/quitCommands";
import { getEffectiveHydrationTotal } from "../../src/application/queries";
import { getActiveWorkoutSession } from "../../src/application/trainQueries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * COMMAND-CENTER-001 — the TODAY action row (+ WATER · + MEAL · + LOG). Every
 * entry is navigation to an existing canonical form; nothing logs on its own.
 */
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 17));
  await page.viewport(360, 800);
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(schedule);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const current = () => document.querySelector('.shell-nav [aria-current="page"]')?.textContent ?? "";

async function openLog(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByRole("button", { name: "Open LOG" }).click();
  const sheet = screen.getByRole("dialog", { name: "LOG" });
  await expect.element(sheet).toBeVisible();
  return sheet;
}

describe("TODAY action row", () => {
  it("keeps WATER, MEAL and LOG in the same order in every mode", async () => {
    for (const [d, h] of [[12, 17], [12, 22], [13, 7], [14, 17]] as const) {
      vi.setSystemTime(new Date(2026, 9, d, h));
      await startDay();
      const screen = await render(<App />);
      await expect.element(screen.getByRole("button", { name: "Open LOG" })).toBeVisible();
      const labels = [...document.querySelectorAll(".console-controls button")].map((button) => button.getAttribute("aria-label"));
      expect(labels.slice(0, 3)).toEqual(["Log water", "Log a meal", "Open LOG"]);
      for (const button of document.querySelectorAll<HTMLElement>(".console-controls button")) {
        expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      }
      // Nothing has been logged yet, so QUICK LOG offers nothing (its row may exist but is empty).
      expect(document.querySelector(".quick-log")).toBeNull();
      await screen.unmount();
    }
  });

  it("LOG lists every record type and each opens its existing form within two taps, logging nothing", async () => {
    await saveQuitHabit({ name: "Drinking" });
    const day = await startDay();
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<App />);
    const events = await db.events.count();
    let sheet = await openLog(screen);
    expect([...sheet.element().querySelectorAll(".today-sheet__option")].map((el) => el.textContent))
      .toEqual(["WATER", "MEAL", "SLEEP", "BODYWEIGHT", "NOTE", "URGE", "WORKOUT SET → TRAIN"]);
    // POLISH-002: the sheet rises in (0.22 s); measure it settled, as the other axe checks do.
    for (const animation of document.getAnimations()) animation.finish();
    expect((await axe.run(sheet.element())).violations).toEqual([]);
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();

    const destinations = [
      ["WATER", () => expect.element(screen.getByRole("button", { name: "+8 oz", exact: true })).toBeVisible()],
      ["MEAL", () => expect.element(screen.getByRole("searchbox", { name: "Search your meals" })).toBeVisible()],
      ["SLEEP", () => expect.element(screen.getByRole("spinbutton", { name: "Hours", exact: true })).toBeVisible()],
      ["BODYWEIGHT", () => expect.element(screen.getByRole("spinbutton", { name: "Weight (lbs)", exact: true })).toBeVisible()],
      ["URGE", () => expect.element(screen.getByRole("button", { name: "Log urge: Stress" })).toBeVisible()],
      ["NOTE", () => expect.element(screen.getByRole("textbox", { name: "Capture a thought", exact: true })).toBeVisible()],
    ] as const;
    for (const [name, check] of destinations) {
      sheet = await openLog(screen);
      const node = sheet.element();
      await sheet.getByRole("button", { name, exact: true }).click();
      await expect.poll(current).toContain("TODAY");
      await check();
      expect(screen.getByRole("dialog").element()).toBe(node);
      await expect.poll(() => node.contains(document.activeElement)).toBe(true);
      await screen.getByRole("dialog").getByRole("button", { name: "CLOSE", exact: true }).click();
    }
    sheet = await openLog(screen);
    await sheet.getByRole("button", { name: "WORKOUT SET → TRAIN", exact: true }).click();
    await expect.poll(current).toContain("TRAIN");
    await expect.element(screen.getByRole("button", { name: "START WORKOUT" })).toBeVisible();

    expect(await db.events.count()).toBe(events);
    expect(await getActiveWorkoutSession()).toBeUndefined();
  });

  it("Escape closes LOG and returns focus to it; Tab stays inside the sheet; no urge entry without a quit habit", async () => {
    await startDay();
    const screen = await render(<App />);
    const sheet = await openLog(screen);
    await expect.element(sheet.getByRole("button", { name: "URGE", exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("URGE_LOGGED").count()).toBe(0);
    const buttons = [...sheet.element().querySelectorAll<HTMLButtonElement>("button")].filter(button => button.checkVisibility() && !button.disabled);
    (buttons[buttons.length - 1] as HTMLElement).focus();
    await userEvent.keyboard("{Tab}");
    expect(sheet.element().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => screen.getByRole("dialog", { name: "LOG" }).elements().length).toBe(0);
    await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Open LOG");
  });

  it("+ WATER keeps exactly-once logging and undo through the existing BODY flow", async () => {
    const day = await startDay();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "Log water" }).click();
    await screen.getByRole("button", { name: "+8 oz" }).click();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(8);
    expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(1);
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(() => getEffectiveHydrationTotal(day.id)).toBe(0);
  });

  it("ON SHIFT gives QUICK_LOG's slot to the shift handoff note, shown once", async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 16, 30));
    const first = await startDay();
    vi.setSystemTime(new Date(2026, 9, 13, 6, 10));
    await markWorkEnded(first.id);
    await noteShiftHandoff(first.id, "Truck 12 brakes still soft");
    // Tue Oct 13 is also a work night; its shift runs 18:00 → 06:00.
    vi.setSystemTime(new Date(2026, 9, 13, 16, 30));
    await startDay();
    vi.setSystemTime(new Date(2026, 9, 13, 22));
    const screen = await render(<App />);
    await (await commandResult(screen, "SHIFT HANDOFF NOTES")).click();
    await expect.element(screen.getByText("Truck 12 brakes still soft")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll(".shift-handoff")).toHaveLength(1);
  });
});
