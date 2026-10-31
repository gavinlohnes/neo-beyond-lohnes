import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay } from "../../src/application/commands";
import { describeBootStatus, getBootStatus } from "../../src/application/bootQueries";
import { setAutoBackupPreferenceAndReset, snoozeBackupPrompt } from "../../src/application/autoBackupQueries";
import { BOOT_TOTAL_MS, BootSequence, livedDayKey, resetBootSequenceForTests } from "../../src/ui/components/BootSequence";

/** BOOT-001: cold launch only, tap to skip, reduced motion skips, real status lines (BOOT-BRIEF-001: a readable brief). */

/** Lets the sequence run to its own end inside act, so its last update is flushed. */
async function waitPastEnd() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, BOOT_TOTAL_MS + 200));
  });
}

beforeEach(() => {
  resetBootSequenceForTests();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BOOT-001", () => {
  it("a tap anywhere skips it", async () => {
    const screen = await render(<BootSequence />);
    const boot = screen.getByRole("status", { name: /BEYOND starting/ });
    await expect.element(boot).toBeVisible();
    boot.element().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await expect.poll(() => document.querySelector(".boot")).toBeNull();
  });

  it("BOOT-ONCE-001: already shown this lived day (a reload), it goes straight in", async () => {
    localStorage.setItem("beyond.bootShownFor", livedDayKey(new Date()));
    resetBootSequenceForTests(true);
    const screen = await render(<><p>TODAY</p><BootSequence /></>);
    await expect.element(screen.getByText("TODAY")).toBeVisible();
    // (Kept before the remount test below: its manual unmounts leave later renders in this file blank.)
    expect(screen.container.querySelector(".boot")).toBeNull();
  });

  it("BOOT-ONCE-001: the first launch of a lived day plays and remembers the day", async () => {
    localStorage.setItem("beyond.bootShownFor", "2000-01-01");
    resetBootSequenceForTests(true);
    const screen = await render(<BootSequence />);
    await expect.element(screen.getByRole("status", { name: /BEYOND starting/ })).toBeVisible();
    expect(localStorage.getItem("beyond.bootShownFor")).toBe(livedDayKey(new Date()));
  });

  it("plays: the emblem plate, BEYOND types in, the status lines tick in, then it cuts away", async () => {
    await startDay();
    const screen = await render(<BootSequence />);
    await expect.element(screen.getByRole("status", { name: /BEYOND starting/ })).toBeVisible();
    // BRAND-MARK-003: the chamfered plate, centered on black, in the palette's yellow.
    const plate = document.querySelector<SVGPathElement>(".boot__mark path")!;
    expect(plate.getAttribute("d")).toBe("M0,0 H432 L512,80 V512 H0 Z");
    expect(getComputedStyle(plate).fill).toBe("rgb(247, 201, 40)");
    await expect.element(screen.getByText("BEYOND", { exact: true })).toBeVisible();
    // BOOT-BRIEF-001: the brief, readable, with a way out.
    await expect.element(screen.getByText("PROTEIN 0 G", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("SLEEP NOT LOGGED", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("TAP TO CONTINUE", { exact: true })).toBeVisible();
    await waitPastEnd();
    expect(document.querySelector(".boot")).toBeNull();
  });

  it("a remount mid-sequence carries on; after it ends, a remount doesn't replay it", async () => {
    const first = await render(<BootSequence />);
    await expect.element(first.getByRole("status", { name: /BEYOND starting/ })).toBeVisible();
    first.unmount();
    const second = await render(<BootSequence />);
    await expect.element(second.getByRole("status", { name: /BEYOND starting/ })).toBeVisible();
    await waitPastEnd();
    second.unmount();
    const third = await render(<BootSequence />);
    expect(third.container.querySelector(".boot")).toBeNull();
  });

  it("never plays on resume: visibility changes don't bring it back", async () => {
    await render(<BootSequence />);
    await waitPastEnd();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.querySelector(".boot")).toBeNull();
  });

  it("reduced motion shows nothing", async () => {
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
      query.includes("prefers-reduced-motion") ? ({ ...real(query), matches: true } as MediaQueryList) : real(query),
    );
    await render(<BootSequence />);
    expect(document.querySelector(".boot")).toBeNull();
  });

  it("status lines are real values or left out", async () => {
    // No days on record: DAY is left out, never "DAY 0".
    expect((await getBootStatus()).day).toBeNull();
    // Wed Oct 14 2026 is a day off under the default schedule; Fri Oct 16 is a work day.
    expect(describeBootStatus(await getBootStatus(new Date(2026, 9, 14, 14, 0)))).toEqual(["SHIFT OFF", "BACKUP OFF"]);
    expect((await getBootStatus(new Date(2026, 9, 16, 17, 0))).shift).toBe("SHIFT 1800");
    // BOOT-BRIEF-001: where the shift stands, from the schedule.
    expect((await getBootStatus(new Date(2026, 9, 16, 23, 0))).shift).toBe("SHIFT ENDS 0600");
    setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 7 });
    expect((await getBootStatus()).backup).toBe("DUE");
    // LATER hides TODAY's line for a day; the backup is still overdue.
    snoozeBackupPrompt();
    expect((await getBootStatus()).backup).toBe("DUE");
    await startDay();
    expect((await getBootStatus()).day).toBe(1);
    // BOOT-BRIEF-001: shift, sleep, protein; the backup only when it needs you; no day count.
    expect(describeBootStatus({ day: 14, shift: "SHIFT 1800", backup: "OK" })).toEqual(["SHIFT 1800"]);
    expect(describeBootStatus({ day: 14, shift: "SHIFT ENDS 0600", backup: "DUE", sleep: 435, protein: { g: 48, target: 159 } }))
      .toEqual(["SHIFT ENDS 0600", "SLEEP 7:15", "PROTEIN 48 / 159 G", "BACKUP DUE"]);
    expect(describeBootStatus({ day: 1, shift: null, backup: null, sleep: "NONE", protein: { g: 0, target: null } })).toEqual(["SLEEP NOT LOGGED", "PROTEIN 0 G"]);
  });

  it("BOOT-BRIEF-001: after the active day's shift, the brief says it's done", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 16, 40)); // Fri, a work day under the default schedule
    await startDay();
    expect((await getBootStatus(new Date(2026, 9, 17, 9, 0))).shift).toBe("SHIFT DONE");
    vi.useRealTimers();
  });

  it("BOOT-ONCE-001: the lived day turns at 16:30", () => {
    expect(livedDayKey(new Date(2026, 9, 31, 16, 29))).toBe("2026-10-30");
    expect(livedDayKey(new Date(2026, 9, 31, 16, 30))).toBe("2026-10-31");
    expect(livedDayKey(new Date(2026, 10, 1, 0, 27))).toBe("2026-10-31");
  });
});
