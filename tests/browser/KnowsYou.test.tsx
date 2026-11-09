/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { PersonalUnderstanding } from "../../src/ui/screens/review/PersonalUnderstanding";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";

/** JOURNAL-LEARN-001 part 3: Personal Understanding → Patterns gathers sleep rhythm and tag patterns, honestly empty. */
afterEach(async () => { await cleanup(); });

describe("JOURNAL-LEARN-001 — what BEYOND knows", () => {
  it("shows WHEN YOU SLEEP and WHAT YOUR TAGS LINE UP WITH, saying what isn't known yet", async () => {
    const day = await startDay();
    await saveDailyNote(day.id, "long shift #latecoffee");
    const screen = await render(<PersonalUnderstanding active />);
    await screen.getByText("PERSONAL UNDERSTANDING").click();
    await screen.getByRole("button", { name: "Patterns", exact: true }).click();
    await expect.element(screen.getByText("WHEN YOU SLEEP", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Not enough measured Garmin nights on work days or days off yet.")).toBeVisible();
    await expect.element(screen.getByText("WHAT YOUR TAGS LINE UP WITH", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Still learning: #latecoffee \(1 of 3 days\)/)).toBeVisible();
  });
});
