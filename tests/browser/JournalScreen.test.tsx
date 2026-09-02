import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { JournalScreen } from "../../src/ui/screens/more/JournalScreen";
import { createDecisionJournalEntry } from "../../src/application/journalCommands";

/**
 * Decision Journal (built 2026-09-02). Real-browser smoke coverage for the
 * one dedicated management surface, same treatment as IntentScreen.test.tsx
 * — proves it actually mounts and drives real commands, not just that the
 * underlying commands/queries work in isolation (already covered by
 * tests/integration/*, if/when such coverage is added there).
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

describe("JournalScreen (real browser)", () => {
  it("renders with no decisions and no console errors", async () => {
    const screen = await render(<JournalScreen />);
    await expect.element(screen.getByText("Nothing awaiting review.")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("can record a decision through the form with only the required fields", async () => {
    const screen = await render(<JournalScreen />);
    await screen.getByRole("button", { name: "RECORD A DECISION" }).click();
    await screen.getByPlaceholder("What decision is this?").fill("Take the new job");
    await screen.getByLabelText("Decision", { exact: true }).fill("Accepted the offer");
    await screen.getByRole("button", { name: "RECORD DECISION" }).click();
    await expect.element(screen.getByText("Take the new job", { exact: true }).first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  it("an OPEN decision can be reviewed once; the REVIEW action then disappears", async () => {
    await createDecisionJournalEntry({ title: "Try a new training split", decision: "Switch to upper/lower" });
    const screen = await render(<JournalScreen />);

    await screen.getByRole("button", { name: "Open Try a new training split" }).click();
    await expect.element(screen.getByText("OPEN", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "REVIEW" }).click();
    await screen.getByLabelText("Outcome").fill("Recovered faster, hit every session");
    await screen.getByRole("button", { name: "MARK REVIEWED" }).click();

    await expect.element(screen.getByText("REVIEWED", { exact: true }).first()).toBeVisible();
    await expect.element(screen.getByText("Recovered faster, hit every session", { exact: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "REVIEW" }).elements().length).toBe(0);
    expect(consoleErrors).toEqual([]);
  });
});
