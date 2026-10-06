import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { startDay } from "../../src/application/commands";
import { describeBootStatus, getBootStatus } from "../../src/application/bootQueries";
import { setAutoBackupPreferenceAndReset, snoozeBackupPrompt } from "../../src/application/autoBackupQueries";
import { BOOT_TOTAL_MS, BootSequence, resetBootSequenceForTests } from "../../src/ui/components/BootSequence";

/** BOOT-001: cold launch only, tap to skip, reduced motion skips, real status lines. */

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

  it("plays: the icon file as-is, BEYOND types in, the status lines tick in, then it cuts away", async () => {
    await startDay();
    const screen = await render(<BootSequence />);
    await expect.element(screen.getByRole("status", { name: /BEYOND starting/ })).toBeVisible();
    expect(document.querySelector<HTMLImageElement>(".boot__mark")!.getAttribute("src")).toMatch(/icons\/icon-192\.png$/);
    await expect.element(screen.getByText("BEYOND", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("DAY 1", { exact: true })).toBeVisible();
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
    setAutoBackupPreferenceAndReset({ enabled: true, everyDays: 7 });
    expect((await getBootStatus()).backup).toBe("DUE");
    // LATER hides TODAY's line for a day; the backup is still overdue.
    snoozeBackupPrompt();
    expect((await getBootStatus()).backup).toBe("DUE");
    await startDay();
    expect((await getBootStatus()).day).toBe(1);
    expect(describeBootStatus({ day: 14, shift: "SHIFT 1800", backup: "OK" })).toEqual(["DAY 14", "SHIFT 1800", "BACKUP OK"]);
  });
});
