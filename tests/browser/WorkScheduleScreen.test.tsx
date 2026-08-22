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
