import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { captureItem } from "../../src/application/commands";
import { archiveMission, createMission, createObligation } from "../../src/application/intentCommands";
import { SearchScreen } from "../../src/ui/screens/search/SearchScreen";

/**
 * Personal Search 1.0 — real-browser acceptance layer, same conventions
 * as ReviewScreen.test.tsx/MoreScreen.test.tsx.
 */

afterEach(() => {
  cleanup();
});

describe("SearchScreen (real browser)", () => {
  it("prompts to type before any query is entered", async () => {
    const screen = await render(<SearchScreen />);
    await expect.element(screen.getByText(/Type to search/, { exact: false })).toBeVisible();
  });

  it("finds a Mission, an Obligation, and a Capture item by text as the operator types", async () => {
    await createMission({ title: "Rebuild the deck" });
    await createObligation({ title: "Call the electrician" });
    await captureItem("Renew the car registration");

    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Call the electrician", { exact: true })).not.toBeInTheDocument();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("electrician");
    await expect.element(screen.getByText("Call the electrician", { exact: true })).toBeVisible();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("registration");
    await expect.element(screen.getByText("Renew the car registration", { exact: true })).toBeVisible();
  });

  it("shows a 'no matches' state for a query that matches nothing, and includes an archived Mission honestly", async () => {
    const mission = await createMission({ title: "Old kitchen project" });
    await archiveMission(mission.id);

    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("kitchen");
    await expect.element(screen.getByText("Old kitchen project", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("MISSION · ARCHIVED", { exact: true })).toBeVisible();

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("nothing-matches-this");
    await expect.element(screen.getByText(/No matches for/, { exact: false })).toBeVisible();
  });
});

describe("SearchScreen (real browser) — narrow phone widths", () => {
  it.each([320, 360, 375])("has no horizontal overflow at %ipx", async (width) => {
    await createMission({ title: "Rebuild the deck" });
    await page.viewport(width, 800);
    const screen = await render(<SearchScreen />);
    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();

    await expect.poll(() => document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });
});

describe("SearchScreen (real browser) — accessibility", () => {
  it("passes real WCAG AA color-contrast beyond the known app-wide exception, empty and with results", async () => {
    await createMission({ title: "Rebuild the deck" });
    const screen = await render(<SearchScreen />);
    let results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);

    await screen.getByRole("textbox", { name: "Search Missions, Obligations, and Capture" }).fill("deck");
    await expect.element(screen.getByText("Rebuild the deck", { exact: true })).toBeVisible();
    results = await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
