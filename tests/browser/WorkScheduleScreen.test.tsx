import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { getSchedulePattern } from "../../src/application/queries";
import { WorkScheduleScreen } from "../../src/ui/screens/more/WorkScheduleScreen";

/**
 * BEYOND FIELD ALPHA Phase 4 — first real-browser coverage for
 * WorkScheduleScreen. Previously only exercised at the application layer
 * (tests/integration/schedulePattern.test.ts) and engine layer
 * (tests/engine/scheduledContext.test.ts) — nothing rendered the
 * component itself. Phase 4G explicitly ruled this screen "currently
 * acceptable... do not redesign" — this file protects that accepted
 * behavior, it doesn't test a recomposition (there wasn't one).
 */

afterEach(() => {
  cleanup();
});

describe("WorkScheduleScreen (real browser)", () => {
  it("loads the current pattern and shows the day/hour controls", async () => {
    const screen = await render(<WorkScheduleScreen />);

    await expect.element(screen.getByText("Which week is active right now?", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "WEEK A", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "WEEK B", exact: true })).toBeVisible();
    await expect.element(screen.getByRole("combobox", { name: "Starts" })).toBeVisible();
    await expect.element(screen.getByRole("combobox", { name: "Ends" })).toBeVisible();
  });

  it("toggling a working day and saving persists the real pattern change", async () => {
    const before = await getSchedulePattern();
    const screen = await render(<WorkScheduleScreen />);
    await expect.element(screen.getByRole("button", { name: "SAVE SCHEDULE", exact: true })).toBeVisible();

    // Wednesday (WED, value 3) toggled for Week A.
    await screen.getByRole("button", { name: "WED", exact: true }).first().click();
    await screen.getByRole("button", { name: "SAVE SCHEDULE", exact: true }).click();
    await expect.element(screen.getByText("Saved.", { exact: true })).toBeVisible();

    const after = await getSchedulePattern();
    expect(after.weeks[0]!.workdays).not.toEqual(before.weeks[0]!.workdays);
  });

  it("rejects identical start/end shift hours without saving", async () => {
    const screen = await render(<WorkScheduleScreen />);
    await expect.element(screen.getByRole("combobox", { name: "Starts" })).toBeVisible();

    const startsSelect = screen.getByRole("combobox", { name: "Starts" }).element() as HTMLSelectElement;
    const endsSelect = screen.getByRole("combobox", { name: "Ends" }).element() as HTMLSelectElement;
    startsSelect.value = "9";
    startsSelect.dispatchEvent(new Event("change", { bubbles: true }));
    endsSelect.value = "9";
    endsSelect.dispatchEvent(new Event("change", { bubbles: true }));

    await expect.element(screen.getByText("Start and end can't be the same time.", { exact: true })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "SAVE SCHEDULE", exact: true })).toBeDisabled();
  });
});

describe("BRIDGE-NOTIFY-001: key-moment alert settings (real browser)", () => {
  it("turns one kind off and sets quiet hours, saved straight away", async () => {
    const { getKeyMomentAlerts } = await import("../../src/application/keyMomentAlerts");
    const screen = await render(<WorkScheduleScreen />);
    const wake = screen.getByRole("button", { name: "Up for the shift alert", exact: true });
    await expect.element(wake).toHaveAttribute("aria-pressed", "true");
    await wake.click();
    await expect.element(wake).toHaveAttribute("aria-pressed", "false");
    await screen.getByRole("button", { name: "Quiet hours", exact: true }).click();
    await expect.element(screen.getByText("Saved. Your phone gets it at the next SYNC GARMIN.", { exact: true })).toBeVisible();
    await expect.poll(getKeyMomentAlerts).toEqual({ off: ["WAKE"], quietFrom: "08:00", quietTo: "14:00" });
  });

  it("keeps both changes when two switches are tapped before the screen re-renders", async () => {
    const { getKeyMomentAlerts, setKeyMomentAlerts } = await import("../../src/application/keyMomentAlerts");
    await setKeyMomentAlerts({ off: [], quietFrom: null, quietTo: null });
    const screen = await render(<WorkScheduleScreen />);
    const wake = screen.getByRole("button", { name: "Up for the shift alert", exact: true });
    const task = screen.getByRole("button", { name: "Task due alert", exact: true });
    await expect.element(wake).toHaveAttribute("aria-pressed", "true");
    // Two taps in the same tick: the second must build on the first, not on the last render.
    (wake.element() as HTMLElement).click();
    (task.element() as HTMLElement).click();
    await expect.element(task).toHaveAttribute("aria-pressed", "false");
    await expect.element(wake).toHaveAttribute("aria-pressed", "false");
    await expect.poll(getKeyMomentAlerts).toEqual({ off: ["WAKE", "TASK_DUE"], quietFrom: null, quietTo: null });
  });
});
