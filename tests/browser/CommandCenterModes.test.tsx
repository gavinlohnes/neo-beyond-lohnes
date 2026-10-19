import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { getModePin } from "../../src/application/modePinQueries";
import { getActiveDay } from "../../src/application/queries";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { MAX_PHASE_ROWS } from "../../src/ui/screens/today/shiftClock";
import { TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";
import type { BeyondDay } from "../../src/domain/common/types";

/**
 * COMMAND-CENTER-001 — visible modes. Same fixed calendar as Drop 2: Mon Oct 12
 * 2026 is a work night (18:00–06:00), Wed Oct 14 a day off.
 */
const at = (d: number, h: number, min = 0) => new Date(2026, 9, d, h, min, 0, 0);

async function saveOwnersSchedule() {
  const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(fields);
}

async function startDayAt(when: Date): Promise<BeyondDay> {
  vi.setSystemTime(when);
  return startDay();
}

const rows = () => [...document.querySelectorAll("[data-shift-clock-row]")].map((el) => el.getAttribute("data-shift-clock-row")!);
const modeName = () => document.querySelector(".mode-header__value")?.textContent ?? "";
const modeSource = () => document.querySelector(".mode-header__source")?.textContent ?? "";
const guidance = () => document.querySelector(".console-guidance")?.textContent ?? "";
const systemStatus = () => document.querySelector(".today-situation__system")?.textContent ?? "";
const attention = () => [...document.querySelectorAll(".signal-row")].map((el) => el.textContent ?? "");

async function pick(screen: Awaited<ReturnType<typeof render>>, name: string) {
  await screen.getByRole("button", { name: /^Mode .*Change mode$/ }).click();
  const dialog = screen.getByRole("dialog");
  await expect.element(dialog).toBeVisible();
  await dialog.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await page.viewport(360, 800);
  await saveOwnersSchedule();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("mode header", () => {
  it("names each scheduled mode, its source and the lived day", async () => {
    await startDayAt(at(12, 16, 30));
    for (const [when, name, phaseRows] of [
      [at(12, 16, 40), "PREP", ["TONIGHT"]],
      [at(12, 22, 0), "ON SHIFT", null],
      [at(13, 7, 0), "RECOVER", ["SHIFT_DOWN", "CHECK_IN", "WORKOUT", "MAIN_SLEEP"]],
    ] as const) {
      vi.setSystemTime(when);
      const screen = await render(<TodayScreen />);
      await expect.poll(modeName).toBe(name);
      expect(modeSource()).toBe("Per schedule");
      if (phaseRows) await expect.poll(rows).toEqual(phaseRows);
      expect(document.querySelectorAll(".mode-strip__segment").length).toBe(3);
      expect(document.querySelector(".mode-strip__segment--on")).not.toBeNull();
      expect(document.querySelector(".mode-strip__legend")?.textContent).toContain("06:00");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
      await screen.unmount();
    }
  });

  it("an off day is OFF DUTY with one band; an unanswered day reads Mode: not set and keeps the work question", async () => {
    await startDayAt(at(14, 16, 30));
    vi.setSystemTime(at(14, 17, 0));
    let screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("OFF DUTY");
    expect(document.querySelectorAll(".mode-strip__segment").length).toBe(1);
    await screen.unmount();

    await db.schedulePatterns.clear();
    await startDayAt(at(15, 16, 30));
    vi.setSystemTime(at(15, 17, 0));
    screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("Mode: not set");
    await expect.poll(rows).toEqual(["WORK_QUESTION", "CHECK_IN", "WORKOUT"]);
    await screen.getByRole("button", { name: "Mode not set. Change mode" }).click();
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog.getByText("No mode until the work question is answered.")).toBeVisible();
    expect(dialog.getByText("SCHEDULE", { exact: true }).elements()).toHaveLength(0);
    await dialog.getByRole("button", { name: /^PREP/ }).click();
    // The work question still leads; no phase is assumed for the day.
    await expect.poll(rows).toEqual(["WORK_QUESTION", "TONIGHT"]);
    expect((await getActiveDay())!.workContext).toBe("UNKNOWN");
  });
});

describe("mode pin — placement only", () => {
  it("pins rows, holds for the day, and changes no guidance, Attention, System Status or record", async () => {
    const day = await startDayAt(at(12, 16, 30));
    vi.setSystemTime(at(13, 6, 20));
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 2, alcoholUrge: 1 });
    const screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("RECOVER");
    await expect.poll(guidance).not.toBe("");
    await expect.poll(systemStatus).not.toBe("");
    const before = { guidance: guidance(), status: systemStatus(), attention: attention() };
    const events = await db.events.count();
    const recommendations = await db.recommendations.count();

    await pick(screen, "OFF DUTY");
    await expect.poll(modeName).toBe("OFF DUTY");
    expect(modeSource()).toBe("Pinned · schedule says RECOVER · resets 16:30");
    await expect.poll(rows).toEqual(["CHECK_IN", "WORKOUT"]);
    expect(rows().length).toBeLessThanOrEqual(MAX_PHASE_ROWS);
    expect(getModePin(day.id)).toBe("OFF");

    expect({ guidance: guidance(), status: systemStatus(), attention: attention() }).toEqual(before);
    expect(await db.events.count()).toBe(events);
    expect(await db.recommendations.count()).toBe(recommendations);
    expect((await getActiveDay())!.workContext).toBe("WORK");

    // The pin survives a remount of TODAY on the same day.
    await screen.unmount();
    const again = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("OFF DUTY");
    await pick(again, "Follow schedule");
    await expect.poll(modeName).toBe("RECOVER");
    expect(getModePin(day.id)).toBeNull();
  });

  it("a manual pick holds even when it matches the schedule; focus returns and Escape closes", async () => {
    await startDayAt(at(12, 16, 30));
    vi.setSystemTime(at(12, 22, 0));
    const screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("ON SHIFT");
    await screen.getByRole("button", { name: /^Mode .*Change mode$/ }).click();
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog.getByText("SCHEDULE", { exact: true })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => document.querySelector("dialog")).toBeNull();
    await expect.poll(() => document.activeElement?.className).toBe("mode-header__name");
    await pick(screen, "ON SHIFT");
    expect(modeSource()).toMatch(/^Pinned/);
    vi.setSystemTime(at(13, 7));
    await screen.unmount();
    const again = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("ON SHIFT");
    expect(modeSource()).toContain("schedule says RECOVER");
    await pick(again, "Follow schedule");
    await expect.poll(modeName).toBe("RECOVER");
  });

  it("a countdown appears only where real times support it", async () => {
    await startDayAt(at(12, 16, 30));
    vi.setSystemTime(at(13, 7, 0));
    const screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("RECOVER");
    await pick(screen, "PREP");
    await expect.poll(rows).toEqual(["TONIGHT"]);
    // 07:00 is after the shift began: no "Shift in" countdown for a pinned PREP.
    expect(document.querySelector(".status-strip__headline")?.textContent).not.toMatch(/^Shift in/);
  });

  it("pinning ON SHIFT on a day off only offers a separate, optional work-day record", async () => {
    await startDayAt(at(14, 16, 30));
    vi.setSystemTime(at(14, 19, 0));
    const screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("OFF DUTY");
    const events = await db.events.count();
    await pick(screen, "ON SHIFT");
    const dialog = screen.getByRole("dialog");
    await expect.element(dialog.getByRole("heading", { name: "ON SHIFT TODAY?" })).toBeVisible();
    await dialog.getByRole("button", { name: "NOT NOW" }).click();
    await expect.poll(modeName).toBe("ON SHIFT");
    expect(await db.events.count()).toBe(events);
    expect((await getActiveDay())!.workContext).toBe("OFF");

    await pick(screen, "ON SHIFT");
    await screen.getByRole("dialog").getByRole("button", { name: "RECORD WORK DAY" }).click();
    await expect.poll(async () => (await getActiveDay())!.workContext).toBe("WORK");
    expect(await db.events.where("type").equals("WORK_CONTEXT_SET").count()).toBeGreaterThan(0);
  });

  it("clears at END DAY and does not carry to the next day", async () => {
    const day = await startDayAt(at(14, 16, 30));
    vi.setSystemTime(at(14, 19, 0));
    const screen = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("OFF DUTY");
    await pick(screen, "PREP");
    expect(getModePin(day.id)).toBe("PRE_WORK");
    await screen.unmount();

    // END DAY from TODAY's own control clears the pin.
    const today = await render(<TodayScreen />);
    await expect.poll(modeName).toBe("PREP");
    const endDayRow = today.getByRole("button", { name: "Open END DAY" });
    if (endDayRow.elements().length === 0) await today.getByRole("button", { name: "Open TOOLS" }).click();
    await today.getByRole("button", { name: "Open END DAY" }).click();
    await today.getByRole("button", { name: "END DAY", exact: true }).click();
    await expect.poll(() => getModePin(day.id)).toBeNull();

    const next = await startDayAt(at(15, 16, 30));
    expect(getModePin(next.id)).toBeNull();
  });
});
