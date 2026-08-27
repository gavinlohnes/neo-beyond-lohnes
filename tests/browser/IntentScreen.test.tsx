import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import {
  archiveMission,
  createMission,
  createObligation,
  markObligationWaiting,
  satisfyObligation,
} from "../../src/application/intentCommands";

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
    await expect.element(screen.getByText("No active missions.")).toBeVisible();
    await expect.element(screen.getByText("Nothing here.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("states Mission and Obligation meaning separately and uses native creation disclosures", async () => {
    const screen = await render(<IntentScreen />);
    await expect.element(screen.getByRole("heading", { name: "Missions · durable direction" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "Obligations · commitments" })).toBeVisible();

    const createMission = screen.getByRole("button", { name: "CREATE MISSION" }).elements()[0];
    const createObligation = screen.getByRole("button", { name: "CREATE OBLIGATION" }).elements()[0];
    expect(createMission?.tagName).toBe("SUMMARY");
    expect(createObligation?.tagName).toBe("SUMMARY");
    expect(createMission?.closest("details")?.open).toBe(false);
    expect(createObligation?.closest("details")?.open).toBe(false);
  });

  it(
    "Drop 01 acceptance correction: an ARCHIVED mission disappears from the default ACTIVE view " +
      "but remains reachable (and clearly labeled) under ALL",
    async () => {
      const mission = await createMission({ title: "WORK ON BEYOND" });
      await archiveMission(mission.id);

      const screen = await render(<IntentScreen />);
      await expect.element(screen.getByText("No active missions.")).toBeVisible();

      await screen.getByRole("button", { name: "ALL / ARCHIVED" }).click();
      await expect.element(screen.getByText("WORK ON BEYOND", { exact: true }).first()).toBeVisible();

      await screen.getByRole("button", { name: "Open WORK ON BEYOND" }).click();
      await expect.element(screen.getByText("ARCHIVED", { exact: true }).first()).toBeVisible();
      expect(consoleErrors).toEqual([]);
    },
  );

  it("shows an existing Mission and its linked Obligation, and opening detail shows history", async () => {
    const mission = await createMission({ title: "Get promoted" });
    await createObligation({ title: "Finish certification", missionId: mission.id });

    const screen = await render(<IntentScreen />);
    await expect.element(screen.getByText("Get promoted", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Finish certification", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Open Get promoted" }).click();
    await screen.getByRole("button", { name: /HISTORY/ }).click();
    await expect.element(screen.getByText("MISSION CREATED", { exact: false })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can create a Mission through the form", async () => {
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "CREATE MISSION" }).click();
    const input = screen.getByPlaceholder("What is this mission?");
    await input.fill("New mission from the UI");
    await screen.getByRole("button", { name: "CREATE", exact: true }).click();
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

  it("distinguishes Mission/Obligation kinds and OPEN/WAITING state without color alone", async () => {
    const mission = await createMission({ title: "Build durable direction", description: "A long-lived outcome" });
    const obligation = await createObligation({ title: "Call the supplier", missionId: mission.id });
    await markObligationWaiting(obligation.id);

    const screen = await render(<IntentScreen />);
    const missionLocator = screen.getByRole("button", { name: "Open Build durable direction" });
    const obligationLocator = screen.getByRole("button", { name: "Open Call the supplier" });
    await expect.element(missionLocator).toBeVisible();
    await expect.element(obligationLocator).toBeVisible();
    const missionRow = missionLocator.elements()[0];
    const obligationRow = obligationLocator.elements()[0];
    expect(missionRow?.textContent).toContain("MISSION");
    expect(missionRow?.textContent).toContain("ACTIVE");
    expect(obligationRow?.textContent).toContain("OBLIGATION");
    expect(obligationRow?.textContent).toContain("WAITING");
    expect(obligationRow?.querySelector('[data-status="WAITING"]')).not.toBeNull();
  });

  it("requires explicit confirmation for one-way archive and release, with correct hierarchy", async () => {
    const mission = await createMission({ title: "Prepare launch" });
    await createObligation({ title: "Retire obsolete checklist", missionId: mission.id });
    const screen = await render(<IntentScreen />);

    await screen.getByRole("button", { name: "Open Prepare launch" }).click();
    await screen.getByRole("button", { name: "ARCHIVE MISSION" }).click();
    await expect.element(screen.getByText("Archive this Mission?", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "CONFIRM ARCHIVE" }).elements()[0]?.className).toBe("btn-primary");
    await screen.getByRole("button", { name: "CANCEL" }).click();
    expect(screen.getByText("Archive this Mission?", { exact: true }).elements()).toHaveLength(0);

    await screen.getByRole("button", { name: "← BACK" }).click();
    await screen.getByRole("button", { name: "Open Retire obsolete checklist" }).click();
    await screen.getByRole("button", { name: "RELEASE", exact: true }).click();
    await expect.element(screen.getByText("Release this Obligation?", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "CONFIRM RELEASE" }).elements()[0]?.className).toBe("btn-danger");
  });

  it("records satisfy through the existing command only after confirmation", async () => {
    await createObligation({ title: "Submit signed agreement" });
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "Open Submit signed agreement" }).click();
    await screen.getByRole("button", { name: "SATISFY", exact: true }).click();
    await expect.element(screen.getByText("Record this as satisfied?", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "CONFIRM SATISFIED" }).click();
    await expect.element(screen.getByText("SATISFIED", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Historical commitment · resolution already recorded.", { exact: true })).toBeVisible();
  });

  it("keeps an archived parent Mission visible as historical context on its unresolved Obligation", async () => {
    const mission = await createMission({ title: "Former direction" });
    await createObligation({ title: "Unresolved historical commitment", missionId: mission.id });
    await archiveMission(mission.id);

    const screen = await render(<IntentScreen />);
    const row = screen.getByRole("button", { name: "Open Unresolved historical commitment" });
    await expect.element(row).toBeVisible();
    expect(row.elements()[0]?.textContent).toContain("Former direction");
    await row.click();
    await expect.element(screen.getByText("Mission: Former direction", { exact: true })).toBeVisible();
  });

  it.each([320, 360, 375, 412])("handles dense long-copy state without horizontal overflow at %ipx", async (width) => {
    await page.viewport(width, 900);
    const mission = await createMission({
      title: "A very long durable direction that must wrap cleanly on a narrow operational field",
      description: "Long descriptions remain readable without turning the direction into a task or clipping the disclosure control.",
    });
    for (let i = 0; i < 4; i += 1) {
      await createObligation({ title: `Long commitment ${i + 1} requiring deliberate resolution across narrow phone widths`, missionId: mission.id });
    }
    const screen = await render(<IntentScreen />);
    await expect.element(screen.getByRole("button", { name: /Open A very long durable direction/ })).toBeVisible();
    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });

  it("passes axe with disclosures collapsed and with a resolution warning open", async () => {
    await createObligation({ title: "Accessible commitment" });
    const screen = await render(<IntentScreen />);
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    await screen.getByRole("button", { name: "Open Accessible commitment" }).click();
    await screen.getByRole("button", { name: "RELEASE", exact: true }).click();
    expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });
});
