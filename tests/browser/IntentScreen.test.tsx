import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";

/**
 * Intent & Commitment Spine — Drop 01 (2026-08-22, approved). Real-browser
 * smoke coverage for the one dedicated Mission/Obligation management
 * surface the spec requires (section 12) — proves it actually mounts and
 * drives real commands, not just that the underlying commands/queries
 * work in isolation (already covered by tests/integration/*).
 */

let consoleErrors: unknown[];
let restoreConsoleError: () => void;

beforeEach(() => {
  consoleErrors = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    original(...args);
  };
  restoreConsoleError = () => {
    console.error = original;
  };
});

afterEach(() => {
  cleanup();
  restoreConsoleError();
});

describe("IntentScreen (real browser)", () => {
  it("renders with no missions/obligations and no console errors", async () => {
    const screen = await render(<IntentScreen />);
    await expect.element(screen.getByText("No missions yet.")).toBeVisible();
    await expect.element(screen.getByText("Nothing here.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("shows an existing Mission and its linked Obligation, and opening detail shows history", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await createObligation({ title: "Finish certification", missionId: mission.id });

    const screen = await render(<IntentScreen />);
    await expect.element(screen.getByText("Get promoted", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Finish certification", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Open Get promoted" }).click();
    await expect.element(screen.getByText("MISSION CREATED", { exact: false })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can create a Mission through the form", async () => {
    const screen = await render(<IntentScreen />);
    const input = screen.getByPlaceholder("What is this mission?");
    await input.fill("New mission from the UI");
    await screen.getByRole("button", { name: "ADD" }).first().click();
    await expect.element(screen.getByText("New mission from the UI", { exact: true }).first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("satisfying an Obligation elsewhere is reflected after reopening the detail view", async () => {
    const obligation = await createObligation({ title: "Renew passport" });
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "Open Renew passport" }).click();
    await expect.element(screen.getByText("OPEN", { exact: true })).toBeVisible();

    await satisfyObligation(obligation.id);
    await screen.getByText("← BACK").click();
    // Resolved, so it no longer shows under the default UNRESOLVED filter.
    await expect.element(screen.getByText("Nothing here.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
