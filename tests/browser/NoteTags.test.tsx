/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { DailyNoteScreen } from "../../src/ui/screens/more/DailyNoteScreen";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** JOURNAL-LEARN-001 part 1: prompts that fit the day first; one-tap #tags written into the note; saved only on SAVE. */
afterEach(async () => { await cleanup(); sessionStorage.clear(); });

describe("JOURNAL-LEARN-001 — guided note and tags", () => {
  it("tags toggle into the draft, your own tag adds, and nothing saves until SAVE NOTE", async () => {
    const day = await startDay();
    const screen = await render(<DailyNoteScreen active />);
    const tags = screen.getByRole("group", { name: "Tags for today" });
    await tags.getByRole("button", { name: "#nap" }).click();
    await expect.element(tags.getByRole("button", { name: "#nap" })).toHaveAttribute("aria-pressed", "true");
    await tags.getByLabelText("Your own tag").fill("Night Walk");
    await tags.getByRole("button", { name: "ADD TAG" }).click();
    await expect.element(tags.getByRole("button", { name: "#nightwalk" })).toHaveAttribute("aria-pressed", "true");
    expect(await db.dailyNotes.get(day.id)).toBeUndefined();
    await tags.getByRole("button", { name: "#nap" }).click();
    await expect.element(tags.getByRole("button", { name: "#nap" })).toHaveAttribute("aria-pressed", "false");
    await screen.getByRole("button", { name: "SAVE NOTE" }).click();
    await expect.element(screen.getByText("Daily note saved.")).toBeVisible();
    expect((await db.dailyNotes.get(day.id))?.text).toBe("#nightwalk");
  });
});
